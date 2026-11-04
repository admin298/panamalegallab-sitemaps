import test from 'node:test';
import assert from 'node:assert/strict';
import { withImageFormat, IMAGE_BODY_LIMIT } from '../src/image-format.js';
import { IMAGE_PROFILES } from '../src/image-profiles.js';
import { createRendererClass } from '../src/backend-core.js';
const p=IMAGE_PROFILES[0],url='https://lh7-us.googleusercontent.com/sitesv-images-rt/Fresh_Token=w1280';
const headers={'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"script-src 'nonce-ValidNonce123'",'X-Keep':'exact',ETag:'old','Content-MD5':'old',Digest:'old','Content-Digest':'old','Repr-Digest':'old'};
const html='\uFEFF<!doctype html><html><head><meta charset="utf-8"><script nonce="ValidNonce123">const n="á"</script></head><body><img src="'+url+'"></body></html>';
const request=new Request('https://www.panamalegallab.com/');
const el=attrs=>({getAttribute:name=>attrs[name]??null});
// Mock only native selector events; separate Miniflare tests exercise real parsing.
class FixtureRewriter{
 constructor(){this.handlers=[];}
 on(selector,handler){this.handlers.push([selector,handler]);return this;}
 transform(response){const invoke=(selector,attrs)=>this.handlers.find(row=>row[0]===selector)?.[1].element(el(attrs));
  for(const selector of ['html','head','body','div.UtePc',`section[id="${p.sectionId}"]`,`[id="${p.widgetId}"]`])invoke(selector,{});
  invoke('[data-domain][data-sitename]',{'data-domain':p.dataDomain,'data-sitename':p.dataSiteName});
  invoke('head meta[charset]',{charset:'utf-8'});invoke('script',{nonce:'ValidNonce123'});
  invoke(`div.UtePc > section[id="${p.sectionId}"] [id="${p.widgetId}"] img`,{class:p.imageClass,role:p.imageRole,alt:p.imageAlt,src:url});
  invoke(`section[id="${p.sectionId}"] div`,{});invoke('img',{});
  return response;
 }
}
test('postvalidated adapter preserves BOM/unicode and all headers except stale body validators',async()=>{
 const response=new Response(html,{headers:{...headers,'Content-Length':String(new TextEncoder().encode(html).length)}});
 const delivered=await withImageFormat(response,request,{PLL_IMAGE_FORMAT:'all'},{Rewriter:FixtureRewriter});
 assert.notEqual(delivered,response);assert.equal(delivered.headers.get('X-PLL-Image-Policy'),'process-webp-v1-es');
 for(const key of ['Content-Length','ETag','Content-MD5','Digest','Content-Digest','Repr-Digest'])assert.equal(delivered.headers.has(key),false,key);
 for(const key of ['Content-Type','Content-Security-Policy','X-Keep'])assert.equal(delivered.headers.get(key),headers[key]);
 const bytes=new Uint8Array(await delivered.arrayBuffer());assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);
 const result=new TextDecoder('utf-8',{ignoreBOM:true}).decode(bytes);
 assert.equal(result.replace(/<script nonce="ValidNonce123" data-pll-image-fallback="v1">[\s\S]*?<\/script>/u,'').replace(url+'-rw',url),html);
});
test('bounded byte/read/parse errors return the original without creating an error response',async()=>{
 for(const body of [new Uint8Array(IMAGE_BODY_LIMIT+1),new Uint8Array([255,254]),html]){
  const response=new Response(body,{headers});
  class Broken{on(){throw new Error('native parse failure');}}
  const delivered=await withImageFormat(response,request,{PLL_IMAGE_FORMAT:'all'},{Rewriter:Broken});
  assert.equal(delivered,response);const actual=new Uint8Array(await delivered.arrayBuffer());
  assert.deepEqual(actual,typeof body==='string'?new TextEncoder().encode(body):body);
 }
 const failed=new Response(new ReadableStream({start(c){c.error(new Error('read failure'));}}),{headers});
 assert.equal(await withImageFormat(failed,request,{PLL_IMAGE_FORMAT:'all'},{Rewriter:FixtureRewriter}),failed);
 await assert.rejects(()=>failed.text(),/read failure/u);
});
test('single deadline stops pending clone/parser inspection, clears its timer and leaves original readable',async()=>{
 for(const waitForParser of [false,true]){
  let finish,cleared=0,parseCalls=0,cancelled=0;
  const timing={setTimeout(fn,ms){assert.equal(ms,1000);finish=fn;return 19;},clearTimeout(id){assert.equal(id,19);cleared++;}};
  const body=waitForParser?html:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('pending'));},cancel(){cancelled++;}});
  const response=new Response(body,{headers});
  class Waiting extends FixtureRewriter{transform(input){parseCalls++;super.transform(input);return new Response(new ReadableStream({cancel(){cancelled++;}}));}}
  const pending=withImageFormat(response,request,{PLL_IMAGE_FORMAT:'all'},{Rewriter:Waiting,timing});
  for(let turn=0;turn<20&&(waitForParser?parseCalls===0:!finish);turn++)await new Promise(resolve=>setImmediate(resolve));
  assert.ok(finish);if(waitForParser)assert.equal(parseCalls,1);finish();
  assert.equal(await pending,response);assert.equal(cleared,1);
  if(waitForParser){assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new TextEncoder().encode(html));assert.equal(cancelled,1);}else{const reader=response.body.getReader();assert.equal(new TextDecoder().decode((await reader.read()).value),'pending');void reader.cancel();assert.equal(parseCalls,0);}
 }
});
test('CSP/ref/head ambiguity and already encoded bodies produce no changes',async()=>{
 for(const [body,custom] of [[html,{...headers,'Content-Security-Policy':"script-src 'none'"}],[html.replace('<head>','<head x=\">\">'),headers],[html.replace(url,url+'-c'),headers],[html,{...headers,'Content-Encoding':'gzip'}]]){
  const response=new Response(body,{headers:custom});assert.equal(await withImageFormat(response,request,{PLL_IMAGE_FORMAT:'all'},{Rewriter:FixtureRewriter}),response);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new TextEncoder().encode(body));
 }
});

test('active optimization still retains the singleton eight slots until delivered bodies end',async()=>{
 const previous=globalThis.HTMLRewriter;globalThis.HTMLRewriter=FixtureRewriter;
 class Base{constructor(){}}
 const Renderer=createRendererClass(Base,()=>async()=>new Response(html,{headers}));
 const renderer=new Renderer({}, {PLL_IMAGE_FORMAT:'all'}),open=[];
 try{
  for(let index=0;index<8;index++){const response=await renderer.fetch(request);assert.equal(response.status,200);assert.equal(response.headers.get('X-PLL-Image-Policy'),'process-webp-v1-es');open.push(response);}
  assert.equal(renderer.inFlight,8);
  const exceeded=await renderer.fetch(request);assert.equal(exceeded.status,503);await exceeded.text();assert.equal(renderer.inFlight,8);
  await open.shift().arrayBuffer();assert.equal(renderer.inFlight,7);
  const next=await renderer.fetch(request);assert.equal(next.status,200);open.push(next);
  for(const response of open)await response.body.cancel();assert.equal(renderer.inFlight,0);
 }finally{globalThis.HTMLRewriter=previous;for(const response of open)try{await response.body.cancel();}catch{}}
});
