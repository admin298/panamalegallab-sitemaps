import test from 'node:test';
import assert from 'node:assert/strict';
import { createHtmlMemoryCache, MEMORY_CACHE_MAX_BYTES, MEMORY_CACHE_MAX_ENTRIES,
  MEMORY_CAPTURE_DEADLINE_MS, MEMORY_BODY_LIMIT } from '../src/html-memory-cache.js';
const header='X-PLL-HTML-Template';
const origin='https://www.panamalegallab.com';
const request=path=>new Request(origin+(path??'/'));
const time=1_800_000_000_000;
const response=(body='original',headers={})=>new Response(body,{headers:{'Content-Type':'text/html; charset=utf-8',
  'Cache-Control':'no-store','Content-Security-Policy':"script-src 'nonce-scriptNonce123456'",'X-Preserved':'yes',...headers}});
const plainIdentity=value=>JSON.stringify(value);
async function fakeCertify(value,identity,{now}={}) {
  const bytes=(await value.clone().arrayBuffer()).byteLength;
  const headers=new Headers(value.headers);headers.set(header,JSON.stringify({identity,bytes,createdAt:now(),expiresAt:now()+300000}));
  return new Response(value.body,{status:value.status,headers});
}
function fakeRead(value,identity,now) {
  const cert=JSON.parse(value.headers.get(header)??'null');
  return cert&&plainIdentity(cert.identity)===plainIdentity(identity)&&cert.createdAt<=now&&cert.expiresAt>now?cert:null;
}
const fakeRenew=async value=>new Response(await value.text(),{headers:new Headers(value.headers)});
const create=options=>createHtmlMemoryCache({mode:'all',now:()=>time,certify:fakeCertify,readCertificate:fakeRead,renew:fakeRenew,...options});
const publicState=(value,state)=>{assert.equal(value.headers.get('X-PLL-HTML-Cache'),state);if(state!=='BYPASS')assert.equal(value.headers.get('Cache-Control'),'no-store');
 for(const [key]of value.headers)assert.equal(/^x-pll-(?:html-)?template/iu.test(key),false,key);};

 test('one retained template avoids source/render work while returning independent bodies and accounted metadata',async()=>{
  let source=0;const cache=create();const deliver=async()=>{source++;return response('héllo 😀');};
  const first=await cache.handle(request(),deliver);publicState(first,'MISS');assert.equal(await first.text(),'héllo 😀');
  const hit=await cache.handle(request(),deliver);publicState(hit,'HIT');assert.equal(hit.headers.get('X-Preserved'),'yes');
  assert.equal(hit.headers.get('X-PLL-HTML-Cache-Source'),'memory');
  const reader=hit.body.getReader(),chunk=await reader.read();chunk.value.fill(0);await reader.cancel();
  const next=await cache.handle(request(),deliver);publicState(next,'HIT');assert.equal(await next.text(),'héllo 😀');
  assert.equal(source,1);assert.equal(cache.snapshot().entries,1);assert.ok(cache.snapshot().accountedBytes>new TextEncoder().encode('héllo 😀').length);
  assert.equal(MEMORY_CACHE_MAX_BYTES,8*1024*1024);assert.equal(MEMORY_CACHE_MAX_ENTRIES,32);
  assert.equal(MEMORY_CAPTURE_DEADLINE_MS,1000);assert.equal(MEMORY_BODY_LIMIT,1048576);
 });

 test('absolute expiry is not renewed on access and empty/new instance causes one fresh fill',async()=>{
  let now=time,source=0;const deliver=async()=>response('source-'+(++source));const cache=create({now:()=>now});
  assert.equal(await (await cache.handle(request(),deliver)).text(),'source-1');
  now+=299000;const valid=await cache.handle(request(),deliver);publicState(valid,'HIT');await valid.text();
  now+=1000;const expired=await cache.handle(request(),deliver);publicState(expired,'MISS');assert.equal(await expired.text(),'source-2');
  const cold=create({now:()=>now});const afterReset=await cold.handle(request(),deliver);publicState(afterReset,'MISS');assert.equal(await afterReset.text(),'source-3');
 });

 test('LRU eviction obeys both entry limit and body-plus-metadata budget',async()=>{
  const cache=create({maxEntries:2});const counts=new Map();
  const get=async path=>{const value=await cache.handle(request(path),async()=>{counts.set(path,(counts.get(path)??0)+1);return response(path);});await value.text();return value;};
  await get('/');await get('/contacto');publicState(await get('/'),'HIT');await get('/sobre-nosotros');
  assert.equal(cache.snapshot().entries,2);publicState(await get('/'),'HIT');publicState(await get('/contacto'),'MISS');assert.equal(counts.get('/contacto'),2);
  const charged=create();await(await charged.handle(request(),async()=>response('small'))).text();const cost=charged.snapshot().accountedBytes;
  const bounded=create({maxBytes:cost+10});await(await bounded.handle(request(),async()=>response('small'))).text();
  await(await bounded.handle(request('/contacto'),async()=>response('small'))).text();
  assert.equal(bounded.snapshot().entries,1);assert.ok(bounded.snapshot().accountedBytes<=cost+10);
 });

 test('oversized admission never evicts a valid entry and no allocation exceeds body limit',async()=>{
  const baseline=create();await(await baseline.handle(request(),async()=>response('tiny'))).text();const cost=baseline.snapshot().accountedBytes;
  const cache=create({maxBytes:cost+100});await(await cache.handle(request(),async()=>response('tiny'))).text();
  const tooBig=await cache.handle(request('/contacto'),async()=>response('x'.repeat(10000)));publicState(tooBig,'BYPASS');await tooBig.text();
  assert.equal(cache.snapshot().entries,1);publicState(await cache.handle(request(),()=>assert.fail('valid cached entry evicted')),'HIT');
 });

 test('invalid/corrupted entry is evicted and falls through to one original delivery without recursion',async()=>{
  let source=0;const cache=create({renew:async value=>(await value.text())==='corrupt'?null:response('renewed')});
  const deliver=async()=>response(++source===1?'corrupt':'healthy');
  await(await cache.handle(request(),deliver)).text();const repaired=await cache.handle(request(),deliver);publicState(repaired,'MISS');assert.equal(await repaired.text(),'healthy');
  assert.equal(source,2);const hit=await cache.handle(request(),deliver);publicState(hit,'HIT');assert.equal(await hit.text(),'renewed');
 });

 test('failed renewal or certification remains optional and source is called exactly once',async()=>{
  let source=0;const cache=create({renew:async()=>{throw Error('private');}});const deliver=async()=>{source++;return response('fresh');};
  await(await cache.handle(request(),deliver)).text();const second=await cache.handle(request(),deliver);publicState(second,'MISS');assert.equal(await second.text(),'fresh');assert.equal(source,2);
  const noCert=create({certify:async()=>{throw Error('private');}});const value=await noCert.handle(request(),deliver);publicState(value,'BYPASS');assert.equal(await value.text(),'fresh');assert.equal(source,3);assert.equal(noCert.snapshot().entries,0);
 });

 test('expiry during renewal never returns stale bytes',async()=>{
  let now=time,source=0;const cache=create({now:()=>now,renew:async()=>{now=time+300000;return response('stale');}});
  const deliver=async()=>response('fresh-'+(++source));await(await cache.handle(request(),deliver)).text();
  const result=await cache.handle(request(),deliver);publicState(result,'MISS');assert.equal(await result.text(),'fresh-2');
 });

 test('only one fill spans the original source await; concurrent misses never queue or certify',async()=>{
  let release,certifications=0;const cache=create({certify:async(...args)=>{certifications++;return fakeCertify(...args);}});
  const first=cache.handle(request(),()=>new Promise(resolve=>{release=()=>resolve(response('first'));}));
  await Promise.resolve();assert.equal(cache.snapshot().fillInFlight,true);
  const other=await cache.handle(request('/contacto'),async()=>response('other'));publicState(other,'BYPASS');assert.equal(await other.text(),'other');assert.equal(certifications,0);
  release();const result=await first;publicState(result,'MISS');assert.equal(await result.text(),'first');assert.equal(certifications,1);assert.equal(cache.snapshot().fillInFlight,false);
  assert.equal(cache.snapshot().entries,1);
  const later=await cache.handle(request('/contacto'),async()=>response('later'));publicState(later,'MISS');await later.text();assert.equal(certifications,2);assert.equal(cache.snapshot().entries,2);
 });

 test('failed original source releases the fill guard and is never retried',async()=>{
  const cache=create();let calls=0;
  await assert.rejects(cache.handle(request(),async()=>{calls++;throw Error('private');}),/private/);assert.equal(calls,1);assert.equal(cache.snapshot().fillInFlight,false);
  const next=await cache.handle(request(),async()=>{calls++;return response();});publicState(next,'MISS');await next.text();assert.equal(calls,2);
 });

 test('queries, methods, RPC, aliases, unknown paths and off modes bypass without certification',async()=>{
  let calls=0,certs=0;const cache=create({certify:async()=>{certs++;throw Error('must bypass');}});
  for(const [path,method]of[['/?q=private','GET'],['/','HEAD'],['/_/view/search/panamalegallab.com/panamalegallab','POST'],['/inicio','GET'],['/unknown','GET']]){
    const value=await cache.handle(new Request(origin+path,{method}),async()=>{calls++;return new Response(method==='HEAD'?null:'unchanged');});publicState(value,'BYPASS');assert.equal(await value.text(),method==='HEAD'?'':'unchanged');
  }
  for(const modeof of ['off','unknown']){const disabled=create({mode:modeof,certify:async()=>{certs++;throw Error('must bypass');}});const v=await disabled.handle(request(),async()=>response());publicState(v,'BYPASS');await v.text();}
  assert.equal(calls,5);assert.equal(certs,0);
 });

 test('error/redirect/preexisting certificate never populate memory or leak internal headers',async()=>{
  let certs=0;const cache=create({certify:async(...args)=>{certs++;return fakeCertify(...args);}});
  for(const statusof of [301,404,429,503]){
    const value=await cache.handle(request(),async()=>new Response('unchanged',{status:statusof,headers:{[header]:'private','X-PLL-Template-Future':'private',Location:'https://sites.google.com/'}}));
    publicState(value,'BYPASS');assert.equal(value.status,statusof);assert.equal(await value.text(),'unchanged');
  }
  const stale=await cache.handle(request(),async()=>response('unchanged',{[header]:'untrusted'}));publicState(stale,'BYPASS');await stale.text();assert.equal(certs,0);assert.equal(cache.snapshot().entries,0);
 });

 test('capture rejects stalled, oversized and excessively fragmented bodies without an extra source call',async()=>{
  const timing={setTimeout:fn=>setTimeout(fn,2),clearTimeout};
  for(const variantof of ['stalled','oversized','chunks','empty']){
    let reads=0;const body=new ReadableStream({pull(controller){
      reads++;if(variantof==='stalled')return;
      if(variantof==='oversized'){controller.enqueue(new Uint8Array(1048577));controller.close();}
      else if(variantof==='chunks'){controller.enqueue(new Uint8Array([65]));if(reads===2050)controller.close();}
      else{controller.enqueue(new Uint8Array());if(reads===10)controller.close();}
    }},{highWaterMark:0});
    let calls=0;const value=response(body);
    const cache=create({timing,certify:async r=>{const h=new Headers(r.headers);h.set(header,'fake');return new Response(r.body,{headers:h});},
      readCertificate:()=>({createdAt:time,expiresAt:time+300000,bytes:1})});
    const actual=await cache.handle(request(),async()=>{calls++;return value;});publicState(actual,'BYPASS');assert.equal(calls,1);assert.equal(cache.snapshot().entries,0);
    actual.body.cancel().catch(()=>{});
  }
 });

 test('cache HIT strips request telemetry while preserving CSP and reporting configuration',async()=>{
  const cache=create();await(await cache.handle(request(),async()=>response('fresh',{Age:'100','CF-Ray':'old','Server-Timing':'old',Date:'old','Report-To':'security',NEL:'report'}))).text();
  const hit=await cache.handle(request(),()=>assert.fail('HIT'));publicState(hit,'HIT');
  for(const nameof of ['Age','CF-Ray','Server-Timing','Date'])assert.equal(hit.headers.get(nameof),null);
  assert.equal(hit.headers.get('Report-To'),'security');assert.equal(hit.headers.get('NEL'),'report');assert.equal(hit.headers.get('Content-Security-Policy'),"script-src 'nonce-scriptNonce123456'");await hit.text();
 });

 test('budget options remain hard capped and snapshot does not expose mutable cached bytes',()=>{
  for(const optionsof of [{maxEntries:33},{maxEntries:0},{maxBytes:8388609},{maxBytes:0},{maxBytes:1.1}])assert.throws(()=>create(optionsof),RangeError);
  const state=create().snapshot();assert.ok(Object.isFrozen(state));assert.equal('body'in state,false);
 });

 test('renderer constructor owns one cache and existing response-slot gate still limits unread HIT bodies',async()=>{
  const { createRendererClass } = await import('../src/backend-core.js');
  class Base{}let renders=0;const Renderer=createRendererClass(Base,()=>async()=>{renders++;return response('fresh');},
    {cacheMode:'all',cacheOptions:{now:()=>time,certify:fakeCertify,readCertificate:fakeRead,renew:fakeRenew}});
  const renderer=new Renderer({}, {CF_VERSION_METADATA:{id:'test'}});await(await renderer.fetch(request())).text();
  const held=[];try{
    for(let index=0;index<8;index++){const v=await renderer.fetch(request());publicState(v,'HIT');held.push(v);}
    const denied=await renderer.fetch(request());assert.equal(denied.status,503);await denied.text();assert.equal(renders,1);assert.equal(renderer.inFlight,8);
  }finally{await Promise.all(held.map(v=>v.body.cancel()));}
  assert.equal(renderer.inFlight,0);const after=await renderer.fetch(request());publicState(after,'HIT');await after.text();assert.equal(renders,1);
 });

