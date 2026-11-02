import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';
import { SITES } from '../vendor/logic.js';

const siteList = Object.values(SITES);
const artifact = fileURLToPath(new URL('../dist/_worker.js', import.meta.url));
const rawSearch = readFileSync(new URL('../test/fixtures/search-response.txt', import.meta.url), 'utf8');
const emptySearch = readFileSync(new URL('../test/fixtures/search-no-results.txt', import.meta.url), 'utf8');

function publicHtml(site, upstream, configChange = value => value) {
  const config = Array.from({ length: 518 }, () => null);
  config[212] = 0;
  config[316] = upstream;
  const changed = configChange(config);
  return `<!doctype html><html><head><title>Original published title</title><script nonce="keep-nonce">_at_config = ${JSON.stringify(changed)};window.globals={kept:true};</script><style>.hero{background-image:url('https://sites.google.com/sitesv-images-rt/same-token=w16383')}</style></head><body><div data-domain="panamalegallab.com" data-sitename="${site.upstreamPrefix.split('/').at(-1)}"></div><h1>Original published heading</h1><a href="${site.upstreamRoot}/known-link?x=1#part">Internal</a><a href="${SITES.fr.upstreamRoot}/guide">French</a><img src="https://sites.google.com/sitesv-images-rt/same-token=w300"><iframe src="https://script.google.com/macros/s/unchanged/exec?lang=${site.language}"></iframe></body></html>`;
}

function htmlResponse(html, status = 200, extraHeaders = {}) {
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "script-src 'nonce-keep-nonce'", 'X-Frame-Options': 'DENY',
    'Set-Cookie': 'must-not-forward=dummy; Secure', ...extraHeaders } });
}

async function withRuntime(outboundService, check) {
  const runtime = new Miniflare({ modules: true, scriptPath: artifact,
    compatibilityDate: '2026-07-30', outboundService });
  try { await check(runtime); } finally { await runtime.dispose(); }
}

const dispatch = (runtime, url, options = {}) => runtime.dispatchFetch(url, { redirect: 'manual', ...options });

test('four real hosts serve native paths, canonical roots and unchanged content/security', async () => {
  const calls = [];
  await withRuntime(request => {
    calls.push({ url: request.url, headers: Object.fromEntries(request.headers) });
    const site = siteList.find(candidate => request.url.startsWith(candidate.upstreamRoot + '/'));
    assert.ok(site);
    return htmlResponse(publicHtml(site, request.url));
  }, async runtime => {
    for (const site of siteList) {
      const response = await dispatch(runtime, site.productionOrigin + '/', {
        headers: { Cookie: 'visitor=dummy', Authorization: 'Bearer dummy', Referer: 'https://private.invalid/', 'X-Forwarded-Host': 'attacker.invalid' },
      });
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.equal(response.headers.has('X-Robots-Tag'), false);
      assert.equal(response.headers.has('Set-Cookie'), false);
      assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
      assert.equal(response.headers.get('Content-Security-Policy'), "script-src 'nonce-keep-nonce'");
      assert.ok(html.includes(`<link rel="canonical" href="${site.productionOrigin}/">`));
      assert.ok(html.includes('Original published heading'));
      assert.ok(html.includes(`href="${site.productionOrigin}/known-link?x=1#part"`));
      assert.ok(html.includes(`href="${SITES.fr.productionOrigin}/guide"`));
      assert.ok(html.includes('https://lh7-us.googleusercontent.com/sitesv-images-rt/same-token=w300'));
      assert.ok(html.includes('nonce="keep-nonce"'));
      assert.ok(html.includes(`src="https://script.google.com/macros/s/unchanged/exec?lang=${site.language}"`));
    }
    assert.equal(calls.length, 4);
    for (const call of calls) for (const name of ['cookie', 'authorization', 'referer', 'origin', 'x-forwarded-host']) {
      assert.equal(call.headers[name], undefined);
    }
  });
});

test('new public path reaches its fixed Site and explicit author noindex is preserved', async () => {
  await withRuntime(request => htmlResponse(publicHtml(SITES.it, request.url).replace('<head>', '<head><meta name="robots" content="noindex">'), 200,
    { 'X-Robots-Tag': 'noindex' }), async runtime => {
    const response = await dispatch(runtime, SITES.it.productionOrigin + '/a-new-public-page?utm_source=test');
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
    assert.ok(html.includes('<meta name="robots" content="noindex">'));
    assert.ok(html.includes(`<link rel="canonical" href="${SITES.it.productionOrigin}/a-new-public-page">`));
  });
});

test('source404 stays a minimal404 with native home link and no Google viewer or false canonical', async () => {
  await withRuntime(() => htmlResponse('<script>location.replace("https://sites.google.com/error");</script>', 404), async runtime => {
    const response = await dispatch(runtime, SITES.it.productionOrigin + '/not-published');
    const html = await response.text();
    assert.equal(response.status, 404);
    assert.ok(html.includes(`href="${SITES.it.productionOrigin}/"`));
    assert.equal(/canonical|<script|sites\.google\.com/.test(html), false);
    assert.equal(response.headers.get('Location'), null);
  });
});

test('recognized Site configuration drift uses only a temporary fixed-source availability escape', async () => {
  await withRuntime(request => htmlResponse(publicHtml(SITES.it, request.url, config => [...config, null])), async runtime => {
    const url = SITES.it.productionOrigin + '/known-link?utm_source=test';
    const response = await dispatch(runtime, url);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), SITES.it.upstreamRoot + '/known-link?utm_source=test');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.has('X-Robots-Tag'), false);
    assert.equal(response.headers.get('X-PLL-Delivery'), 'google-source-fallback');
  });
});

