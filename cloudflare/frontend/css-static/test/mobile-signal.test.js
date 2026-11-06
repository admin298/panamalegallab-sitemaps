import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizedMobileSignal } from '../src/mobile-signal.js';
import { handleThinRequest, OBJECT_NAME } from '../src/frontend.js';

const url = 'https://en.panamalegallab.com/';
const request = headers => new Request(url, { headers });

test('valid mobile client hint takes precedence over UA and spoofed internal signal', () => {
  for (const [hint, ua, expected] of [
    ['?1', 'Desktop browser', '1'], ['?0', 'iPhone Mobile', '0'],
    ['?1', 'x'.repeat(513), '1'], ['?0', '', '0'],
  ]) assert.equal(normalizedMobileSignal(request({ 'Sec-CH-UA-Mobile': hint, 'User-Agent': ua,
    'X-PLL-Mobile': expected === '1' ? '0' : '1' })), expected);
});

test('invalid or absent mobile hint falls back only to a bounded phone UA', () => {
  for (const hint of ['', '?2', '1', 'true', '?1, ?0', '"?1"']) {
    assert.equal(normalizedMobileSignal(request({ 'Sec-CH-UA-Mobile': hint, 'User-Agent': 'Example iPhone' })), '1');
    assert.equal(normalizedMobileSignal(request({ 'Sec-CH-UA-Mobile': hint, 'User-Agent': 'Example desktop' })), '0');
  }
  for (const ua of ['Example Mobile', 'Example iPhone', 'Example iPod', 'example mobile', 'Android Mobile'])
    assert.equal(normalizedMobileSignal(request({ 'User-Agent': ua })), '1');
});

test('desktop, Android-only tablets, missing UA and overlong UA remain desktop', () => {
  for (const ua of ['', 'Mozilla Windows', 'Mozilla Android Tablet', 'Mozilla iPad', 'x'.repeat(507) + 'Mobile'])
    assert.equal(normalizedMobileSignal(request({ 'User-Agent': ua, 'X-PLL-Mobile': '1' })), '0');
  assert.equal(normalizedMobileSignal(request({ 'X-PLL-Mobile': '1' })), '0');
  assert.equal(normalizedMobileSignal(request({ 'User-Agent': 'x'.repeat(506) + 'Mobile' })), '1');
});

test('thin frontend forwards only its normalized flag and preserves transport invariants', async () => {
  const incoming = new Request('https://en.panamalegallab.com/_/view/search/panamalegallab.com/panamlegallab-en', {
    method: 'POST', body: 'f.req=opaque', headers: { Origin: url, Referer: url + 'contact-us',
      'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': '12', 'Content-Encoding': 'identity', 'CF-Connecting-IP': '192.0.2.1',
      'Sec-CH-UA-Mobile': '?0', 'User-Agent': 'iPhone Mobile', 'X-PLL-Mobile': '1',
      Cookie: 'private', Authorization: 'private', 'X-Unlisted': 'private' } });
  const response = new Response('same response'), names = [];
  const namespace = { idFromName(name) { names.push(name); return 'object-id'; }, get(id) {
    assert.equal(id, 'object-id'); return { async fetch(forwarded) {
      assert.equal(forwarded.url, incoming.url); assert.equal(forwarded.method, 'POST');
      assert.equal(forwarded.redirect, 'manual'); assert.equal(await forwarded.text(), 'f.req=opaque');
      const oldNames = ['Origin', 'Referer', 'Sec-Fetch-Site', 'Content-Type', 'Content-Length', 'Content-Encoding', 'CF-Connecting-IP'];
      for (const name of oldNames) assert.equal(forwarded.headers.get(name), incoming.headers.get(name));
      assert.equal(forwarded.headers.get('X-PLL-Mobile'), '0');
      for (const name of ['User-Agent', 'Sec-CH-UA-Mobile', 'Cookie', 'Authorization', 'X-Unlisted'])
        assert.equal(forwarded.headers.has(name), false);
      assert.equal([...forwarded.headers].length, oldNames.length + 1); return response;
    } };
  } };
  assert.equal(await handleThinRequest(incoming, { PLL_RENDERER: namespace }), response);
  assert.deepEqual(names, [OBJECT_NAME]);
});

test('thin frontend overwrites spoofed desktop and mobile flags using actual classification', async () => {
  for (const [headers, expected] of [
    [{ 'User-Agent': 'Desktop', 'X-PLL-Mobile': '1' }, '0'],
    [{ 'User-Agent': 'iPhone', 'X-PLL-Mobile': '0' }, '1'],
    [{ 'Sec-CH-UA-Mobile': '?1', 'X-PLL-Mobile': 'arbitrary' }, '1'],
  ]) {
    const namespace = { idFromName: name => name, get: () => ({ fetch: async forwarded => {
      assert.equal(forwarded.headers.get('X-PLL-Mobile'), expected);
      assert.equal(forwarded.headers.has('User-Agent'), false);
      assert.equal(forwarded.headers.has('Sec-CH-UA-Mobile'), false);
      return new Response('ok');
    } }) };
    assert.equal((await handleThinRequest(request(headers), { PLL_RENDERER: namespace })).status, 200);
  }
});