test('persistent backing survives a new memory instance without another source render',async()=>{
  const rows=new Map();let reads=0,writes=0,source=0;
  const store={async get(key){reads++;return rows.get(key)??null;},async put(key,row){writes++;rows.set(key,{...row,bytes:row.bytes.slice(),headers:row.headers.map(pair=>[...pair])});}};
  const deliver=async()=>response('source-'+(++source));const first=create({store});await(await first.handle(request(),deliver)).text();
  assert.equal(source,1);assert.equal(writes,1);assert.equal(reads,1);
  const restarted=create({store});const hit=await restarted.handle(request(),deliver);publicState(hit,'HIT');assert.equal(await hit.text(),'source-1');
  assert.equal(hit.headers.get('X-PLL-HTML-Cache-Source'),'sqlite');
  assert.equal(source,1);assert.equal(reads,2);assert.equal(writes,1);assert.equal(restarted.snapshot().entries,1);
  await(await restarted.handle(request(),deliver)).text();assert.equal(reads,2,'memory HIT avoids even the backing lookup');
});

test('persistent failure/timeout disables backing for the instance and source still runs only once',async()=>{
  for(const fail of[async()=>{throw Error('private storage');},()=>new Promise(()=>{})]){
    let reads=0,source=0,writes=0;const cache=create({timing:{setTimeout:fn=>setTimeout(fn,2),clearTimeout},
      store:{get(...args){reads++;return fail(...args);},async put(){writes++;}}});
    const deliver=async()=>response('fresh-'+(++source));const value=await cache.handle(request(),deliver);publicState(value,'MISS');assert.equal(await value.text(),'fresh-1');
    const hit=await cache.handle(request(),deliver);publicState(hit,'HIT');await hit.text();assert.equal(source,1);assert.equal(reads,1);assert.equal(writes,0);
  }
  let putCalls=0;const broken=create({store:{async get(){return null;},async put(){putCalls++;throw Error('private');}}});
  const value=await broken.handle(request(),async()=>response());publicState(value,'MISS');await value.text();assert.equal(putCalls,1);
});

