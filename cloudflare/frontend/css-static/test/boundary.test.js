import test from 'node:test';
import assert from 'node:assert/strict';
import { requestBoundary, temporaryResponse, backendNotFound, withBackendVersion, RENDERER_SHA256 } from '../src/boundary.js';

test('thin boundary accepts exactly the existing production and project preview hosts', () => {
  for (const host of ['www', 'en', 'fr', 'it'].map(name => name + '.panamalegallab.com')
    .concat(['pll-seo-preview-20261102.pages.dev', 'recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev'])) {
    assert.equal(requestBoundary({ url: 'https://' + host + '/' }).allowed, true);
  }
  for (const input of ['https://evil.example/', 'https://www.panamalegallab.com.evil.example/',
    'https://a.b.pll-seo-preview-20261102.pages.dev/', 'https://-bad.pll-seo-preview-20261102.pages.dev/',
    'https://www.panamalegallab.com:444/']) assert.equal(requestBoundary({ url: input }).status, 421);
  assert.equal(requestBoundary({ url: 'not a URL' }).status, 400);
});

test('thin protocol/path/encoding limits agree with the reviewed planner before binding access', () => {
  for (const input of ['https://u:p@www.panamalegallab.com/', 'ftp://www.panamalegallab.com/',
    'https://www.panamalegallab.com/a/../b', 'https://www.panamalegallab.com/a%2Fb',
    'https://www.panamalegallab.com/%0a', 'https://www.panamalegallab.com/%zz']) {
    assert.equal(requestBoundary({ url: input }).status, 400, input);
  }
  assert.equal(requestBoundary({ url: 'https://www.panamalegallab.com/' + 'x'.repeat(4096) }).status, 414);
  assert.equal(requestBoundary({ url: 'https://www.panamalegallab.com/?x=' + 'y'.repeat(8200) }).status, 414);
  assert.equal(requestBoundary({ url: 'http://www.panamalegallab.com/' }).allowed, true);
});

test('temporary failures hide internal errors, preserve preview noindex and HEAD emptiness', async () => {
  const normal = temporaryResponse({ preview: false }, 'GET');
  assert.equal(normal.status, 503); assert.equal(normal.headers.get('Retry-After'), '60');
  assert.equal(normal.headers.has('X-Robots-Tag'), false);
  const preview = temporaryResponse({ preview: true }, 'HEAD');
  assert.equal(preview.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  assert.equal(await preview.text(), '');
  assert.equal(backendNotFound('HEAD').status, 404);
  assert.equal(await backendNotFound('HEAD').text(), '');
  assert.equal(await backendNotFound('GET').text(), 'Not found.');
});

test('backend stamps only public version provenance without changing body/status/original headers', async () => {
  for (const id of ['cf-version-test', null, 'bad\nvalue']) {
    const response = withBackendVersion(new Response('kept', { status: 201, headers: { 'Content-Security-Policy': "script-src 'nonce-kept'" } }),
      { CF_VERSION_METADATA: { id } });
    assert.equal(response.status, 201); assert.equal(await response.text(), 'kept');
    assert.equal(response.headers.get('Content-Security-Policy'), "script-src 'nonce-kept'");
    assert.equal(response.headers.get('X-PLL-RendererSha256'), RENDERER_SHA256);
    assert.equal(response.headers.get('X-PLL-Backend-Version'), id === 'cf-version-test' ? id : 'pll-durable-free-20261103-v1');
  }
});
