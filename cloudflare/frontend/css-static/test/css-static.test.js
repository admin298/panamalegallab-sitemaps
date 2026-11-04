import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { withCssStatic, CSS_BODY_LIMIT, CSS_NATIVE_URL, CSS_ASSET_PATH, cssFallbackScript, spliceCssLink, stylePolicyAbsent } from '../src/css-static.js';
import { createRendererClass } from '../src/backend-core.js';
const nonce='ValidNonce123';
const headers={'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`script-src 'nonce-${nonce}'`,'Cache-Control':'no-store',ETag:'old','X-Keep':'yes'};
const html=`\uFEFF<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${CSS_NATIVE_URL}" data-id="_cl" nonce="StyleNonce456"><script nonce="${nonce}">window.a=1</script></head><body><div data-domain="panamalegallab.com" data-sitename="panamalegallab"></div><p>Panamá 😀</p></body></html>`;
const request=new Request('https://www.panamalegallab.com/');
const element=attrs=>({getAttribute:name=>attrs[name]??null});
class FixtureRewriter {
  constructor(){this.handlers=[];}
  on(selector,handler){this.handlers.push([selector,handler]);return this;}
  transform(response){
    const invoke=(selector,attrs={})=>this.handlers.find(row=>row[0]===selector)?.[1].element(element(attrs));
    for(const name of ['html','head','body'])invoke(name);
    invoke('[data-domain][data-sitename]',{'data-domain':'panamalegallab.com','data-sitename':'panamalegallab'});
    invoke('head meta[charset]',{charset:'utf-8'});
    invoke('script',{nonce});
    const attrs={rel:'stylesheet',href:CSS_NATIVE_URL,'data-id':'_cl',nonce:'StyleNonce456'};
    invoke('link',attrs);invoke('head link',attrs);
    return response;
  }
}
const run=(response,req=request,env={PLL_CSS_STATIC:'all'},extra={})=>withCssStatic(response,req,env,{Rewriter:FixtureRewriter,...extra});
const strip=text=>text.replace(/<script nonce="ValidNonce123" data-pll-css-fallback="v1">[\s\S]*?<\/script>/u,'');

test('CSS exact href splice preserves every other byte and link attribute',()=>{
  const changed=spliceCssLink(html,nonce);
  assert.equal(strip(changed),html.replace(`href="${CSS_NATIVE_URL}"`,`href="${CSS_ASSET_PATH}"`));
  const upper=html.replace('<head>','<HEAD>').replace('</head>','</HEAD>').replace('<link ','<LINK ').replace('href="','HREF=\'').replace('" data-id','\' data-id');
  assert.equal(strip(spliceCssLink(upper,nonce)),upper.replace(CSS_NATIVE_URL,CSS_ASSET_PATH));
  const turkish=html.replace('<meta','İ<meta');
  assert.equal(strip(spliceCssLink(turkish,nonce)),turkish.replace(CSS_NATIVE_URL,CSS_ASSET_PATH));
  for(const body of [html.replace(CSS_NATIVE_URL,CSS_NATIVE_URL+'x'),html.replace('<head>','<head a="x">'),html.replace('</head>',''),html.replace('<head>','<head><head>'),html.replace(' nonce="StyleNonce456"',' nonce="StyleNonce456" href="duplicate"'),html.replace('</head>',`<link rel="stylesheet" href="${CSS_NATIVE_URL}" data-id="_cl"></head>`),html.replace('<body>',`<body><link href="${CSS_NATIVE_URL}" data-id="_cl" nonce="StyleNonce456" rel="stylesheet">`),html.replace('<head>','<!-- <head> --> <head>')])assert.equal(spliceCssLink(body,nonce),null);
  assert.equal(spliceCssLink(html,'bad"nonce'),null);
});

test('every enforced style/default directive conservatively disables CSS mapping',()=>{
  assert.equal(stylePolicyAbsent(headers['Content-Security-Policy']),true);
  for(const value of [null,'',"default-src 'self'",`script-src 'nonce-${nonce}'; STYLE-src 'self'`, `script-src 'nonce-${nonce}',style-src-elem *`, `script-src 'nonce-${nonce}';style-src-attr 'unsafe-inline'`])assert.equal(stylePolicyAbsent(value),false);
});

test('unterminated comments/raw text and adversarial repeated openers fail soft promptly',()=>{
  for(const tail of ['<!-- unterminated','<script nonce="ValidNonce123">','<style>','<script>'.repeat(25000)]){
    const started=performance.now();assert.equal(spliceCssLink(html+tail,nonce),null);
    assert.ok(performance.now()-started<1000,'bounded classifier must finish without quadratic rescanning');
  }
});

test('adapter only replaces approved href and adds authorized early fallback; keeps CSP/freshness',async()=>{
  const response=new Response(html,{headers:{...headers,'Content-Length':String(Buffer.byteLength(html)),'Content-MD5':'x',Digest:'x','Content-Digest':'x','Repr-Digest':'x'}});
  const result=await run(response);assert.notEqual(result,response);
  assert.equal(result.headers.get('X-PLL-CSS-Policy'),'static-exact-v1-es');
  for(const key of ['Content-Length','ETag','Content-MD5','Digest','Content-Digest','Repr-Digest'])assert.equal(result.headers.has(key),false,key);
  for(const key of ['Content-Type','Content-Security-Policy','Cache-Control','X-Keep'])assert.equal(result.headers.get(key),headers[key]);
  const bytes=new Uint8Array(await result.arrayBuffer());assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);
  const text=new TextDecoder('utf-8',{ignoreBOM:true}).decode(bytes);
  assert.equal(strip(text),html.replace(CSS_NATIVE_URL,CSS_ASSET_PATH));
  assert.ok(text.indexOf('data-pll-css-fallback')<text.indexOf('<link'));
});

