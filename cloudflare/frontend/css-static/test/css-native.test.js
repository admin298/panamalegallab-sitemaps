import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { withCssStatic, CSS_NATIVE_URL, CSS_ASSET_PATH } from '../src/css-static.js';

const nonce = 'ValidNonce123';
const scriptCsp = `script-src 'nonce-${nonce}'`;
const preview = 'https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const languages = ['es', 'en', 'fr', 'it'];
const origin = language => `https://${language === 'es' ? 'www' : language}.panamalegallab.com`;
const siteName = language => language === 'es' ? 'panamalegallab' : `panamlegallab-${language}`;
const link = `<link nonce="LinkNonce456" rel="stylesheet" href="${CSS_NATIVE_URL}" data-id="_cl">`;

function source(language, name = 'normal') {
  const html = '<!doctype html><html><head><meta charset="utf-8">' + link
    + `<script nonce="${nonce}">window.unrelated="Panamá, français, società 😀";</script>`
    + '</head><body><div data-domain="panamalegallab.com"'
    + ` data-sitename="${siteName(language)}"></div><p>Fresh CMS content</p></body></html>`;
  const variants = {
    normal: html,
    bom: '\ufeff' + html,
    preservedAttrs: html.replace(link, `<LINK nonce='LinkNonce456' REL='stylesheet' HREF='${CSS_NATIVE_URL}' DATA-ID='_cl' media="all" crossorigin="anonymous" fetchpriority="high">`),
    missingLink: html.replace(link, ''),
    duplicateLink: html.replace(link, link + link),
    duplicateCl: html.replace(link, link + '<link data-id="_cl" rel="stylesheet" href="https://example.invalid/unrelated.css">'),
    unknownVersion: html.replace(CSS_NATIVE_URL, CSS_NATIVE_URL + '/next'),
    wrongOrigin: html.replace(CSS_NATIVE_URL, CSS_NATIVE_URL.replace('www.gstatic.com', 'evil.invalid')),
    wrongRel: html.replace('rel="stylesheet"', 'rel="preload"'),
    noDataId: html.replace(' data-id="_cl"', ''),
    missingHref: html.replace(` href="${CSS_NATIVE_URL}"`, ''),
    duplicateHref: html.replace('rel="stylesheet"', 'href="https://example.invalid/first.css" rel="stylesheet"'),
    hrefInBody: html.replace(link, '').replace('</body>', link + '</body>'),
    hrefInComment: html.replace(link, '<!--' + link + '-->'),
    hrefInScript: html.replace(link, `<script nonce="${nonce}">window.link=${JSON.stringify(link)};</script>`),
    wrongDomain: html.replace('data-domain="panamalegallab.com"', 'data-domain="other.invalid"'),
    wrongSite: html.replace(`data-sitename="${siteName(language)}"`, 'data-sitename="other-site"'),
    duplicateMarker: html.replace('</body>', `<div data-domain="panamalegallab.com" data-sitename="${siteName(language)}"></div></body>`),
    missingMarker: html.replace('data-domain="panamalegallab.com"', 'data-other="panamalegallab.com"'),
    missingCharset: html.replace('<meta charset="utf-8">', ''),
    wrongCharset: html.replace('<meta charset="utf-8">', '<meta charset="windows-1252">'),
    duplicateCharset: html.replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta charset="utf-8">'),
    base: html.replace('</head>', '<base href="https://example.invalid/"></head>'),
    metaCsp: html.replace('</head>', '<meta http-equiv="Content-Security-Policy" content="style-src https://www.gstatic.com"></head>'),
    missingNonce: html.replace(` nonce="${nonce}"`, ''),
    conflictingNonce: html.replace('</head>', '<script nonce="DifferentNonce123">window.other=1;</script></head>'),
    invalidNonce: html.replace(`nonce="${nonce}"`, 'nonce="short"'),
    unnoncedInline: html.replace('</head>', '<script>window.other=1;</script></head>'),
    duplicateHead: html.replace('<head>', '<head><head>'),
    malformedHead: html.replace('<head>', '<head data-test="unterminated>'),
    headString: html.replace('</head>', `<script nonce="${nonce}">window.fake="<head>";</script></head>`),
  };
  return variants[name];
}

const rejected = ['missingLink', 'duplicateLink', 'duplicateCl', 'unknownVersion', 'wrongOrigin',
  'wrongRel', 'noDataId', 'missingHref', 'duplicateHref', 'hrefInBody', 'hrefInComment', 'hrefInScript',
  'wrongDomain', 'wrongSite', 'duplicateMarker', 'missingMarker', 'missingCharset', 'wrongCharset',
  'duplicateCharset', 'base', 'metaCsp', 'missingNonce', 'conflictingNonce', 'invalidNonce',
  'unnoncedInline', 'duplicateHead', 'malformedHead', 'headString'];

async function bundle() {
  const fixtures = Object.fromEntries(languages.map(language => [language,
    Object.fromEntries(['normal', 'bom', 'preservedAttrs', ...rejected].map(name => [name, source(language, name)]))]));
  const bundled = await build({ stdin: {
    contents: `import {withCssStatic} from './src/css-static.js';
      const fixtures=${JSON.stringify(fixtures)};
      export default {async fetch(request,env){
        const query=new URL(request.url).searchParams;
        const language=query.get('fixture')||'es';
        const source=fixtures[language][query.get('case')||'normal'];
        const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
          'Content-Security-Policy':query.get('csp')||${JSON.stringify(scriptCsp)},
          'X-Existing':'preserved','ETag':'"native"','Digest':'sha-256=native',
          'Content-MD5':'native','Content-Digest':'sha-256=:native:','Repr-Digest':'sha-256=:native:'};
        const response=await withCssStatic(new Response(request.method==='HEAD'?null:new TextEncoder().encode(source),
          {status:200,headers}),request,env);
        const capture=new Headers(response.headers);
        capture.set('X-Test-App-Headers',encodeURIComponent(JSON.stringify([...response.headers])));
        return new Response(response.body,{status:response.status,headers:capture});
      }};`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)), sourcefile: 'css-native-synthetic.js',
  }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  return bundled.outputFiles[0].text;
}

