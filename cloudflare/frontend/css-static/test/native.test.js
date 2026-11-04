import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { REDIRECTS } from '../renderer/vendor/routes-data.js';
import { RENDERER_SHA256 } from '../src/boundary.js';

test('native Pages to SQLite DO preserves all 145 redirects, utilities, Search identity and persistent quota', async () => {
  const frontend = await readFile(new URL('../dist/frontend/_worker.js', import.meta.url), 'utf8');
  const backend = await readFile(new URL('../dist/backend/worker.js', import.meta.url), 'utf8');
  const noResults = await readFile(new URL('./fixtures/search-no-results.txt', import.meta.url), 'utf8');
  const calls = [];
  const runtime = new Miniflare({ compatibilityDate: '2026-07-30', workers: [
    { name: 'frontend', modules: true, script: frontend, compatibilityDate: '2026-07-30',
      durableObjects: { PLL_RENDERER: { className: 'PllRenderer', scriptName: 'pll-renderer-free-20261103', useSQLite: true } } },
    { name: 'pll-renderer-free-20261103', modules: true, script: backend, compatibilityDate: '2026-07-30', versionMetadata: 'CF_VERSION_METADATA',
      outboundService: async request => {
        assert.equal(request.url, 'https://sites.google.com/_/view/search/panamalegallab.com/panamlegallab-en');
        assert.equal(request.method, 'POST');
        assert.equal(request.headers.has('Cookie'), false); assert.equal(request.headers.has('Authorization'), false);
        assert.equal(request.headers.has('CF-Connecting-IP'), false);
        calls.push(await request.text());
        return new Response(noResults, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      } },
  ] });
  try {
    for (const [oldUrl, target] of Object.entries(REDIRECTS)) for (const method of ['GET', 'HEAD']) {
      const response = await runtime.dispatchFetch(oldUrl + '?x=1%26z%3D2', { method, redirect: 'manual' });
      assert.equal(response.status, 301, oldUrl);
      assert.equal(response.headers.get('Location'), target + '?x=1%26z%3D2');
      assert.equal(response.headers.get('X-PLL-RendererSha256'), RENDERER_SHA256);
      assert.equal(await response.text(), '');
    }
    assert.equal(Object.keys(REDIRECTS).length, 145);
    const robots = await runtime.dispatchFetch('https://www.panamalegallab.com/robots.txt');
    assert.match(await robots.text(), /Sitemap: https:\/\/sitemaps\.panamalegallab\.com\/sitemap-index.xml/);
    const rejected = await runtime.dispatchFetch('https://evil.example/');
    assert.equal(rejected.status, 421); await rejected.text();
    const backendEntry = await runtime.getWorker('pll-renderer-free-20261103');
    const inaccessible = await backendEntry.fetch('https://www.panamalegallab.com/');
    assert.equal(inaccessible.status, 404); assert.equal(await inaccessible.text(), 'Not found.');
    const url = 'https://en.panamalegallab.com/_/view/search/panamalegallab.com/panamlegallab-en';
    const body = new URLSearchParams({ 'f.req': JSON.stringify(['at:ss:req', 'residencia']) }).toString();
    const init = { method: 'POST', body, headers: { Origin: 'https://en.panamalegallab.com',
      'Content-Type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': '192.0.2.91', Cookie: 'discard', Authorization: 'discard' } };
    for (let index = 0; index < 60; index += 1) {
      const response = await runtime.dispatchFetch(url, init);
      assert.equal(response.status, 200, 'Search ' + index); assert.equal(await response.text(), noResults);
    }
    const exceeded = await runtime.dispatchFetch(url, init);
    assert.equal(exceeded.status, 429); await exceeded.text(); assert.equal(calls.length, 60);
    const otherClient = await runtime.dispatchFetch(url, { ...init, headers: { ...init.headers, 'CF-Connecting-IP': '192.0.2.92' } });
    assert.equal(otherClient.status, 200); await otherClient.text();
    const crossOrigin = await runtime.dispatchFetch(url, { ...init, headers: { ...init.headers, Origin: 'https://evil.example' } });
    assert.equal(crossOrigin.status, 403); await crossOrigin.text();
    assert.equal(calls.length, 61);
  } finally { await runtime.dispose(); }
});
