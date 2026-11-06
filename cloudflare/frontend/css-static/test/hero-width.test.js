import test from 'node:test';
import assert from 'node:assert/strict';
import {heroWidthPolicyEnabled,createHeroWidthInspector,heroWidthDocumentEdits} from '../src/hero-width.js';
import {collectRawTextSpans,elementAttributes,applyTextEdits} from '../src/html-spans.js';
import {planDeliveryRequest} from '../renderer/src/plan.js';
import {CACHE_PATHS} from '../src/cache-routes.js';
import {HERO_NONCE,HERO_URL,HERO_ESCAPED,heroScript,heroTag,heroDocument} from './fixtures/hero-width-fixtures.js';
const preview='https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const origin=lang=>`https://${lang==='es'?'www':lang}.panamalegallab.com`;
function nativeContext(html) {
  const inspector=createHeroWidthInspector(),spans=collectRawTextSpans(html);
  if(!spans)return null;
  for(const match of html.matchAll(/<div\b[^<>]*>/gu)){
    if(spans.some(s=>match.index>=s.start&&match.index<s.end))continue;
    const attrs=elementAttributes(match[0],'div');
    if(attrs?.get('class')?.value.split(/\s+/u).includes('IFuOkc'))
      inspector.background.element({getAttribute:name=>attrs.get(name)?.value??null});
  }
  return inspector.context();
}
const edits=(html,nonce=HERO_NONCE,context=nativeContext(html))=>heroWidthDocumentEdits(html,nonce,collectRawTextSpans(html),context);

test('mobile policy covers exactly252 preferred paths in four languages and isolates modes/preview queries',()=>{
  let count=0;
  for(const [language,paths]of Object.entries(CACHE_PATHS))for(const path of paths){
    const request=new Request(origin(language)+path,{headers:{'X-PLL-Mobile':'1'}});
    assert.equal(heroWidthPolicyEnabled(request,'all',planDeliveryRequest(request.url)),true);count++;
  }
  assert.equal(count,252);
  for(const [url,method,mode,flag]of [[origin('es')+'/','GET',undefined,'1'],[origin('es')+'/','GET','off','1'],[origin('es')+'/','GET','bad','1'],[origin('es')+'/','GET','preview','1'],[origin('es')+'/','HEAD','all','1'],[origin('es')+'/','GET','all','0'],[origin('es')+'/','GET','all',null],[origin('es')+'/inicio','GET','all','1'],[origin('es')+'/unknown','GET','all','1'],[origin('es')+'/_/search?q=a','GET','all','1'],['https://evil.invalid/','GET','all','1'],[preview+'/es/?_pll_hero_width=control','GET','all','1'],[preview+'/es/?_pll_hero_width=candidate&_pll_hero_width=control','GET','all','1'],['https://other.pll-seo-preview-20261102.pages.dev/es/','GET','all','1']]){
    const request=new Request(url,{method,headers:flag?{'X-PLL-Mobile':flag}:{}});
    assert.equal(heroWidthPolicyEnabled(request,mode,planDeliveryRequest(url,method)),false,url);
  }
  for(const url of [preview+'/es/',preview+'/es/?_pll_hero_width=candidate',origin('es')+'/?_pll_hero_width=control&PLL_HERO_WIDTH=off']){
    const request=new Request(url,{headers:{'X-PLL-Mobile':'1'}});
    assert.equal(heroWidthPolicyEnabled(request,'all',planDeliveryRequest(url)),true);
  }
});

test('two URL splices preserve all other bytes, native script logic and three positions, including decorative role',()=>{
  for(const language of ['es','en','fr','it'])for(const position of ['center center','top center','bottom center'])for(const role of ['img',null]){
    const html=heroDocument({language,position,role}),result=edits(html);
    assert.equal(result?.reason,'resized');assert.equal(result.edits.length,2);
    const changed=applyTextEdits(html,result.edits);
    assert.equal(changed,html.replace(HERO_URL,HERO_URL.replace('=w16383','=w1280')).replace(HERO_ESCAPED,HERO_ESCAPED.replace('\\x3dw16383','\\x3dw1280')));
    assert.equal(Buffer.byteLength(changed),Buffer.byteLength(html)-2);
  }
});

test('four no-photo native null preloaders are explicit valid noops',()=>{
  for(const language of ['es','en','fr','it']){
    const html=heroDocument({language,noPhoto:true}),result=edits(html);
    assert.deepEqual(result,{edits:[],reason:'no-header-photo'});
  }
});

test('unknown hero/preloader/nonce/URL shapes fail closed without source evaluation',()=>{
  const html=heroDocument(),tag=heroTag();
  const invalid=[html.replace('role="img"','role="button"'),html.replace('center center','left center'),html.replace('background-size: cover','background-size: contain'),html.replace(tag,tag+tag),html.replace(tag,'<div class="IFuOkc"></div>'+tag),html.replace('jsname="LQX2Vd"','jsname="unknown"'),html.replace(HERO_URL,HERO_URL+'-rw'),html.replace(HERO_ESCAPED,HERO_ESCAPED+'x'),html.replace('new Image()','new Other()'),html.replace('<script nonce=','<script type="module" nonce='),html.replace('<script nonce=','<script src="https://evil.invalid/" nonce='),html.replace(' nonce="HeroNonce123"',' nonce="DifferentNonce123"'),html.replace('</head>','<script nonce="HeroNonce123">const imageUrl = null;</script></head>'),html.replace('</body>',HERO_URL+'</body>'),html.replace('</body>',HERO_URL.split('/').at(-1).replace('=w16383','')+'</body>'),html.replace('</head>','').replace('</body>','</head></body>'),html.replace('</body>','<!-- unterminated</body>')];
  for(const body of invalid)assert.equal(edits(body),null);
  assert.equal(edits(html,'bad"nonce'),null);assert.equal(edits(html,HERO_NONCE,null),null);
  assert.equal(heroWidthDocumentEdits(null,HERO_NONCE,[],nativeContext(html)),null);
  assert.equal(heroWidthDocumentEdits(html,HERO_NONCE,null,nativeContext(html)),null);
  const inspector=createHeroWidthInspector();inspector.template.element();
  assert.equal(heroWidthDocumentEdits(html,HERO_NONCE,collectRawTextSpans(html),inspector.context()),null);
});

test('comment and raw-script hero decoys never replace the inspected native first background',()=>{
  const html=heroDocument();
  for(const body of [html.replace('<body>','<body><!--<div class="IFuOkc" jsname="LQX2Vd">-->'),html.replace('</head>',`<script nonce="${HERO_NONCE}">window.decoy=${JSON.stringify('<div class="IFuOkc" jsname="LQX2Vd">')};</script></head>`)]){
    const result=edits(body);assert.equal(result?.reason,'resized');
    assert.equal(result.edits.length,2);
  }
});
