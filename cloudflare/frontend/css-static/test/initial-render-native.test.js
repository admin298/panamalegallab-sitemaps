import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {INVALID_FONT_URL,APP_SCRIPT_BASE,APP_SCRIPT_SANDBOX} from '../src/initial-render.js';
import {HOME_OVERLAY_PROFILES,HOME_SECTION_ID} from '../src/home-overlay.js';
import {impressionDocument,impressionHeaders,origin,IMPRESSION_PREVIEW} from './fixtures/impression-fixtures.js';
import {CACHE_PATHS} from '../src/cache-routes.js';
const frame=lang=>`<iframe jsname="L5Fo6c" class="YMEQtf" sandbox="${APP_SCRIPT_SANDBOX}" frameborder="0" aria-label="Apps Script" src="${APP_SCRIPT_BASE+lang}" allowfullscreen></iframe>`;
const font=`<link href="${INVALID_FONT_URL}" rel="stylesheet" nonce="StyleNonce456">`;
const image=lang=>`<img src="https://lh7-us.googleusercontent.com/sitesv-images-rt/DifferentPublicToken=w1280" class="CENy8b" role="img" alt="${HOME_OVERLAY_PROFILES[lang].alt}">`;
const home=lang=>`<div class="UtePc"><section id="${HOME_SECTION_ID}"><div id="${HOME_OVERLAY_PROFILES[lang].widgetId}">${image(lang)}</div></section></div>`;
const source=lang=>impressionDocument(lang).replace('</head>',font+'</head>').replace('</body>',home(lang)+frame(lang)+'</body>');
const text=async response=>new TextDecoder('utf-8',{ignoreBOM:true}).decode(await response.arrayBuffer());
async function runtime(mode){
  const fixtures=Object.fromEntries(['es','en','fr','it'].map(lang=>[lang,source(lang)]));
  const built=await build({stdin:{contents:`import {withCssStatic} from './src/css-static.js';
    const fixtures=${JSON.stringify(fixtures)},headers=${JSON.stringify(impressionHeaders)};
    export default {async fetch(request,env){const q=new URL(request.url).searchParams,lang=q.get('fixture')||'es';let source=fixtures[lang],parses=0;
      const img=${JSON.stringify(Object.fromEntries(['es','en','fr','it'].map(lang=>[lang,image(lang)])))}[lang],frame=${JSON.stringify(Object.fromEntries(['es','en','fr','it'].map(lang=>[lang,frame(lang)])))}[lang];
      const cases={duplicateImage:()=>source.replace(img,img+img),unknownStyle:()=>source.replace(img,img.replace('>',' style="width:100%">')),
        wrongWidget:()=>source.replace(${JSON.stringify(Object.fromEntries(Object.entries(HOME_OVERLAY_PROFILES).map(([lang,p])=>[lang,p.widgetId])))}[lang],'unknown'),
        laterSection:()=>source.replace('<section','<section id="first"></section><section'),
        duplicateFrame:()=>source.replace(frame,frame+frame),changedSandbox:()=>source.replace('allow-downloads ','')};
      if(cases[q.get('case')])source=cases[q.get('case')]();
      class Counted{constructor(){parses++;this.r=new HTMLRewriter();}on(...args){this.r.on(...args);return this;}transform(response){return this.r.transform(response);}}
      const before={...headers,'Content-Security-Policy':q.get('csp')||headers['Content-Security-Policy']};
      const out=await withCssStatic(new Response(source,{headers:before}),request,env,{Rewriter:Counted});
      const h=new Headers(out.headers);h.set('X-Test-Parses',String(parses));return new Response(out.body,{headers:h,status:out.status});
    }};`,resolveDir:fileURLToPath(new URL('../',import.meta.url)),sourcefile:'initial-render-native-fixture.js'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  return new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-07-30',bindings:{PLL_INITIAL_RENDER:mode},
    outboundService(){assert.fail('No external requests permitted');}});
}

test('native initial policy composes three exact changes in one parse, in four languages, preserving all other bytes/CSP',async()=>{
  const mf=await runtime('all');try{for(const lang of ['es','en','fr','it']){
    const response=await mf.dispatchFetch(origin(lang)+'/?fixture='+lang),actual=await text(response);
    const expected=source(lang).replace(font,'').replace(' allowfullscreen>',' allowfullscreen loading="lazy">')
      .replace(image(lang),image(lang).replace('>',' style="aspect-ratio:auto 1168 / 854">'));
    assert.equal(actual,expected);assert.equal(response.headers.get('X-Test-Parses'),'1');
    assert.equal(response.headers.get('X-PLL-Initial-Render-Policy'),'initial-render-v1-'+lang);
    assert.equal(response.headers.get('X-PLL-Initial-Render-Edits'),'font,lazy-frame,home-ratio');
    assert.equal(response.headers.get('Content-Security-Policy'),impressionHeaders['Content-Security-Policy']);
  }}finally{await mf.dispose();}
});

test('native unknown overlay/frame structures fail independently; restrictive style CSP disables ratio insertion',async()=>{
  const mf=await runtime('all');try{for(const lang of ['es','en','fr','it']){
    for(const name of ['duplicateImage','unknownStyle','wrongWidget','laterSection','duplicateFrame','changedSandbox']){
      const response=await mf.dispatchFetch(origin(lang)+'/?fixture='+lang+'&case='+name);await text(response);
      const edits=response.headers.get('X-PLL-Initial-Render-Edits');assert.ok(edits.includes('font'));
      if(['duplicateFrame','changedSandbox'].includes(name)){assert.equal(edits.includes('lazy-frame'),false);assert.ok(edits.includes('home-ratio'));}
      else{assert.equal(edits.includes('home-ratio'),false);assert.ok(edits.includes('lazy-frame'));}
    }
    const csp=impressionHeaders['Content-Security-Policy']+";style-src 'self'";
    const restricted=await mf.dispatchFetch(origin(lang)+'/?fixture='+lang+'&csp='+encodeURIComponent(csp));
    assert.equal((await text(restricted)).includes('style="aspect-ratio'),false);
    assert.equal(restricted.headers.get('X-PLL-Initial-Render-Edits'),'font,lazy-frame');
    assert.equal(restricted.headers.get('Content-Security-Policy'),csp);
  }}finally{await mf.dispose();}
});

test('native ratio edit is homepage-only and combined control is preview-only with strict known route/mode isolation',async()=>{
  const mf=await runtime('all');try{for(const lang of ['es','en','fr','it']){
    const nonhome=await mf.dispatchFetch(origin(lang)+CACHE_PATHS[lang].find(path=>path!=='/')+'?fixture='+lang);
    assert.equal((await text(nonhome)).includes('style="aspect-ratio'),false);
    assert.equal(nonhome.headers.get('X-PLL-Initial-Render-Edits'),'font,lazy-frame');
    for(const url of [origin(lang)+'/unknown?fixture='+lang,IMPRESSION_PREVIEW+'/'+lang+'/?fixture='+lang+'&_pll_initial_render=control']){
      const control=await mf.dispatchFetch(url);assert.equal(await text(control),source(lang));assert.equal(control.headers.get('X-PLL-Initial-Render-Policy'),null);
    }
    const publicQuery=await mf.dispatchFetch(origin(lang)+'/?fixture='+lang+'&_pll_initial_render=control');await text(publicQuery);
    assert.equal(publicQuery.headers.get('X-PLL-Initial-Render-Edits'),'font,lazy-frame,home-ratio');
    const alias={es:'inicio',en:'home',fr:'accueil',it:'inizio'}[lang];
    const nativeAlias=await mf.dispatchFetch(origin(lang)+'/'+alias+'?fixture='+lang);await text(nativeAlias);
    assert.equal(nativeAlias.headers.get('X-PLL-Initial-Render-Edits'),'font,lazy-frame,home-ratio');
  }}finally{await mf.dispose();}
});