test('persistent corrupt/expired rows never escape and a valid fresh response replaces them once',async()=>{
  let row=null,writes=0,source=0;const store={async get(){return row;},async put(key,value){writes++;row=value;}};
  const first=create({store});await(await first.handle(request(),async()=>response('old'))).text();
  row={...row,bytes:new TextEncoder().encode('corrupt')};
  const restarted=create({store,renew:async value=>(await value.text())==='corrupt'?null:response('healthy')});
  const repaired=await restarted.handle(request(),async()=>{source++;return response('fresh');});publicState(repaired,'MISS');assert.equal(await repaired.text(),'fresh');assert.equal(source,1);assert.equal(writes,2);
  const expired=create({store,now:()=>time+300000});const next=await expired.handle(request(),async()=>response('new'));publicState(next,'MISS');assert.equal(await next.text(),'new');assert.equal(writes,3);
});

test('final backend metadata is fresh after persistent cache is reopened under a new deployment',async()=>{
  const { createRendererClass } = await import('../src/backend-core.js');
  const rows=new Map();const store={async get(key){return rows.get(key)??null;},async put(key,value){rows.set(key,value);}};
  class Base{}let renders=0;const opts={cacheMode:'all',cacheOptions:{store,now:()=>time,certify:fakeCertify,readCertificate:fakeRead,renew:fakeRenew}};
  const Renderer=createRendererClass(Base,()=>async()=>{renders++;return response();},opts);
  const old=new Renderer({}, {CF_VERSION_METADATA:{id:'old'}});await(await old.fetch(request())).text();
  const fresh=new Renderer({}, {CF_VERSION_METADATA:{id:'new'}});const hit=await fresh.fetch(request());publicState(hit,'HIT');
  assert.equal(hit.headers.get('X-PLL-Backend-Version'),'new');await hit.text();assert.equal(renders,1);
});