test('off/default, public query, other preview, search, status/mime and native-parser guards fail soft',async()=>{
  for(const [url,method,mode]of [[request.url,'GET',undefined],[request.url,'GET','off'],[request.url,'GET','invalid'],[request.url,'HEAD','all'],[request.url,'GET','preview'],['https://evil.example/','GET','all'],['https://other.pll-seo-preview-20261102.pages.dev/es/','GET','all'],['https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev/es/?_pll_speed=control','GET','all'],['https://www.panamalegallab.com/_/search?q=law','GET','all']]){
    const response=new Response(html,{headers});assert.equal(await run(response,new Request(url,{method}),{PLL_CSS_STATIC:mode}),response);
  }
  for(const custom of [{...headers,'Content-Type':'text/html'},{...headers,'Content-Encoding':'gzip'},{...headers,'Content-Security-Policy':"script-src 'none'"},{...headers,'Content-Security-Policy':headers['Content-Security-Policy']+";style-src 'self'"}]){const response=new Response(html,{headers:custom});assert.equal(await run(response),response);}
  for(const response of [new Response(html,{status:500,headers}),new Response(null,{headers})])assert.equal(await run(response),response);
  const response=new Response(html,{headers});assert.equal(await withCssStatic(response,request,{PLL_CSS_STATIC:'all'}),response);
  // A public query cannot select a policy or disable an enabled policy.
  const enabled=await run(new Response(html,{headers}),new Request(request.url+'?_pll_speed=control&PLL_CSS_STATIC=off'));assert.ok(enabled.headers.has('X-PLL-CSS-Policy'));await enabled.text();
});

