import test from 'node:test';
import assert from 'node:assert/strict';
import { handleThinRequest, OBJECT_NAME } from '../src/frontend.js';
import { createRendererClass, MAX_IN_FLIGHT } from '../src/backend-core.js';

const url = 'https://en.panamalegallab.com/_/view/search/panamalegallab.com/panamlegallab-en';
const metadata = { CF_VERSION_METADATA: { id: 'test-version' } };
class Base { constructor(ctx, env) { assert.ok(ctx); assert.ok(env); } }

test('thin layer forwards original Search identity/body and required headers, dropping credentials', async () => {
  const incoming = new Request(url, { method: 'POST', body: 'f.req=opaque', headers: {
    Origin: 'https://en.panamalegallab.com', Referer: 'https://en.panamalegallab.com/contact-us',
    'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Encoding': 'identity', 'CF-Connecting-IP': '192.0.2.1', Cookie: 'private', Authorization: 'private', 'X-Private': 'private' } });
  const expected = new Response('unchanged', { headers: { 'X-Keep': 'exact' } });
  const names = [];
  const namespace = { idFromName(name) { names.push(name); return 'id'; }, get(id) {
    assert.equal(id, 'id'); return { async fetch(request) {
      assert.equal(request.url, incoming.url); assert.equal(request.method, incoming.method);
      for (const name of ['Origin', 'Referer', 'Sec-Fetch-Site', 'Content-Type', 'Content-Encoding', 'CF-Connecting-IP']) {
        assert.equal(request.headers.get(name), incoming.headers.get(name));
      }
      for (const name of ['Cookie', 'Authorization', 'X-Private']) assert.equal(request.headers.has(name), false);
      assert.equal(await request.text(), 'f.req=opaque'); return expected;
    } };
  } };
  assert.equal(await handleThinRequest(incoming, { PLL_RENDERER: namespace }), expected);
  assert.deepEqual(names, [OBJECT_NAME]);
});

test('thin returns the bound response before consuming its stream and obtains a fresh stub each request', async () => {
  let calls = 0;
  const namespace = { idFromName: name => name, get() { calls += 1; return { fetch: async () => new Response('streamed') }; } };
  for (let n = 0; n < 3; n += 1) assert.equal((await handleThinRequest(new Request('https://www.panamalegallab.com/'), { PLL_RENDERER: namespace })).status, 200);
  assert.equal(calls, 3);
  const denied = await handleThinRequest(new Request('https://evil.example/'), { get PLL_RENDERER() { assert.fail('invalid host reached binding'); } });
  assert.equal(denied.status, 421);
  assert.equal((await handleThinRequest(new Request('https://www.panamalegallab.com/'), {})).status, 503);
  assert.equal((await handleThinRequest(new Request('https://www.panamalegallab.com/'), { PLL_RENDERER: { idFromName() { throw Error('secret'); } } })).status, 503);
  const failed = await handleThinRequest(new Request('https://www.panamalegallab.com/'), {
    PLL_RENDERER: { idFromName: name => name, get: () => ({ fetch: async () => { throw Error('private transport'); } }) } });
  assert.equal(failed.status, 503); assert.ok(!(await failed.text()).includes('private'));
});

test('a produced but unread body retains the instance slot until cancel, with no background body reads', async () => {
  let pulls = 0;
  const Renderer = createRendererClass(Base, () => async () => new Response(new ReadableStream({
    pull() { pulls += 1; },
  }, { highWaterMark: 0 })));
  const renderer = new Renderer({}, metadata);
  const responses = [];
  for (let n = 0; n < MAX_IN_FLIGHT; n += 1) responses.push(await renderer.fetch(new Request('https://www.panamalegallab.com/')));
  assert.equal(pulls, 0); assert.equal(renderer.inFlight, MAX_IN_FLIGHT);
  const blocked = await renderer.fetch(new Request('https://www.panamalegallab.com/'));
  assert.equal(blocked.status, 503); await blocked.text();
  for (const response of responses) await response.body.cancel();
  assert.equal(renderer.inFlight, 0);
});

test('one handler is constructed per Durable Object, with no storage access or cross-object quota state', async () => {
  let constructed = 0;
  const make = () => { constructed += 1; let count = 0; return async () => new Response(String(++count)); };
  const Renderer = createRendererClass(Base, make);
  const ctx = { get storage() { assert.fail('storage must remain unused'); } };
  const first = new Renderer(ctx, metadata), second = new Renderer(ctx, metadata);
  assert.equal(constructed, 2);
  assert.equal(await (await first.fetch(new Request('https://www.panamalegallab.com/'))).text(), '1');
  assert.equal(await (await first.fetch(new Request('https://www.panamalegallab.com/'))).text(), '2');
  assert.equal(await (await second.fetch(new Request('https://www.panamalegallab.com/'))).text(), '1');
  assert.equal((await first.fetch(new Request('https://evil.example/'))).status, 421);
});

test('Durable Object bounds concurrent memory, reports temporary overload, and releases capacity on success/error', async () => {
  const releases = []; let hold = true; let calls = 0;
  const Renderer = createRendererClass(Base, () => async () => {
    calls += 1;
    if (hold) return new Promise(resolve => releases.push(() => resolve(new Response('ok'))));
    if (calls === MAX_IN_FLIGHT + 1) throw Error('private');
    return new Response('after');
  });
  const renderer = new Renderer({}, metadata);
  const request = () => new Request('https://www.panamalegallab.com/');
  const pending = Array.from({ length: MAX_IN_FLIGHT }, () => renderer.fetch(request()));
  const overloaded = await renderer.fetch(request());
  assert.equal(overloaded.status, 503); assert.equal(overloaded.headers.get('Retry-After'), '60');
  assert.equal(calls, MAX_IN_FLIGHT);
  releases.forEach(release => release());
  for (const response of await Promise.all(pending)) await response.text();
  hold = false;
  const failed = await renderer.fetch(request()); assert.equal(failed.status, 503); assert.ok(!(await failed.text()).includes('private'));
  assert.equal(await (await renderer.fetch(request())).text(), 'after');
});