test('preview configuration drift stays failclosed/noindex without availability302', async () => {
  await withRuntime(request => htmlResponse(publicHtml(SITES.it, request.url, config => [...config, null])), async runtime => {
    const response = await dispatch(runtime, 'https://pll-seo-preview-20261102.pages.dev/it/');
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Location'), null);
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  });
});

test('a200login page, a different Site and fake marker strings cannot trigger rescue or public200', async () => {
  for (const html of [
    '<html><title>Sign in</title><p>Account access</p></html>',
    publicHtml(SITES.fr, SITES.fr.upstreamRoot + '/'),
    `<html><script>const fake = '<div data-domain="panamalegallab.com" data-sitename="panamlegallab-it"></div>';</script></html>`,
  ]) await withRuntime(() => htmlResponse(html), async runtime => {
    const response = await dispatch(runtime, SITES.it.productionOrigin + '/');
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Location'), null);
  });
});

test('unexpected redirects, mime, timeout and excessive body stay temporary errors', async () => {
  const responses = [
    () => new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com/login' } }),
    () => new Response(null, { status: 302 }),
    () => new Response(null, { status: 302, headers: { Location: '' } }),
    () => new Response(null, { status: 304 }),
    () => new Response(null, { status: 305, headers: { Location: 'https://sites.google.com/panamalegallab.com/panamlegallab-it/new' } }),
    () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }),
    () => { throw new Error('private upstream details'); },
    () => htmlResponse('x'.repeat(1_048_577)),
  ];
  for (const outbound of responses) await withRuntime(outbound, async runtime => {
    const response = await dispatch(runtime, SITES.it.productionOrigin + '/');
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Location'), null);
    assert.equal((await response.text()).includes('private upstream details'), false);
  });
});

test('generic rewrite size errors with genuine Site markers never become a compatibility302', async () => {
  for (const tag of ['style', 'script']) await withRuntime(request => htmlResponse(
    publicHtml(SITES.it, request.url).replace('</head>', `<${tag}>${'x'.repeat(512_001)}</${tag}></head>`)), async runtime => {
    const response = await dispatch(runtime, SITES.it.productionOrigin + '/');
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Location'), null);
    assert.equal(response.headers.get('X-PLL-Delivery'), null);
  });
});

test('robots and utility sitemap are correct per public host; preview robots does not block noindex', async () => {
  await withRuntime(() => { throw new Error('Utility must not fetch'); }, async runtime => {
    for (const site of siteList) {
      const robots = await dispatch(runtime, site.productionOrigin + '/robots.txt');
      assert.equal(robots.status, 200);
      assert.equal(robots.headers.has('X-Robots-Tag'), false);
      const body = await robots.text();
      assert.ok(body.includes('Sitemap: https://sitemaps.panamalegallab.com/sitemap-index.xml'));
      assert.equal(/Disallow:\s*\/\s*$/m.test(body), false);
      const sitemap = await dispatch(runtime, site.productionOrigin + '/sitemap.xml');
      assert.equal(sitemap.status, 301);
      assert.equal(sitemap.headers.get('Location'), 'https://sitemaps.panamalegallab.com/sitemap-index.xml');
    }
    const preview = await dispatch(runtime, 'https://pll-seo-preview-20261102.pages.dev/robots.txt');
    assert.equal(preview.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    assert.equal(await preview.text(), 'User-agent: *\nDisallow:\n');
  });
});

test('a forbidden POST never submits a lead or fetches Google', async () => {
  let calls = 0;
  await withRuntime(() => { calls += 1; return new Response('should not happen'); }, async runtime => {
    const response = await dispatch(runtime, SITES.es.productionOrigin + '/contacto', { method: 'POST', body: 'dummy' });
    assert.equal(response.status, 405);
    assert.equal(calls, 0);
  });
});

test('production Search preserves XSSI and rewrites results to native URLs with no visitor identity', async () => {
  const calls = [];
  await withRuntime(async request => {
    calls.push({ url: request.url, body: await request.text(), headers: Object.fromEntries(request.headers) });
    return new Response(rawSearch, { headers: { 'Content-Type': 'application/json;charset=utf-8' } });
  }, async runtime => {
    const response = await dispatch(runtime, SITES.es.productionOrigin + '/_/view/search' + SITES.es.upstreamPrefix + '?authuser=0', {
      method: 'POST', headers: { Origin: SITES.es.productionOrigin, 'Sec-Fetch-Site': 'same-origin', Cookie: 'visitor=dummy',
        Authorization: 'Bearer dummy', 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ 'f.req': JSON.stringify(['at:ss:req', 'residencia']) }).toString(),
    });
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.ok(body.startsWith(")]}'\n\n"));
    const data = JSON.parse(body.slice(6));
    assert.ok(data[0][1].every(row => row[0].startsWith(SITES.es.productionOrigin + '/')));
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://sites.google.com/_/view/search' + SITES.es.upstreamPrefix);
    for (const header of ['cookie', 'authorization', 'origin', 'referer']) assert.equal(calls[0].headers[header], undefined);
  });
});

test('empty Search stays200 while changed JSON and failed Search upstream become503 without redirects', async () => {
  for (const [raw, expected] of [[emptySearch, 200], ['{}', 503]]) {
    await withRuntime(() => new Response(raw, { headers: { 'Content-Type': 'application/json' } }), async runtime => {
      const response = await dispatch(runtime, SITES.it.productionOrigin + '/_/view/search' + SITES.it.upstreamPrefix, {
        method: 'POST', headers: { Origin: SITES.it.productionOrigin, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 'f.req': '["at:ss:req","no matches"]' }).toString(),
      });
      assert.equal(response.status, expected);
      assert.equal(response.headers.get('Location'), null);
      assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
      if (expected === 200) assert.equal(await response.text(), emptySearch);
    });
  }
});