test('byte cap, invalid UTF8, clone/read/parser failure and bounded deadline return original',async()=>{
  for(const body of [new Uint8Array(CSS_BODY_LIMIT+1),new Uint8Array([255,254]),html]){
    class Broken{on(){throw Error('parser failed');}}
    const response=new Response(body,{headers});assert.equal(await run(response,request,{PLL_CSS_STATIC:'all'},{Rewriter:Broken}),response);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()),typeof body==='string'?new TextEncoder().encode(body):body);
  }
  const used=new Response(html,{headers});await used.text();assert.equal(await run(used),used);
  const failed=new Response(new ReadableStream({start(c){c.error(Error('read failed'));}}),{headers});assert.equal(await run(failed),failed);await assert.rejects(()=>failed.text(),/read failed/u);
  for(const waitParser of [false,true]){
    let finish,cleared=0,parsed=0;
    const timing={setTimeout(fn,ms){assert.equal(ms,1000);finish=fn;return 19;},clearTimeout(id){assert.equal(id,19);cleared++;}};
    class Waiting extends FixtureRewriter{transform(input){parsed++;super.transform(input);return new Response(new ReadableStream({}));}}
    const response=new Response(waitParser?html:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('pending'));}}),{headers});
    const pending=run(response,request,{PLL_CSS_STATIC:'all'},{Rewriter:Waiting,timing});
    for(let turn=0;turn<30&&(waitParser?parsed===0:!finish);turn++)await new Promise(resolve=>setImmediate(resolve));
    assert.ok(finish);finish();assert.equal(await pending,response);assert.equal(cleared,1);
    if(waitParser)await response.text();else{const reader=response.body.getReader();assert.equal(new TextDecoder().decode((await reader.read()).value),'pending');void reader.cancel();}
  }
});

test('missing local stylesheet falls back once per exact mapped LINK, capturing errors without loops',()=>{
  let listener,capture;
  const document={location:{origin:'https://www.panamalegallab.com'},addEventListener(name,fn,phase){assert.equal(name,'error');listener=fn;capture=phase;}};
  vm.runInNewContext(cssFallbackScript(),{document,WeakSet});assert.equal(capture,true);
  const make=(tag='LINK',href=CSS_ASSET_PATH)=>{const attrs={href,rel:'stylesheet','data-id':'_cl'};return {tagName:tag,getAttribute:key=>attrs[key]??null,setAttribute(key,value){attrs[key]=value;},get href(){return 'https://www.panamalegallab.com'+attrs.href;},attrs};};
  const a=make();listener({target:a});assert.equal(a.attrs.href,CSS_NATIVE_URL);a.attrs.href=CSS_ASSET_PATH;listener({target:a});assert.equal(a.attrs.href,CSS_ASSET_PATH);
  const b=make();listener({target:b});assert.equal(b.attrs.href,CSS_NATIVE_URL);
  for(const node of [make('IMG'),make('LINK',CSS_ASSET_PATH+'?x'),make('LINK',CSS_NATIVE_URL),make('LINK','https://evil.example'+CSS_ASSET_PATH),null]){const before=node?.attrs.href;listener({target:node});assert.equal(node?.attrs.href,before);}
});

test('CSS decorator stays inside singleton eight response slots until body consumption',async()=>{
  const previous=globalThis.HTMLRewriter;globalThis.HTMLRewriter=FixtureRewriter;
  class Base{constructor(){}}
  const Renderer=createRendererClass(Base,()=>async()=>new Response(html,{headers}));const renderer=new Renderer({}, {PLL_CSS_STATIC:'all'}),open=[];
  try{for(let index=0;index<8;index++){const response=await renderer.fetch(request);assert.equal(response.headers.get('X-PLL-CSS-Policy'),'static-exact-v1-es');open.push(response);}assert.equal(renderer.inFlight,8);const busy=await renderer.fetch(request);assert.equal(busy.status,503);await busy.text();await open.shift().text();assert.equal(renderer.inFlight,7);for(const response of open)await response.body.cancel();assert.equal(renderer.inFlight,0);}
  finally{globalThis.HTMLRewriter=previous;for(const response of open)try{await response.body.cancel();}catch{}}
});
