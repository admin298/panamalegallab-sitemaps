import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { RENDERER_SHA256 } from '../src/boundary.js';

const languages = ['es', 'en', 'fr', 'it'];
const origin = language => `https://${language === 'es' ? 'www' : language}.panamalegallab.com`;
const preview = 'https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const paths = Object.freeze({
  es: '/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama',
  en: '/our-services-in-panama/real-estate-investment-in-panama',
  fr: '/nos-services-au-panama/investissement-immobilier-au-panama',
  it: '/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama',
});
const scriptNonce = 'ScriptNonce1234567890123456';
const styleNonce = 'StylesNonce1234567890123456';
const csp = `base-uri 'self';object-src 'none';script-src 'report-sample' 'nonce-${scriptNonce}' 'unsafe-inline' 'unsafe-eval';worker-src 'self'`;
const vary = 'Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site, accept-encoding';
const digest = text => createHash('sha256').update(text).digest('hex');

function fixture(language, path) {
  const siteName = language === 'es' ? 'panamalegallab' : `panamlegallab-${language}`;
  const base = `https://${language === 'es' ? 'www' : language}.panamalegallab.com`;
  return '<!doctype html><html><head><meta charset="utf-8">'
    + `<link rel="canonical" href="${base}${path}">`
    + `<link rel="alternate" hreflang="es" href="https://www.panamalegallab.com/">`
    + `<link rel="stylesheet" nonce="${styleNonce}" href="/_pll-assets/same-styles.css">`
    + `<style nonce='${styleNonce}'>.photo{width:427px;height:683px}</style>`
    + `<script nonce="${scriptNonce}">window.unchanged={text:"Panamá, société, società 😀"};</script>`
    + `</head><body><main data-domain="panamalegallab.com" data-sitename="${siteName}">`
    + `<h1>${language}:${path}</h1><img src="https://images.invalid/same-photo.webp" width="427" height="683" alt="Foto original">`
    + `<a href="${base}${path}">Servicio</a><a href="https://wa.me/50769921967">+507 6992-1967</a>`
    + `<iframe title="Mapa" src="https://maps.google.com/maps?q=Panama&amp;output=embed"></iframe>`
    + `<iframe title="Formulario" src="https://script.google.com/macros/s/public-test/exec?lang=${language}"></iframe>`
    + `<script nonce='${scriptNonce}'>window.sameNavigation=true;</script></main></body></html>`;
}

