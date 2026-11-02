import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryHandler, approvedSourceRedirect, deliveryHeaders, errorResponse, publicResponseHeaders } from '../src/worker.js';
import { planDeliveryRequest } from '../src/plan.js';
import { PreviewCompatibilityError } from '../vendor/logic.js';

const origin = 'https://it.panamalegallab.com';
const page = origin + '/known-link';
const plan = planDeliveryRequest(page);
const request = (url = page, method = 'GET') => new Request(url, { method });
const options = overrides => ({ Rewriter: class {}, identifySite: async () => true,
  rewriteDocument: async () => '<h1>Public content</h1>', ...overrides });

test('missing, empty or malformed source Location is never coerced into a public path', () => {
  for (const value of [null, undefined, '', ' ', {}, '\u0000']) {
    assert.equal(approvedSourceRedirect(value, plan, page), null);
  }
});

test('source redirects must stay in the exact Site and never loop to the visitor URL', () => {
  assert.equal(approvedSourceRedirect(plan.upstream, plan, page), null);
  assert.equal(approvedSourceRedirect('https://accounts.google.com/login', plan, page), null);
  assert.equal(approvedSourceRedirect('https://sites.google.com/panamalegallab.com/panamalegallab/foreign', plan, page), null);
  assert.equal(approvedSourceRedirect('https://sites.google.com/panamalegallab.com/panamlegallab-it/new-link', plan, page), origin + '/new-link');
});

test('unknown hosts have421/noindex absent and never make a source request', async () => {
  const handler = createDeliveryHandler(options({ fetchImpl: () => assert.fail('unknown host fetch') }));
  const response = await handler(request('https://attacker.example/'));
  assert.equal(response.status, 421);
  assert.equal(response.headers.has('X-Robots-Tag'), false);
});

test('factory404 keeps a true missing-page status and a source network failure stays503', async () => {
  const missing = createDeliveryHandler(options({ fetchImpl: async () => new Response('Google viewer', { status: 404 }) }));
  assert.equal((await missing(request())).status, 404);
  const failed = createDeliveryHandler(options({ fetchImpl: () => { throw new Error('private'); } }));
  const response = await failed(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal(response.headers.has('X-Robots-Tag'), false);
  assert.equal((await response.text()).includes('private'), false);
});

test('only typed compatibility failure with independently accepted public identity can rescue content', async () => {
  const fetchImpl = async () => new Response('<p>Known Site</p>', { headers: { 'Content-Type': 'text/html' } });
  const typed = createDeliveryHandler(options({ fetchImpl, rewriteDocument: async () => { throw new PreviewCompatibilityError(); } }));
  const rescued = await typed(request());
  assert.equal(rescued.status, 302);
  assert.equal(rescued.headers.get('Location'), plan.upstream);
  const generic = createDeliveryHandler(options({ fetchImpl, rewriteDocument: async () => { throw new Error('generic'); } }));
  assert.equal((await generic(request())).status, 503);
  const wrongSite = createDeliveryHandler(options({ fetchImpl, identifySite: async () => false,
    rewriteDocument: async () => { throw new PreviewCompatibilityError(); } }));
  assert.equal((await wrongSite(request())).status, 503);
});

test('valid content GET and HEAD preserve status while the upstream request never inherits visitor headers', async () => {
  const observed = [];
  const handler = createDeliveryHandler(options({ fetchImpl: async (url, init) => {
    observed.push({ url, init });
    return new Response('<p>Source</p>', { headers: { 'Content-Type': 'text/html', 'X-Robots-Tag': 'noindex' } });
  } }));
  for (const method of ['GET', 'HEAD']) {
    const response = await handler(new Request(page, { method, headers: { Cookie: 'dummy', Authorization: 'dummy', Referer: 'https://unrelated.invalid/' } }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
    assert.equal(await response.text(), method === 'HEAD' ? '' : '<h1>Public content</h1>');
  }
  for (const call of observed) {
    assert.deepEqual(Object.keys(call.init.headers).sort(), ['Accept', 'Accept-Language', 'User-Agent']);
    assert.equal(call.init.redirect, 'manual');
  }
});

test('production temporary rate errors do not carry noindex, while previews and search do', async () => {
  const denied = createDeliveryHandler(options({ pageQuota: () => false, fetchImpl: () => assert.fail('quota fetch') }));
  const response = await denied(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.has('X-Robots-Tag'), false);
  assert.equal(deliveryHeaders(planDeliveryRequest('https://pll-seo-preview-20261102.pages.dev/it/'))['X-Robots-Tag'], 'noindex, nofollow');
  assert.equal(deliveryHeaders(planDeliveryRequest(origin + '/_/search?query=x&scope=site&showCloudSearchTab=false'))['X-Robots-Tag'], 'noindex, nofollow');
});

test('utility routes do not fetch and HEAD errors never emit a body', async () => {
  const handler = createDeliveryHandler(options({ fetchImpl: () => assert.fail('utility fetch') }));
  for (const path of ['/robots.txt', '/sitemap.xml']) assert.ok((await handler(request(origin + path))).status < 400);
  assert.equal((await handler(request('https://pll-seo-preview-20261102.pages.dev/'))).status, 200);
  assert.equal(await errorResponse(plan, 404, 'HEAD').text(), '');
  assert.equal(await errorResponse(plan, 405, 'HEAD').text(), '');
});

test('source transport and security headers are selected without overriding author exclusion', () => {
  const headers = publicResponseHeaders(new Response('x', { headers: { 'Set-Cookie': 'dummy=1', 'Content-Length': '1',
    'Content-Encoding': 'gzip', 'Content-Security-Policy': "script-src 'nonce-keep'", 'X-Robots-Tag': 'noindex' } }), plan);
  assert.equal(headers.has('Set-Cookie'), false);
  assert.equal(headers.has('Content-Length'), false);
  assert.equal(headers.has('Content-Encoding'), false);
  assert.equal(headers.get('Content-Security-Policy'), "script-src 'nonce-keep'");
  assert.equal(headers.get('X-Robots-Tag'), 'noindex');
});
