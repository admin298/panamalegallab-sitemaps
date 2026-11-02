import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SearchInputError, planSearchRequest, isSameOriginSearch, validateSearchBody, readBoundedText } from '../src/search-protocol.js';

const preview = 'https://preview.pages.dev';
const endpoint = '/_/view/search/panamalegallab.com/panamalegallab';
const body = query => new URLSearchParams({ 'f.req': JSON.stringify(['at:ss:req', query]) }).toString();
const request = (headers = {}, path = endpoint) => new Request(`${preview}${path}`, { method: 'POST', headers });

test('only four exact search endpoints are planned and optional authuser0 is removed upstream', () => {
  for (const slug of ['panamalegallab', 'panamlegallab-en', 'panamlegallab-fr', 'panamlegallab-it']) {
    const plan = planSearchRequest(`${preview}/_/view/search/panamalegallab.com/${slug}?authuser=0`, 'POST');
    assert.equal(plan.kind, 'search-post');
    assert.equal(plan.upstream, `https://sites.google.com/_/view/search/panamalegallab.com/${slug}`);
  }
  for (const path of [endpoint + '/extra', endpoint + '/', '/_/view/rpc', '/_/view/search/evil.example/panamalegallab']) {
    assert.equal(planSearchRequest(preview + path, 'POST'), null);
  }
  for (const query of ['authuser=1', 'authuser=0&authuser=0', 'next=https://evil.example', 'authuser=admin%40example.com']) {
    assert.throws(() => planSearchRequest(`${preview}${endpoint}?${query}`, 'POST'), SearchInputError);
  }
});

test('observed GET search route encodes query as data and uses exact upstream URL for compatibility', () => {
  const path = '/search/panamalegallab.com/panamalegallab?query=hola%26x%3D2&scope=site&showCloudSearchTab=false&authuser=0';
  const plan = planSearchRequest(preview + path, 'GET');
  assert.equal(plan.kind, 'page');
  assert.equal(plan.upstream, 'https://sites.google.com/search/panamalegallab.com/panamalegallab?query=hola%26x%3D2&scope=site&showCloudSearchTab=false');
  assert.equal(new URL(plan.upstream).searchParams.get('query'), 'hola&x=2');
  assert.equal(new URL(plan.upstream).searchParams.has('authuser'), false);
  for (const query of ['query=x&scope=all&showCloudSearchTab=false', 'query=x&scope=site', 'query=x&query=y&scope=site&showCloudSearchTab=false', 'query=x&scope=site&showCloudSearchTab=true']) {
    assert.throws(() => planSearchRequest(`${preview}/search/panamalegallab.com/panamalegallab?${query}`, 'GET'), SearchInputError);
  }
});

test('observed page-two history GET keeps one bounded page_token as URL data', () => {
  const base = `${preview}/search/panamalegallab.com/panamalegallab?query=residencia&scope=site&showCloudSearchTab=false`;
  const plan = planSearchRequest(base + '&page_token=CI7RkOmZNBAK&authuser=0', 'GET');
  assert.equal(plan.upstream, 'https://sites.google.com/search/panamalegallab.com/panamalegallab?query=residencia&scope=site&showCloudSearchTab=false&page_token=CI7RkOmZNBAK');
  assert.equal(new URL(plan.previewPage).searchParams.get('page_token'), 'CI7RkOmZNBAK');
  assert.equal(new URL(plan.canonical).searchParams.get('page_token'), 'CI7RkOmZNBAK');
  const opaque = 'A&B + = Panamá 😀';
  assert.equal(new URL(planSearchRequest(base + '&page_token=' + encodeURIComponent(opaque), 'GET').upstream).searchParams.get('page_token'), opaque);
  for (const token of ['', 'x'.repeat(257), 'x\n', 'x\u007f', '\ud800']) {
    const encoded = token === '\ud800' ? '%ED%A0%80' : encodeURIComponent(token);
    assert.throws(() => planSearchRequest(base + '&page_token=' + encoded, 'GET'), SearchInputError);
  }
  assert.throws(() => planSearchRequest(base + '&page_token=one&page_token=two', 'GET'), SearchInputError);
});

test('search requires same-origin identity and cannot fall back from an external Origin', () => {
  assert.equal(isSameOriginSearch(request({ Origin: preview })), true);
  assert.equal(isSameOriginSearch(request({ Referer: preview + '/' })), true);
  assert.equal(isSameOriginSearch(request({ Origin: preview, 'Sec-Fetch-Site': 'same-origin' })), true);
  for (const headers of [{}, { Origin: 'null' }, { Referer: 'https://evil.example/' }, { Origin: 'https://evil.example', Referer: preview + '/' }, { Origin: preview, 'Sec-Fetch-Site': 'cross-site' }, { Referer: 'https://user:password@preview.pages.dev/' }]) {
    assert.equal(isSameOriginSearch(request(headers)), false);
  }
});

test('f.req schema is one decoded field, exact tag and exactly two JSON elements', () => {
  assert.equal(validateSearchBody(body('residencia')), 'residencia');
  assert.equal(validateSearchBody(body('A&B + = Panamá 😀')), 'A&B + = Panamá 😀');
  for (const raw of ['', body('x') + '&' + body('x'), body('x') + '&extra=1', 'f.req=%ZZ', 'f.req=%FF', 'f.req=%5B', 'other=1', 'f.req=' + encodeURIComponent(JSON.stringify(['other', 'x'])), 'f.req=' + encodeURIComponent(JSON.stringify(['at:ss:req', 'x', 1])), 'f.req=' + encodeURIComponent(JSON.stringify(['at:ss:req', 2]))]) {
    assert.throws(() => validateSearchBody(raw), SearchInputError);
  }
});

test('query limit counts Unicode codepoints and rejects controls or lone surrogates', () => {
  assert.equal(validateSearchBody(body('😀'.repeat(256))), '😀'.repeat(256));
  assert.throws(() => validateSearchBody(body('😀'.repeat(257))), SearchInputError);
  for (const query of ['x\n', 'x\u007f', 'x\u0085', '\ud800', '\udfff']) {
    assert.throws(() => validateSearchBody(body(query)), SearchInputError);
  }
});

test('stream byte limit is enforced with missing or forged Content-Length and invalid UTF8', async () => {
  const stream = chunks => new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } });
  assert.equal(await readBoundedText(stream([new TextEncoder().encode('abc')]), 4096), 'abc');
  await assert.rejects(readBoundedText(stream([new Uint8Array(3000), new Uint8Array(2000)]), 4096, '1'), error => error.status === 413);
  await assert.rejects(readBoundedText(stream([new Uint8Array(4097)]), 4096), error => error.status === 413);
  await assert.rejects(readBoundedText(stream([new Uint8Array([0xff])]), 4096), SearchInputError);
  await assert.rejects(readBoundedText(stream([]), 4096, '5000'), error => error.status === 413);
});
