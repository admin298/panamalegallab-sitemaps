import test from 'node:test';
import assert from 'node:assert/strict';
import { withImageFormat, createImageInspector, IMAGE_BODY_LIMIT } from '../src/image-format.js';
import { IMAGE_PROFILES } from '../src/image-profiles.js';
const original='https://lh7-us.googleusercontent.com/sitesv-images-rt/Fresh_Token=w1280';
const element=attributes=>({getAttribute(name){return attributes[name]??null;}});
function inspect(profile=IMAGE_PROFILES[0],changes={}) {
 const inspector=createImageInspector(profile);
 for(const key of ['html','head','body','root','section','widget']) inspector[key].element(element({}));
 inspector.marker.element(element({'data-domain':profile.dataDomain,'data-sitename':profile.dataSiteName}));
 inspector.charset.element(element({charset:'utf-8'}));
 inspector.script.element(element({nonce:'ValidNonce123'}));
 inspector.image.element(element({class:profile.imageClass,role:profile.imageRole,alt:profile.imageAlt,src:original,...changes}));
 return inspector;
}
test('inspector selects exactly one structurally approved image in all four languages',()=>{
 for(const profile of IMAGE_PROFILES) assert.deepEqual(inspect(profile).result(),{url:original,nonces:['ValidNonce123']});
});
test('ambiguous, hidden, alternate image sources and wrong sites fail soft',()=>{
 for(const change of [{src:original+'?x=1'},{srcset:''},{alt:'other'},{role:'presentation'},{hidden:''},{'aria-hidden':'true'},{style:'display:none'},{style:'visibility:collapse'},{style:'content-visibility:hidden'},{style:'background:/**/red'},{style:'display:\\6e one'}]) assert.equal(inspect(IMAGE_PROFILES[0],change).result(),null);
 for(const key of ['html','head','body','root','section','widget','image','charset','marker']) { const i=inspect();i[key].element(element({}));assert.equal(i.result(),null,key); }
 const meta=inspect();meta.meta.element(element({'http-equiv':'Content-Security-Policy'}));assert.equal(meta.result(),null);
 const unnonced=inspect();unnonced.script.element(element({}));assert.equal(unnonced.result(),null,'hash-only inline executable scripts must never be rewritten');
 const data=inspect();data.script.element(element({type:'application/ld+json'}));assert.ok(data.result());
 const external=inspect();external.script.element(element({src:'https://static.example/script.js'}));assert.ok(external.result());
});
test('ineligible responses/paths/modes and absent native parser stay byte exact',async()=>{
 const request=new Request('https://www.panamalegallab.com/');
 for(const [url,method,mode] of [[request.url,'HEAD','all'],[request.url,'GET',undefined],[request.url,'GET','invalid'],[request.url+'contacto','GET','all'],[request.url,'GET','preview'],['https://evil.example/','GET','all'],['https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev/es/?_pll_speed=control','GET','all'],['https://other.pll-seo-preview-20261102.pages.dev/es/','GET','all']]) {const response=new Response('exact',{headers:{'Content-Type':'text/html; charset=utf-8'}});assert.equal(await withImageFormat(response,new Request(url,{method}),{PLL_IMAGE_FORMAT:mode}),response);assert.equal(await response.text(),'exact');}
 for(const response of [new Response('error',{status:500}),new Response('plain'),new Response(null,{headers:{'Content-Type':'text/html; charset=utf-8'}}),new Response('html',{headers:{'Content-Type':'text/html; charset=utf-8'}})]) assert.equal(await withImageFormat(response,request,{PLL_IMAGE_FORMAT:'all'}),response);
 assert.equal(IMAGE_BODY_LIMIT,1310720);
});
