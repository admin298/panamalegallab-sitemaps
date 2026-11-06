import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {HERO_NONCE,HERO_URL,HERO_ESCAPED,heroDocument} from './fixtures/hero-width-fixtures.js';
const languages=['es','en','fr','it'];
const origin=lang=>`https://${lang==='es'?'www':lang}.panamalegallab.com`;
const csp=`script-src 'nonce-${HERO_NONCE}'`;
async function runtime(){
  const fixtures=Object.fromEntries(languages.map(language=>[language,{
    normal:heroDocument({language}),top:heroDocument({language,position:'top center'}),
    bottom:heroDocument({language,position:'bottom center'}),decorative:heroDocument({language,role:null}),
    noPhoto:heroDocument({language,noPhoto:true}),unknownRole:heroDocument({language,role:'button'}),
    badScript:heroDocument({language}).replace('new Image()','new Other()'),
    moduleScript:heroDocument({language}).replace('<script nonce=','<script type="module" nonce='),
    template:heroDocument({language}).replace('<body>','<body><template></template>'),
  } ]));
  const built=await build({stdin:{contents:`import {withCssStatic} from './src/css-static.js';
    const fixtures=${JSON.stringify(fixtures)};
    export default {async fetch(request,env){const q=new URL(request.url).searchParams,language=q.get('fixture')||'es';
      const source=fixtures[language][q.get('case')||'normal'];let parses=0;
      class Counted{constructor(){parses++;this.r=new HTMLRewriter();}on(...args){this.r.on(...args);return this;}transform(response){return this.r.transform(response);}}
      const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':q.get('csp')||${JSON.stringify(csp)},'ETag':'old','X-Keep':'yes'};
      const before=new Response(request.method==='HEAD'?null:source,{headers});
      const out=await withCssStatic(before,request,{...env,PLL_HERO_WIDTH:q.get('mode')||'all'},{Rewriter:Counted});
      const h=new Headers(out.headers);h.set('X-Test-Parses',String(parses));return new Response(out.body,{headers:h,status:out.status});
    }};`,resolveDir:fileURLToPath(new URL('../',import.meta.url)),sourcefile:'hero-width-native-fixture.js'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  return new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-07-30',
    outboundService(){assert.fail('No external request permitted');}});
}

test('one native parse changes only two matched URL widths on mobile in four languages and all header variants',async()=>{
  const mf=await runtime();try{for(const language of languages)for(const name of ['normal','top','bottom','decorative']){
    const response=await mf.dispatchFetch(origin(language)+'/?fixture='+language+'&case='+name,{headers:{'X-PLL-Mobile':'1'}});
    const expected=heroDocument({language,position:name==='top'?'top center':name==='bottom'?'bottom center':'center center',role:name==='decorative'?null:'img'})
      .replace(HERO_URL,HERO_URL.replace('=w16383','=w1280')).replace(HERO_ESCAPED,HERO_ESCAPED.replace('\\x3dw16383','\\x3dw1280'));
    assert.equal(await response.text(),expected);assert.equal(response.headers.get('X-Test-Parses'),'1');
    assert.equal(response.headers.get('X-PLL-Hero-Width-Policy'),'mobile-header-1280-v1-'+language);
    assert.equal(response.headers.get('Content-Security-Policy'),csp);assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.equal(response.headers.has('ETag'),false);assert.equal(response.headers.get('X-Keep'),'yes');
  }}finally{await mf.dispose();}
});

test('desktop/off/HEAD/unknown paths/search remain original; no-photo and unsafe contracts are noops',async()=>{
  const mf=await runtime();try{
    for(const [path,options]of [['/',{}],['/?mode=off',{headers:{'X-PLL-Mobile':'1'}}],['/?mode=invalid',{headers:{'X-PLL-Mobile':'1'}}],['/unknown',{headers:{'X-PLL-Mobile':'1'}}],['/_/search?q=a',{headers:{'X-PLL-Mobile':'1'}}]]){
      const response=await mf.dispatchFetch(origin('es')+path,options);assert.equal(await response.text(),heroDocument());
      assert.equal(response.headers.get('X-Test-Parses'),'0');assert.equal(response.headers.has('X-PLL-Hero-Width-Policy'),false);
    }
    const head=await mf.dispatchFetch(origin('es')+'/',{method:'HEAD',headers:{'X-PLL-Mobile':'1'}});assert.equal(await head.text(),'');assert.equal(head.headers.get('X-Test-Parses'),'0');
    for(const name of ['noPhoto','unknownRole','badScript','moduleScript','template']){
      const response=await mf.dispatchFetch(origin('es')+'/?case='+name,{headers:{'X-PLL-Mobile':'1'}});
      assert.equal(response.headers.has('X-PLL-Hero-Width-Policy'),false);
      const text=await response.text();assert.equal(text.includes('=w1280'),false);assert.equal(text.includes('\\x3dw1280'),false);
    }
    for(const policy of ["script-src 'none'",csp+";script-src-elem 'none'",csp+";style-src 'none'"]){
      const response=await mf.dispatchFetch(origin('es')+'/?csp='+encodeURIComponent(policy),{headers:{'X-PLL-Mobile':'1'}});
      assert.equal(await response.text(),heroDocument());assert.equal(response.headers.has('X-PLL-Hero-Width-Policy'),false);
    }
  }finally{await mf.dispose();}
});
