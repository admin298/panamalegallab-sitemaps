import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { CURRENT_VIEW_SCRIPTS } from '../renderer/src/current-config-contract.js';
import { SITES } from '../renderer/vendor/logic.js';

const preview = 'https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const requestUrl = (language, scenario = 'valid') => SITES[language].productionOrigin + '/?case=' + scenario;
// Never let the test driver follow the production safety redirect outside the
// isolate: outboundService only intercepts requests made inside that isolate.
const dispatch = (mf, url, init = {}) => mf.dispatchFetch(url, { ...init, redirect: 'manual' });

async function runtime() {
  const contents = `import {createDeliveryHandler} from './renderer/src/worker.js';
    const views=${JSON.stringify(CURRENT_VIEW_SCRIPTS)},sites=${JSON.stringify(SITES)};
    const nonce='FixtureNonce123';
    function source(upstream,scenario,language){
      const length=scenario.startsWith('legacy')?518:scenario==='unknown-length'?520:519;
      const config=Array.from({length},(_,i)=>i===212?0:i===316?upstream:i>=514?0:null);
      const values=scenario==='wrong-tail'?config.with(518,1):scenario==='wrong-redirect'?config.with(316,'https://example.invalid/')
        :scenario==='wrong-flag'?config.with(212,1):config;
      const configNonce=scenario==='missing-config-nonce'?'':' nonce="'+(scenario==='bad-config-nonce'?'bad':nonce)+'"';
      const tag='<script'+configNonce+(scenario==='bad-config-type'?' type="application/json"':'')+'>_at_config = '+JSON.stringify(values)+';window.afterConfig="preserved";</script>';
      const url=scenario==='wrong-language'?views[language==='en'?'fr':'en']
        :scenario==='unknown-bundle'?views[language].replace('/m=view','/m=unknown'):views[language];
      const script='<script src="'+url+'" nonce="'+(scenario==='bad-view-nonce'?'OtherNonce456':nonce)+'"'
        +(scenario==='bad-view-type'?' type="module"':'')+'></script>';
      const view=['missing-bundle','legacy-no-bundle'].includes(scenario)?'':script+(scenario==='duplicate-bundle'?script:'');
      return '<!doctype html><html><head><meta charset="utf-8">'+tag+(scenario==='duplicate-config'?tag:'')+view
        +'<script nonce="'+nonce+'">window.afterView="preserved";</script></head><body>'
        +'<div data-domain="panamalegallab.com" data-sitename="'+sites[language].upstreamPrefix.split('/').at(-1)+'"></div>'
        +'<h1>Public source</h1><p>Unchanged content</p></body></html>';
    }
    export default {async fetch(request){
      const u=new URL(request.url),scenario=u.searchParams.get('case')||'valid';
      const language=u.hostname===new URL(${JSON.stringify(preview)}).hostname?u.pathname.split('/')[1]
        :Object.values(sites).find(site=>site.productionHost===u.hostname)?.language;
      const handler=createDeliveryHandler({fetchImpl:async(upstream,init)=>{
        if(init.method!=='GET'||init.redirect!=='manual'||init.headers['Accept-Language']!==language)throw new Error('Unexpected source request');
        return new Response(source(upstream,scenario,language),{headers:{'Content-Type':'text/html; charset=utf-8',
          'Content-Security-Policy':"script-src 'nonce-"+nonce+"'",'X-Fixture':'preserved'}});
      }});
      return handler(request);
    }};`;
  const bundled = await build({ stdin: { contents, resolveDir: fileURLToPath(new URL('../', import.meta.url)),
    sourcefile: 'compatibility-native-fixture.js' }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  return new Miniflare({ modules: true, script: bundled.outputFiles[0].text, compatibilityDate: '2026-07-30',
    outboundService() { assert.fail('No external requests allowed'); } });
}

test('native519 serves four public languages and finite preview with canonical, CSP and original suffix preserved', async () => {
  const mf = await runtime();
  try {
    for (const language of ['es', 'en', 'fr', 'it']) {
      for (const url of [requestUrl(language), preview + '/' + language + '/?case=valid']) {
        const response = await dispatch(mf, url), body = await response.text();
        assert.equal(response.status, 200, url);
        assert.equal(response.headers.get('X-PLL-Delivery'), null);
        assert.equal(response.headers.get('Location'), null);
        assert.equal(response.headers.get('Content-Security-Policy'), "script-src 'nonce-FixtureNonce123'");
        assert.equal(response.headers.get('X-Fixture'), 'preserved');
        assert.match(body, new RegExp('rel="canonical" href="' + SITES[language].productionOrigin + '/"'));
        assert.ok(body.includes('window.afterConfig="preserved";'));
        assert.ok(body.includes('window.afterView="preserved";'));
        assert.ok(body.includes('<p>Unchanged content</p>'));
        const config = JSON.parse(/_at_config\s*=\s*(\[[\s\S]*?\]);window\.afterConfig/.exec(body)[1]);
        assert.equal(config.length, 519); assert.equal(config[316], null); assert.equal(config[518], 0);
        assert.equal(response.headers.get('X-Robots-Tag'), url.startsWith(preview) ? 'noindex, nofollow' : null);
      }
      const head = await dispatch(mf, requestUrl(language), { method: 'HEAD' });
      assert.equal(head.status, 200); assert.equal(await head.text(), '');
    }
  } finally { await mf.dispose(); }
});

test('native519 unreviewed bundle, language, nonce, shape and duplicates retain safe public fallback', async () => {
  const mf = await runtime();
  try {
    for (const scenario of ['missing-bundle', 'unknown-bundle', 'wrong-language', 'duplicate-bundle',
      'bad-config-nonce', 'missing-config-nonce', 'bad-view-nonce', 'bad-config-type', 'bad-view-type',
      'duplicate-config', 'wrong-tail', 'unknown-length', 'wrong-redirect', 'wrong-flag']) {
      const url = requestUrl('es', scenario), response = await dispatch(mf, url);
      assert.equal(response.status, 302, scenario);
      assert.equal(response.headers.get('X-PLL-Delivery'), 'google-source-fallback', scenario);
      assert.equal(response.headers.get('Location'), SITES.es.upstreamRoot + '/?case=' + scenario);
      assert.equal(await response.text(), '');
    }
    for (const scenario of ['legacy', 'legacy-no-bundle']) {
      const legacy = await dispatch(mf, requestUrl('fr', scenario));
      assert.equal(legacy.status, 200); await legacy.text();
    }
  } finally { await mf.dispose(); }
});