function normalize(html, policy) {
  const script = /'nonce-([^']+)'/u.exec(policy)?.[1];
  const style = /<style\s+nonce=['"]([^'"]+)['"]/u.exec(html)?.[1];
  assert.ok(script && style && script !== style);
  let attributes = 0;
  const body = html.replace(/(<(script|style|link)\b[^<>]*?\snonce=)(['"])([^'"]+)\3/gu,
    (whole, before, tag, quote, value) => {
      attributes += 1;
      assert.equal(value, tag === 'script' ? script : style);
      return before + quote + (tag === 'script' ? '__SCRIPT__' : '__STYLE__') + quote;
    });
  assert.equal(attributes, 4);
  return { body, csp: policy.replace(`'nonce-${script}'`, "'nonce-__SCRIPT__'"), script, style };
}

async function bundles(mode) {
  const backend = await build({ stdin: { contents: `
    import { DurableObject } from 'cloudflare:workers';
    import { createRendererClass } from './src/backend-core.js';
    import { backendNotFound } from './src/boundary.js';
    const originCalls = new Map(), rendererCalls = new Map();
    const parse = request => {
      const url = new URL(request.url), match = /^\\/(es|en|fr|it)(\\/.*)$/.exec(url.pathname);
      const language = url.hostname.endsWith('.pages.dev') ? (match?.[1] ?? 'es')
        : url.hostname.startsWith('www.') ? 'es' : url.hostname.split('.')[0];
      const path = url.hostname.endsWith('.pages.dev') ? (match?.[2] ?? url.pathname) : url.pathname;
      return { url, language, path, key: request.method + ':' + language + ':' + path + url.search };
    };
    const makeHandler = () => async request => {
      const row = parse(request);
      rendererCalls.set(row.key, (rendererCalls.get(row.key) ?? 0) + 1);
      if (request.headers.has('Cookie') || request.headers.has('Authorization')
        || request.headers.has('X-PLL-Template-Request') || request.headers.has('X-PLL-HTML-Template'))
        throw Error('Thin frontend forwarded private/internal headers');
      if (row.path.startsWith('/_/')) {
        const body = request.method === 'POST' ? await request.text() : '';
        return new Response(JSON.stringify({ search: 'unchanged', method: request.method, body }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed.', {
        status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' },
      });
      if (row.path === '/nuestros-servicios/crear-empresa-en-panama') return new Response(null, {
        status: 301, headers: { Location: 'https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama', 'Cache-Control': 'no-store' },
      });
      if (row.path === '/missing') return new Response('Not found.', { status: 404, headers: { 'Cache-Control': 'no-store' } });
      if (row.path === '/sobre-nosotros') return new Response('Temporary.', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } });
      const target = new URL('https://memory-fixture.invalid/source');
      target.searchParams.set('language', row.language); target.searchParams.set('path', row.path);
      const response = await fetch(target);
      originCalls.set(row.key, (originCalls.get(row.key) ?? 0) + 1);
      const headers = new Headers(response.headers);
      headers.set('X-PLL-Template-Future', 'never public');
      if (row.url.hostname.endsWith('.pages.dev')) headers.set('X-Robots-Tag', 'noindex, nofollow');
      if (row.path === '/contacto') headers.set('Content-Security-Policy', "default-src 'self';script-src 'nonce-${scriptNonce}'");
      return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers });
    };
    const Core = createRendererClass(DurableObject, makeHandler, { cacheMode: ${JSON.stringify(mode)} });
    export class TestRenderer extends Core {
      constructor(ctx, env) { super(ctx, env); this.calls = 0; }
      async fetch(request) {
        this.calls += 1;
        const row = parse(request), response = await super.fetch(request), headers = new Headers(response.headers);
        headers.set('X-Test-DO-Calls', String(this.calls));
        headers.set('X-Test-Render-Calls', String(rendererCalls.get(row.key) ?? 0));
        headers.set('X-Test-Origin-Calls', String(originCalls.get(row.key) ?? 0));
        return new Response(response.body, { status: response.status, headers });
      }
    }
    export default { fetch: request => backendNotFound(request.method) };
  `, resolveDir: fileURLToPath(new URL('../', import.meta.url)), sourcefile: 'memory-native-backend.js' },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022',
    external: ['cloudflare:workers'], define: { __PLL_HERO_PRIORITY__: 'false' } });
  const frontend = await build({ stdin: { contents: `export { default } from './src/frontend.js';`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)), sourcefile: 'memory-native-frontend.js' },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  return { backend: backend.outputFiles[0].text, frontend: frontend.outputFiles[0].text };
}

async function runtimeFor(mode) {
  const scripts = await bundles(mode);
  const observed = [];
  const runtime = new Miniflare({ compatibilityDate: '2026-07-30', workers: [
    { name: 'frontend', modules: true, script: scripts.frontend, compatibilityDate: '2026-07-30',
      durableObjects: { PLL_RENDERER: { className: 'TestRenderer', scriptName: 'memory-renderer', useSQLite: true } },
      outboundService() { assert.fail('Frontend must not access an external origin'); } },
    { name: 'memory-renderer', modules: true, script: scripts.backend, compatibilityDate: '2026-07-30',
      bindings: { PLL_IMAGE_FORMAT: 'off', PLL_CSS_STATIC: 'off' }, versionMetadata: 'CF_VERSION_METADATA',
      outboundService(request) {
        const url = new URL(request.url);
        assert.equal(url.origin, 'https://memory-fixture.invalid'); assert.equal(url.pathname, '/source');
        assert.equal(request.method, 'GET'); assert.equal(request.headers.has('Cookie'), false);
        assert.equal(request.headers.has('Authorization'), false);
        const language = url.searchParams.get('language'), path = url.searchParams.get('path');
        assert.ok(languages.includes(language)); observed.push({ language, path });
        return new Response(fixture(language, path), { headers: {
          'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': csp,
          Vary: vary, 'X-Preserved': 'exact', 'Report-To': '{"group":"security"}', NEL: '{"max_age":300}',
        } });
      } },
  ] });
  return { runtime, observed };
}

function publicHeaders(response, state) {
  assert.equal(response.headers.get('X-PLL-HTML-Cache'), state, JSON.stringify({
    status: response.status, expectedCache: state, doCalls: response.headers.get('X-Test-DO-Calls'),
    renderCalls: response.headers.get('X-Test-Render-Calls'), originCalls: response.headers.get('X-Test-Origin-Calls'),
    backendVersion: response.headers.get('X-PLL-Backend-Version'),
  }));
  if (state === 'HIT') assert.equal(response.headers.get('X-PLL-HTML-Cache-Source'), 'memory');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  for (const [name] of response.headers) assert.equal(/^x-pll-(?:html-)?template/iu.test(name), false, name);
  assert.equal(response.headers.get('X-PLL-RendererSha256'), RENDERER_SHA256);
}

async function get(runtime, url, init = {}) {
  const response = await runtime.dispatchFetch(url, { redirect: 'manual', ...init });
  const text = await response.text();
  return { response, text };
}

test('native memory cache uses one origin/render per URL across all four hosts', async () => {
  const { runtime, observed } = await runtimeFor('all');
  let calls = 0;
  try {
    for (const language of languages) for (const path of ['/', paths[language]]) {
      const url = origin(language) + path;
      const first = await get(runtime, url, { headers: { Cookie: 'analytics=private', Authorization: 'discard', 'X-PLL-Template-Request': 'v1' } });
      calls += 1; publicHeaders(first.response, 'MISS');
      assert.equal(first.response.headers.get('X-Test-DO-Calls'), String(calls));
      assert.equal(first.text, fixture(language, path));
      const second = await get(runtime, url);
      calls += 1; publicHeaders(second.response, 'HIT');
      assert.equal(second.response.headers.get('X-Test-DO-Calls'), String(calls));
      assert.equal(second.response.headers.get('X-Test-Render-Calls'), '1');
      assert.equal(second.response.headers.get('X-Test-Origin-Calls'), '1');
      const before = normalize(first.text, first.response.headers.get('Content-Security-Policy'));
      const after = normalize(second.text, second.response.headers.get('Content-Security-Policy'));
      assert.equal(after.body, before.body); assert.equal(after.csp, before.csp);
      assert.notEqual(after.script, before.script); assert.notEqual(after.style, before.style);
      assert.equal(second.response.headers.get('Vary'), vary);
      assert.equal(second.response.headers.get('X-Preserved'), 'exact');
      assert.equal(second.response.headers.get('Report-To'), '{"group":"security"}');
      assert.equal(second.response.headers.get('NEL'), '{"max_age":300}');
      assert.ok(Number(second.response.headers.get('X-PLL-HTML-Cache-Age')) >= 0);
    }
    assert.equal(observed.length, 8);
    const another = await get(runtime, origin('es') + '/');
    publicHeaders(another.response, 'HIT');
    assert.equal(another.response.headers.get('X-Test-Render-Calls'), '1');
    assert.equal(another.response.headers.get('X-Test-Origin-Calls'), '1');
    assert.equal(digest(normalize(another.text, another.response.headers.get('Content-Security-Policy')).body),
      digest(normalize(fixture('es', '/'), csp).body));
    assert.equal(observed.length, 8);
  } finally { await runtime.dispose(); }
});

test('native bypass preserves queries, HEAD, search, form methods, redirects, errors and incompatible CSP', async () => {
  const { runtime, observed } = await runtimeFor('all');
  const cases = [
    { url: origin('es') + '/?utm_source=test', status: 200 },
    { url: origin('es') + '/', init: { method: 'HEAD' }, status: 200, body: '' },
    { url: origin('en') + '/_/view/search/panamalegallab.com/panamlegallab-en', init: {
      method: 'POST', body: 'f.req=technical-test', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, status: 200, body: JSON.stringify({ search: 'unchanged', method: 'POST', body: 'f.req=technical-test' }) },
    { url: origin('es') + '/contacto', init: { method: 'POST', body: 'technical-test' }, status: 405, body: 'Method not allowed.' },
    { url: origin('es') + '/nuestros-servicios/crear-empresa-en-panama', status: 301, body: '' },
    { url: origin('es') + '/missing', status: 404, body: 'Not found.' },
    { url: origin('es') + '/sobre-nosotros', status: 503, body: 'Temporary.' },
    { url: origin('es') + '/contacto', status: 200 },
  ];
  try {
    for (const row of cases) for (let count = 1; count <= 2; count += 1) {
      const { response, text } = await get(runtime, row.url, row.init);
      publicHeaders(response, 'BYPASS'); assert.equal(response.status, row.status);
      assert.equal(response.headers.get('X-Test-Render-Calls'), String(count));
      if (row.body !== undefined) assert.equal(text, row.body);
      if (row.status === 301) assert.equal(response.headers.get('Location'), origin('es') + '/nuestros-servicios-en-panama/crear-empresa-en-panama');
      if (row.status === 405) assert.equal(response.headers.get('Allow'), 'GET, HEAD');
      if (row.status === 503) assert.equal(response.headers.get('Retry-After'), '60');
    }
    assert.equal(observed.length, 6, 'two query, two HEAD and two incompatible-CSP origin fetches');
  } finally { await runtime.dispose(); }
});

test('native preview mode is isolated from public hosts and other preview aliases', async () => {
  const { runtime, observed } = await runtimeFor('preview');
  try {
    for (const language of languages) {
      const url = `${preview}/${language}/`;
      const first = await get(runtime, url), second = await get(runtime, url);
      publicHeaders(first.response, 'MISS'); publicHeaders(second.response, 'HIT');
      assert.equal(second.response.headers.get('X-Test-Render-Calls'), '1');
      assert.equal(second.response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
      const before = normalize(first.text, first.response.headers.get('Content-Security-Policy'));
      const after = normalize(second.text, second.response.headers.get('Content-Security-Policy'));
      assert.equal(after.body, before.body); assert.equal(after.csp, before.csp);
    }
    for (const url of [origin('es') + '/', 'https://other.pll-seo-preview-20261102.pages.dev/es/']) {
      const before = observed.length;
      for (let n = 0; n < 2; n += 1) publicHeaders((await get(runtime, url)).response, 'BYPASS');
      assert.equal(observed.length - before, 2);
    }
  } finally { await runtime.dispose(); }
});

test('native off and invalid modes leave the original delivery path active', async () => {
  for (const mode of ['off', 'invalid']) {
    const { runtime, observed } = await runtimeFor(mode);
    try {
      for (let n = 0; n < 2; n += 1) {
        const { response, text } = await get(runtime, origin('it') + '/');
        publicHeaders(response, 'BYPASS'); assert.equal(text, fixture('it', '/'));
      }
      assert.equal(observed.length, 2);
    } finally { await runtime.dispose(); }
  }
});
