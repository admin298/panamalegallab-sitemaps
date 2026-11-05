import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { impressionDocument, impressionHeaders, readConfig, origin, VIEW_SCRIPTS, IMPRESSION_PREVIEW } from './fixtures/impression-fixtures.js';

async function nativeRuntime(mode) {
  const fixtures = Object.fromEntries(['es', 'en', 'fr', 'it'].map(language => [language, {
    normal: impressionDocument(language), noCss: impressionDocument(language, { css: false }),
    unknownCss: impressionDocument(language).replace('data-id="_cl"', 'data-id="_cl" integrity="sha256-native"'),
    already: impressionDocument(language, { value: true }),
    wrongBundle: impressionDocument(language, { viewUrl: VIEW_SCRIPTS[language] + '/next' }),
    duplicate: impressionDocument(language).replace('</head>', `<script nonce="ValidNonce123">${'_at_config = ' + JSON.stringify(Array(518).fill(null))};</script></head>`),
    wrongNonce: impressionDocument(language, { nonce: 'DifferentNonce123' }),
  }]));
  const built = await build({ stdin: { contents: `import {withCssStatic} from './src/css-static.js';
    const fixtures=${JSON.stringify(fixtures)},headers=${JSON.stringify(impressionHeaders)};
    export default {async fetch(request,env){
      const q=new URL(request.url).searchParams,lang=q.get('fixture')||'es',source=fixtures[lang][q.get('case')||'normal'];
      let parsers=0;
      class CountedRewriter{constructor(){parsers++;this.value=new HTMLRewriter();}
        on(...args){this.value.on(...args);return this;}transform(response){return this.value.transform(response);}}
      const result=await withCssStatic(new Response(source,{headers}),request,env,{Rewriter:CountedRewriter});
      const out=new Headers(result.headers);out.set('X-Test-Parser-Count',String(parsers));
      return new Response(result.body,{status:result.status,headers:out});
    }};`, resolveDir: fileURLToPath(new URL('../', import.meta.url)), sourcefile: 'native-impressions-synthetic.js' },
  bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  return new Miniflare({ modules: true, script: built.outputFiles[0].text, compatibilityDate: '2026-07-30',
    bindings: { PLL_NATIVE_IMPRESSIONS: mode, PLL_CSS_STATIC: 'all' },
    outboundService() { assert.fail('Native impression tests prohibit external requests.'); } });
}

test('native parser composes both policies in one pass in four languages and preserves all other bootstrap/GA4 bytes', async () => {
  const runtime = await nativeRuntime('all');
  try {
    for (const language of ['es', 'en', 'fr', 'it']) {
      for (const name of ['normal', 'noCss', 'unknownCss', 'already']) {
        const response = await runtime.dispatchFetch(origin(language) + '/?fixture=' + language + '&case=' + name);
        const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await response.arrayBuffer());
        assert.equal(readConfig(text)[356], true, language + ' ' + name);
        assert.equal(response.headers.get('X-PLL-Impression-Policy'), 'native-noop-v1-' + language);
        assert.equal(response.headers.get('X-Test-Parser-Count'), '1');
        assert.equal(response.headers.get('Content-Security-Policy'), impressionHeaders['Content-Security-Policy']);
        if(name==='unknownCss')assert.equal(response.headers.get('X-PLL-CSS-Policy'),null);
        assert.equal((text.match(/G-FNRPN562BY/gu) ?? []).length, 1);
        assert.ok(text.includes('window.dataLayer=window.dataLayer||[];'));
      }
      for (const name of ['wrongBundle', 'duplicate', 'wrongNonce']) {
        const response = await runtime.dispatchFetch(origin(language) + '/?fixture=' + language + '&case=' + name);
        await response.arrayBuffer();
        assert.equal(response.headers.get('X-PLL-Impression-Policy'), null, language + ' ' + name);
        assert.equal(response.headers.get('X-Test-Parser-Count'), '1');
      }
    }
  } finally { await runtime.dispose(); }
});

test('native preview control is logger-only; public routes cannot select it or enable preview mode', async () => {
  const runtime = await nativeRuntime('preview');
  try {
    for (const language of ['es', 'en', 'fr', 'it']) {
      for (const value of ['candidate', 'control', 'unknown', 'control&_pll_native_impressions=candidate']) {
        const response = await runtime.dispatchFetch(IMPRESSION_PREVIEW + '/' + language + '/?fixture=' + language
          + '&_pll_native_impressions=' + value);
        const text = await response.text();
        assert.equal(readConfig(text)[356], value === 'candidate' ? true : null);
        assert.equal(response.headers.get('X-PLL-CSS-Policy'), 'static-exact-v1-' + language);
      }
      const response = await runtime.dispatchFetch(origin(language) + '/?fixture=' + language
        + '&PLL_NATIVE_IMPRESSIONS=all&_pll_native_impressions=candidate');
      assert.equal(readConfig(await response.text())[356], null);
      assert.equal(response.headers.get('X-PLL-Impression-Policy'), null);
    }
  } finally { await runtime.dispose(); }
});