function assertChanged(bytes, language, name) {
  const actual = bytes.toString('utf8');
  const fallbacks = actual.match(/<script nonce="ValidNonce123" data-pll-css-fallback="v1">[\s\S]*?<\/script>/gu);
  assert.equal(fallbacks?.length, 1, 'one nonce-authorized CSS fallback');
  assert.ok(actual.indexOf(fallbacks[0]) === actual.indexOf('<head>') + '<head>'.length,
    'CSS recovery listener is installed before stylesheet parsing');
  assert.equal(actual.split(CSS_ASSET_PATH).length - 1 >= 1, true);
  const remaining = actual.replace(fallbacks[0], '');
  assert.equal(remaining, source(language, name).replace(CSS_NATIVE_URL, CSS_ASSET_PATH));
  assert.deepEqual(Buffer.from(remaining.replace(CSS_ASSET_PATH, CSS_NATIVE_URL)), Buffer.from(source(language, name)),
    'all original bytes, attributes, their order, link nonce, scripts and Unicode remain exact');
}

test('native CSS inspection keeps all four languages byte exact except the pinned href and fallback', async () => {
  assert.equal(typeof withCssStatic, 'function');
  const script = await bundle();
  for (const mode of ['off', 'preview', 'all']) {
    const runtime = new Miniflare({ modules: true, script, compatibilityDate: '2026-07-30',
      bindings: { PLL_CSS_STATIC: mode }, outboundService() { assert.fail('CSS tests prohibit external requests.'); } });
    try {
      for (const language of languages) {
        for (const name of ['normal', 'bom', 'preservedAttrs']) {
          for (const canary of [false, true]) {
            const url = (canary ? preview + '/' + language : origin(language))
              + '/?fixture=' + language + '&case=' + name;
            const response = await runtime.dispatchFetch(url);
            const enabled = mode === 'all' || (mode === 'preview' && canary);
            const headers = new Headers(JSON.parse(decodeURIComponent(response.headers.get('X-Test-App-Headers'))));
            assert.equal(headers.get('X-PLL-CSS-Policy'), enabled ? 'static-exact-v1-' + language : null,
              `${mode} ${language} ${name} ${canary}`);
            assert.equal(headers.get('Content-Security-Policy'), scriptCsp);
            assert.equal(headers.get('Cache-Control'), 'no-store');
            assert.equal(headers.get('X-Existing'), 'preserved');
            for (const stale of ['ETag', 'Digest', 'Content-MD5', 'Content-Digest', 'Repr-Digest']) {
              assert.equal(headers.has(stale), !enabled, stale);
            }
            const bytes = Buffer.from(await response.arrayBuffer());
            if (enabled) assertChanged(bytes, language, name);
            else assert.deepEqual(bytes, Buffer.from(source(language, name)));
          }
        }
        for (const [canary, control] of [[true, true], [false, true]]) {
          const response = await runtime.dispatchFetch((canary ? preview + '/' + language : origin(language))
            + '/?fixture=' + language + '&_pll_speed=control&PLL_CSS_STATIC=all');
          const enabled = !canary && mode === 'all';
          assert.equal(response.headers.get('X-PLL-CSS-Policy'), enabled ? 'static-exact-v1-' + language : null);
          const bytes = Buffer.from(await response.arrayBuffer());
          if (enabled) assertChanged(bytes, language, 'normal');
          else assert.deepEqual(bytes, Buffer.from(source(language)));
        }
        const head = await runtime.dispatchFetch(origin(language) + '/?fixture=' + language, { method: 'HEAD' });
        assert.equal(head.headers.get('X-PLL-CSS-Policy'), null);
        assert.equal((await head.arrayBuffer()).byteLength, 0);
      }
    } finally { await runtime.dispose(); }
  }
});

test('native CSS inspection fails soft for ambiguous HTML, CSP and stylesheet identity', async () => {
  const runtime = new Miniflare({ modules: true, script: await bundle(), compatibilityDate: '2026-07-30',
    bindings: { PLL_CSS_STATIC: 'all' }, outboundService() { assert.fail('CSS tests prohibit external requests.'); } });
  try {
    for (const language of languages) {
      for (const name of rejected) {
        const response = await runtime.dispatchFetch(origin(language) + '/?fixture=' + language + '&case=' + name);
        assert.equal(response.headers.get('X-PLL-CSS-Policy'), null, language + ' ' + name);
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(source(language, name)), language + ' ' + name);
      }
    }
    for (const csp of [
      scriptCsp + "; style-src 'self'", scriptCsp + "; style-src-elem 'self'", scriptCsp + "; default-src 'self'",
      "script-src 'none'", "script-src 'nonce-DifferentNonce123'", scriptCsp + ', script-src https:',
      scriptCsp + "; sandbox", scriptCsp + "; script-src 'nonce-ValidNonce123'",
    ]) {
      const url = new URL(origin('es') + '/?fixture=es'); url.searchParams.set('csp', csp);
      const response = await runtime.dispatchFetch(url);
      assert.equal(response.headers.get('X-PLL-CSS-Policy'), null, csp);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(source('es')));
      assert.equal(response.headers.get('Content-Security-Policy'), csp);
    }
  } finally { await runtime.dispose(); }
});