test('never-settling persistent reads stay bounded after callers and response slots finish',async()=>{
  let reads=0,writes=0;const cache=create({timing:{setTimeout:fn=>setTimeout(fn,2),clearTimeout},
    store:{get(){reads++;return new Promise(()=>{});},async put(){writes++;}}});
  const paths=['/','/contacto','/sobre-nosotros','/guia-de-recursos','/nuestros-servicios-en-panama','/nuestros-servicios-en-espana',
    '/aviso-legal-politica-privacidad','/nuestros-servicios-en-panama/crear-empresa-en-panama','/nuestros-servicios-en-panama/cuenta-bancaria-en-panama'];
  const responses=await Promise.all(paths.map(path=>cache.handle(request(path),async()=>response(path))));
  await Promise.all(responses.map(value=>value.text()));assert.equal(reads,8);assert.equal(writes,0);
  assert.equal(cache.snapshot().storeEnabled,false);assert.equal(cache.snapshot().storePending,8);
  for(const path of paths)await(await cache.handle(request(path),async()=>response('later'))).text();
  assert.equal(reads,8);assert.equal(cache.snapshot().fillInFlight,false);
});

test('ineligible requests never read backing and optional invalid certifier response does not break delivery',async()=>{
  let reads=0;const cache=create({store:{async get(){reads++;return null;},async put(){}},certify:async()=>null});
  const bypass=await cache.handle(new Request(origin+'/?q=one'),async()=>response('normal'));publicState(bypass,'BYPASS');assert.equal(await bypass.text(),'normal');assert.equal(reads,0);
  const failed=await cache.handle(request(),async()=>response('fresh'));publicState(failed,'BYPASS');assert.equal(await failed.text(),'fresh');assert.equal(reads,1);
});

