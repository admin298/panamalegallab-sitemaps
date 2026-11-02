import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { planSearchRequest, relaySearchPost, rewriteSearchResponse, SearchInputError } from '../src/search-protocol.js';
import { createHandler } from '../vendor/worker.js';
import { createQuota } from '../vendor/logic.js';

const origin = 'https://preview.pages.dev';
const url = `${origin}/_/view/search/panamalegallab.com/panamalegallab?authuser=0`;
const raw = readFileSync(new URL('./fixtures/search-response.txt', import.meta.url), 'utf8');
const xssi = ")]}'\n\n";
const parsed = JSON.parse(raw.slice(xssi.length));
const noResults = readFileSync(new URL('./fixtures/search-no-results.txt', import.meta.url), 'utf8');
const pagination = JSON.parse(readFileSync(new URL('./fixtures/search-pagination.json', import.meta.url), 'utf8')).secondRequest;
const page2 = readFileSync(new URL('./fixtures/search-page2-response.txt', import.meta.url), 'utf8');
const body = new URLSearchParams({ 'f.req': JSON.stringify(['at:ss:req', 'residencia']) }).toString();
const request = (options = {}) => new Request(url, { method: 'POST', body, ...options,
  headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', ...options.headers } });
const options = fetchImpl => ({ fetchImpl, quota: createQuota(20), now: () => 0 });

test('real XSSI fixture rewrites only result URL slots and preserves every other response byte', () => {
  const actual = rewriteSearchResponse(raw, origin);
  const expected = parsed[0][1].reduce((text, row) => text.replace(JSON.stringify(row[0]), JSON.stringify('/es' + new URL(row[0]).pathname.slice('/panamalegallab.com/panamalegallab'.length))), raw);
  assert.equal(actual, expected);
  assert.ok(actual.startsWith(xssi));
});

test('observed null results stay empty without normalization or a502', async () => {
  assert.equal(rewriteSearchResponse(noResults, origin), noResults);
  const response = await relaySearchPost(request(), planSearchRequest(url, 'POST'), options(async () => new Response(noResults, { headers: { 'Content-Type': 'application/json;charset=utf-8' } })));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), noResults);
});

test('source-derived public pagination permits only the exact four-element cursor form', async () => {
  const pageBody = new URLSearchParams({ 'f.req': JSON.stringify(pagination) }).toString();
  let forwarded;
  const response = await relaySearchPost(request({ body: pageBody }), planSearchRequest(url, 'POST'), options(async (_url, init) => {
    forwarded = init.body;
    return new Response(page2, { headers: { 'Content-Type': 'application/json;charset=utf-8' } });
  }));
  assert.equal(response.status, 200);
  assert.equal(forwarded, pageBody);
  const results = JSON.parse((await response.text()).slice(xssi.length));
  assert.equal(results[0][1].length, 10);
  assert.ok(results[0][1][0][0].startsWith('/es/'));
  for (const message of [['at:ss:req', 'residencia', 0, 'cursor'], ['at:ss:req', 'residencia', null, ''], ['at:ss:req', 'residencia', null, 'x'.repeat(257)], ['at:ss:req', 'residencia', null, 'x\n'], ['at:ss:req', 'residencia', null, 'cursor', 1]]) {
    const invalid = request({ body: new URLSearchParams({ 'f.req': JSON.stringify(message) }).toString() });
    assert.equal((await relaySearchPost(invalid, planSearchRequest(url, 'POST'), options(() => assert.fail('unexpected fetch')))).status, 400);
  }
});

test('titles, HTML snippets and duplicate URL text in non-URL slots remain untouched', () => {
  const target = parsed[0][1][0][0];
  const row = [target, [target], [`<b>${target}</b>`], 'id'];
  const record = parsed[0].map((value, index) => index === 1 ? [row] : value);
  const source = xssi + ' \n' + JSON.stringify([record]) + '\n ';
  const actual = rewriteSearchResponse(source, origin);
  const result = JSON.parse(actual.slice(xssi.length));
  assert.ok(result[0][1][0][0].startsWith('/es/'));
  assert.deepEqual(result[0][1][0].slice(1), row.slice(1));
  assert.ok(actual.endsWith('\n '));
  assert.ok(actual.includes(JSON.stringify(row[1])));
});

test('unexpected XSSI, record schema or more than the observed first ten results are rejected', () => {
  for (const source of [raw.slice(1), xssi + '{bad', xssi + '[]', xssi + JSON.stringify([['other']]),
    xssi + JSON.stringify([parsed[0].map((value, index) => index === 1 ? Array.from({ length: 11 }, () => parsed[0][1][0]) : value)]),
    xssi + JSON.stringify([parsed[0].map((value, index) => index === 1 ? [['x']] : value)])]) {
    assert.throws(() => rewriteSearchResponse(source, origin), SearchInputError);
  }
});

