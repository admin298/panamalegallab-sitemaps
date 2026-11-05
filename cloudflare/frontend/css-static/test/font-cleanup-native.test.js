import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { INVALID_FONT_URL } from '../src/initial-render.js';
import { impressionDocument, impressionHeaders, origin, IMPRESSION_PREVIEW } from './fixtures/impression-fixtures.js';
import { createRendererClass } from '../src/backend-core.js';

const link=`<link href="${INVALID_FONT_URL}" rel="stylesheet" nonce="StyleNonce456">`;
const source=language=>impressionDocument(language).replace('</head>',link+'</head>');
const readBody=async response=>new TextDecoder('utf-8',{ignoreBOM:true}).decode(await response.arrayBuffer());

async function runtime(mode) {
  const fixtures=Object.fromEntries(['es','en','fr','it'].map(language=>[language,source(language)]));
  const built=await build({stdin:{contents:`import {withCssStatic} from './src/css-static.js';
    const fixtures=${JSON.stringify(fixtures)},headers=${JSON.stringify(impressionHeaders)};
    export default {async fetch(request,env){const q=new URL(request.url).searchParams,lang=q.get('fixture')||'es';
      let source=fixtures[lang],parses=0;
      const link=${JSON.stringify(link)};
      if(q.get('case')==='duplicate')source=source.replace(link,link+link);
      if(q.get('case')==='comment')source=source.replace(link,'<!--'+link+'-->');
      if(q.get('case')==='extra')source=source.replace(link,link.replace(' rel=',' data-unreviewed="value" rel='));
      class Counted {constructor(){parses++;this.r=new HTMLRewriter();}on(...args){this.r.on(...args);return this;}transform(response){return this.r.transform(response);}}
      const out=await withCssStatic(new Response(request.method==='HEAD'?null:source,{headers}),request,env,{Rewriter:Counted});
      const result=new Headers(out.headers);result.set('X-Test-Parsers',String(parses));
      return new Response(out.body,{headers:result,status:out.status});
    }};`,resolveDir:fileURLToPath(new URL('../',import.meta.url)),sourcefile:'font-cleanup-native-fixture.js'},
    bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  return new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-07-30',
    bindings:{PLL_INITIAL_RENDER:mode},outboundService(){assert.fail('No external requests allowed');}});
}

test('native parser removes one exact font link in four languages using one shared parse and unchanged CSP/body remainder',async()=>{
  const mf=await runtime('all');
  try{for(const language of ['es','en','fr','it']){
    const response=await mf.dispatchFetch(origin(language)+'/?fixture='+language);
    assert.equal(await readBody(response),source(language).replace(link,''));
    assert.equal(response.headers.get('X-PLL-Initial-Render-Policy'),'initial-render-v1-'+language);
    assert.equal(response.headers.get('X-Test-Parsers'),'1');
    assert.equal(response.headers.get('Content-Security-Policy'),impressionHeaders['Content-Security-Policy']);
    assert.equal(response.headers.get('X-PLL-CSS-Policy'),null);
    assert.equal(response.headers.get('X-PLL-Impression-Policy'),null);
    for(const name of ['duplicate','comment','extra']){
      const unsupported=await mf.dispatchFetch(origin(language)+'/?fixture='+language+'&case='+name);
      assert.ok((await readBody(unsupported)).includes(INVALID_FONT_URL));
      assert.equal(unsupported.headers.get('X-PLL-Initial-Render-Policy'),null);
    }
  }}finally{await mf.dispose();}
});

test('native preview control and public method isolation preserve original font markup',async()=>{
  const mf=await runtime('preview');
  try{for(const language of ['es','en','fr','it']){
    for(const value of ['candidate','control','unknown']){
      const response=await mf.dispatchFetch(IMPRESSION_PREVIEW+'/'+language+'/?fixture='+language+'&_pll_initial_render='+value);
      assert.equal((await readBody(response)).includes(INVALID_FONT_URL),value!=='candidate');
    }
    const publicPage=await mf.dispatchFetch(origin(language)+'/?fixture='+language+'&PLL_INITIAL_RENDER=all');
    assert.equal(await readBody(publicPage),source(language));
    const head=await mf.dispatchFetch(IMPRESSION_PREVIEW+'/'+language+'/?fixture='+language,{method:'HEAD'});
    assert.equal(head.headers.get('X-PLL-Initial-Render-Policy'),null);
  }}finally{await mf.dispose();}
});

test('renderer template cache isolates font modes from each other and keeps all policy-off cache identities',async()=>{
  class Base {constructor(){}}
  const identities=[];
  const Renderer=createRendererClass(Base,()=>async()=>new Response('native'),{cacheMode:'all',cacheOptions:{
    store:null,certify:async(response,identity)=>{identities.push(identity.revision);return response;},
  }});
  for(const mode of ['off','preview','all']){
    const response=await new Renderer({}, {PLL_NATIVE_IMPRESSIONS:'all',PLL_INITIAL_RENDER:mode}).fetch(new Request(origin('es')+'/'));
    await response.text();
  }
  assert.equal(new Set(identities).size,3);
  assert.equal(identities[0],'pll-html-memory-v1-impressions-v1-all');
  assert.ok(identities[1].endsWith('-initial-v1-preview'));assert.ok(identities[2].endsWith('-initial-v1-all'));
});