test('BYPASS preserves immutable binary assets, HEAD and RPC cache policies through the real core',async()=>{
  const {createRendererClass}=await import('../src/backend-core.js');class Base{}
  for(const [method,path,type,policy] of[
    ['GET','/_pll-image/photo.webp','image/webp','public, max-age=31536000, immutable'],
    ['HEAD','/_pll-image/photo.webp','image/webp','public, max-age=31536000, immutable'],
    ['POST','/_/view/search/panamalegallab.com/panamalegallab','application/json','private, max-age=0'],
  ]){
    const Renderer=createRendererClass(Base,()=>async()=>new Response(method==='HEAD'?null:new Uint8Array([1,2,3]),{headers:{
      'Content-Type':type,'Cache-Control':policy,'X-PLL-HTML-Template':'private','X-Preserved':'exact',
    }}),{cacheMode:'all',cacheOptions:{store:null}});
    const value=await(new Renderer({},{})).fetch(new Request(origin+path,{method}));
    assert.equal(value.status,200);assert.equal(value.headers.get('Cache-Control'),policy);assert.equal(value.headers.get('Content-Type'),type);
    assert.equal(value.headers.get('X-PLL-HTML-Cache'),'BYPASS');assert.equal(value.headers.get(header),null);assert.equal(value.headers.get('X-Preserved'),'exact');
    assert.equal((await value.arrayBuffer()).byteLength,method==='HEAD'?0:3);
  }
});