test('relay rebuilds an anonymous fixed upstream request and never forwards account selectors or visitor headers', async () => {
  let observed;
  const req = request({ headers: { Cookie: 'private=visitor', Authorization: 'Bearer private', Referer: origin + '/', 'X-Forwarded-For': 'private' } });
  const response = await relaySearchPost(req, planSearchRequest(req.url, 'POST'), options(async (target, init) => {
    observed = { target, init };
    return new Response(raw, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': 'private=source', 'Access-Control-Allow-Origin': '*' } });
  }));
  assert.equal(response.status, 200);
  assert.equal(observed.target, 'https://sites.google.com/_/view/search/panamalegallab.com/panamalegallab');
  assert.equal(observed.init.redirect, 'manual');
  assert.equal(observed.init.method, 'POST');
  assert.deepEqual(Object.keys(observed.init.headers).sort(), ['Accept', 'Accept-Language', 'Content-Type', 'User-Agent']);
  assert.equal(observed.init.body, body);
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('relay refuses missing identity, external Origin, unsupported type, encoding and oversized body before fetching', async () => {
  const noFetch = options(() => assert.fail('unexpected upstream fetch'));
  const cases = [
    [new Request(url, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }), 403],
    [request({ headers: { Origin: 'https://evil.example', Referer: origin + '/' } }), 403],
    [request({ headers: { 'Content-Type': 'application/json' } }), 415],
    [request({ headers: { 'Content-Encoding': 'gzip' } }), 415],
    [request({ body: 'x'.repeat(4097), headers: { 'Content-Length': '1' } }), 413],
    [request({ body: 'f.req=%FF' }), 400],
  ];
  for (const [req, status] of cases) assert.equal((await relaySearchPost(req, planSearchRequest(req.url, 'POST'), noFetch)).status, status);
});

test('relay also caps the reconstructed encoded body before fetching', async () => {
  const rawBody = 'f.req=' + JSON.stringify(['at:ss:req', '😀'.repeat(256), null, '😀'.repeat(256)]);
  assert.ok(new TextEncoder().encode(rawBody).byteLength < 4096);
  const response = await relaySearchPost(request({ body: rawBody }), planSearchRequest(url, 'POST'),
    options(() => assert.fail('expanded form must not be fetched')));
  assert.equal(response.status, 413);
});

test('relay quota is separate, bounded, and excessive or invalid upstream responses are hidden', async () => {
  const denied = await relaySearchPost(request(), planSearchRequest(url, 'POST'), { ...options(() => assert.fail()), quota: () => false });
  assert.equal(denied.status, 429);
  for (const upstream of [
    new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com/' } }),
    new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('x'.repeat(262145), { headers: { 'Content-Type': 'application/json' } }),
    new Response(new Uint8Array([0xff]), { headers: { 'Content-Type': 'application/json' } }),
  ]) {
    const response = await relaySearchPost(request(), planSearchRequest(url, 'POST'), options(async () => upstream));
    assert.equal(response.status, 502);
  }
  const response = await relaySearchPost(request(), planSearchRequest(url, 'POST'), options(async () => { throw new Error('private diagnostic'); }));
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private/);
});

test('worker routes only the observed search POST while unrelated POST stays405', async () => {
  const handler = createHandler({ fetchImpl: async () => new Response(raw, { headers: { 'Content-Type': 'application/json' } }) });
  assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(new Request(`${origin}/es/contacto`, { method: 'POST' }))).status, 405);
  assert.equal((await handler(new Request(`${origin}/_/view/rpc`, { method: 'POST' }))).status, 405);
  assert.equal((await handler(new Request(url.replace('authuser=0', 'authuser=1'), { method: 'POST' }))).status, 400);
});

test('production hosts are rejected before any search validation and never receive preview noindex', async () => {
  const handler = createHandler({ fetchImpl: () => assert.fail('production must not fetch through preview') });
  for (const [path, method] of [['/_/view/search/panamalegallab.com/panamalegallab?authuser=1', 'POST'], ['/search/panamalegallab.com/panamalegallab?bad=1', 'GET']]) {
    const response = await handler(new Request('https://www.panamalegallab.com' + path, { method }));
    assert.equal(response.status, 421);
    assert.equal(response.headers.get('X-Robots-Tag'), null);
  }
});

test('search cannot override an insecure-protocol400 from the shared preview guard', async () => {
  const handler = createHandler({ fetchImpl: () => assert.fail('HTTP preview search must not fetch') });
  for (const [path, method] of [['/_/view/search/panamalegallab.com/panamalegallab', 'POST'], ['/search/panamalegallab.com/panamalegallab?query=residencia&scope=site&showCloudSearchTab=false', 'GET']]) {
    const response = await handler(new Request('http://preview.pages.dev' + path, { method, headers: { Origin: 'http://preview.pages.dev', 'Content-Type': 'application/x-www-form-urlencoded' }, ...(method === 'POST' ? { body } : {}) }));
    assert.equal(response.status, 400);
  }
});
