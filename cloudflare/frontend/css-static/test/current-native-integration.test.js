import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { currentDocument, currentScript, currentOrigin, CURRENT_NONCE, CURRENT_CSS_URL, CURRENT_CSS_PATH }
  from './fixtures/current-native-fixtures.js';

test('current CSS and native impression policies compose in one native parse for four languages with no outbound work', async () => {
  const fixtures = Object.fromEntries(['es', 'en', 'fr', 'it'].map(lang => [lang, currentDocument(lang)]));
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Security-Policy': `script-src 'nonce-${CURRENT_NONCE}'` };
  const built = await build({ stdin: { contents: `import {withCssStatic} from './src/css-static.js';
    const fixtures=${JSON.stringify(fixtures)},headers=${JSON.stringify(headers)};
    export default {async fetch(request,env){const lang=new URL(request.url).searchParams.get('fixture');let parses=0;
      class Counted{constructor(){parses++;this.r=new HTMLRewriter();}on(...args){this.r.on(...args);return this;}transform(response){return this.r.transform(response);}}
      const out=await withCssStatic(new Response(fixtures[lang],{headers}),request,env,{Rewriter:Counted});
      const after=new Headers(out.headers);after.set('X-Test-Parses',String(parses));return new Response(out.body,{status:out.status,headers:after});
    }};`, resolveDir: fileURLToPath(new URL('../', import.meta.url)), sourcefile: 'current-native-integration.js' },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  const runtime = new Miniflare({ modules: true, script: built.outputFiles[0].text, compatibilityDate: '2026-07-30',
    bindings: { PLL_NATIVE_IMPRESSIONS: 'all', PLL_CSS_STATIC: 'all' },
    outboundService() { assert.fail('No outbound request permitted'); } });
  try {
    for (const lang of ['es', 'en', 'fr', 'it']) {
      const response = await runtime.dispatchFetch(currentOrigin(lang) + '/?fixture=' + lang);
      const actual = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await response.arrayBuffer());
      assert.equal(response.headers.get('X-Test-Parses'), '1');
      assert.equal(response.headers.get('X-PLL-CSS-Policy'), 'static-exact-v1-' + lang);
      assert.equal(response.headers.get('X-PLL-Impression-Policy'), 'native-noop-v1-' + lang);
      assert.equal(response.headers.get('Content-Security-Policy'), headers['Content-Security-Policy']);
      const withoutFallback = actual.replace(new RegExp('<script nonce="' + CURRENT_NONCE + '" data-pll-css-fallback="v1">[\\s\\S]*?<\\/script>', 'u'), '');
      assert.equal(withoutFallback, currentDocument(lang, { script: currentScript(true) }).replace(CURRENT_CSS_URL, CURRENT_CSS_PATH));
    }
  } finally { await runtime.dispose(); }
});
