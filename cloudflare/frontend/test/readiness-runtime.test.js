import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';
import data from '../data/readiness.json' with { type: 'json' };
import { SITES } from '../vendor/logic.js';

const footers=Object.fromEntries(Object.keys(SITES).map(lang=>[lang,readFileSync(new URL(`./fixtures/footer-${lang}.html`,import.meta.url),'utf8').trimEnd()]));
const candidate=fileURLToPath(new URL('../dist/_worker.js',import.meta.url));
function baselineWorker(){
 const bytes=readFileSync(new URL('../pages-upload-production-2802a52c5a31.zip',import.meta.url));
 assert.equal(bytes.readUInt32LE(0),0x04034b50);const size=bytes.readUInt32LE(18),nameSize=bytes.readUInt16LE(26),extra=bytes.readUInt16LE(28);
 assert.equal(bytes.subarray(30,30+nameSize).toString(),'_worker.js');const worker=inflateRawSync(bytes.subarray(30+nameSize+extra,30+nameSize+extra+size)).toString();
 assert.equal(createHash('sha256').update(worker).digest('hex'),'b1772064eb29943ad4c25266b58dc20abee7beb3bafa01c1d8ee50224d943e46');return worker;
}
const escaped=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll("'",'&#39;');
const meta=description=>`<meta name="description" content="${escaped(description)}">`;
function envelope(site,upstream,footer=footers[site.language],head=''){
 const config=Array.from({length:518},()=>null);config[212]=0;config[316]=upstream;
 return `<!doctype html><html lang="${site.language}"><head><title>Native title kept</title>${head}<script nonce="readiness-native">_at_config = ${JSON.stringify(config)};window.globals={kept:true};</script></head><body><div data-domain="panamalegallab.com" data-sitename="${site.upstreamPrefix.split('/').at(-1)}"></div><h1>Native H1 kept</h1><a id="logo" href="${SITES.fr.productionOrigin}/">Home editorial CTA</a><iframe src="https://script.google.com/macros/s/unchanged/exec?lang=${site.language}"></iframe>${footer}</body></html>`;
}
function expectedDelta(html,row,description){
 if(description)html=html.replace('</head>',meta(description)+'</head>');
 const start=html.indexOf('<footer'),end=html.indexOf('</footer>')+9;
 if(start<0)return html;
 const footer=html.slice(start,end).replace(/<small\b[^>]*>[\s\S]*?<\/small>/g,block=>{
  if(!Object.values(SITES).every(site=>block.includes(`href="${site.productionOrigin}/"`)))return block;
  for(const [lang,target] of Object.entries(row.alternatives))block=block.replaceAll(`href="${SITES[lang].productionOrigin}/"`,`href="${target}"`);
  return block;
 });
 return html.slice(0,start)+footer+html.slice(end);
}
async function runtimes(source,check){
 const options={modules:true,compatibilityDate:'2026-07-30',outboundService(request){
  const site=Object.values(SITES).find(value=>request.url.startsWith(value.upstreamRoot+'/'));
  assert.ok(site);return new Response(source(site,request.url),{headers:{'Content-Type':'text/html; charset=utf-8','Date':'Tue, 03 Nov 2026 00:00:00 GMT','Content-Security-Policy':"script-src 'nonce-readiness-native'",'X-Robots-Tag':'index, follow'}});
 }};
 const old=new Miniflare({...options,script:baselineWorker()}),next=new Miniflare({...options,scriptPath:candidate});
 try{await check(old,next);}finally{await Promise.all([old.dispose(),next.dispose()]);}
}
const get=(runtime,url,method='GET')=>runtime.dispatchFetch(url,{method,redirect:'manual'});

test('all252preferred pages have only intended148draft descriptions and756contextual foreignroot destinations',async()=>{
 let descriptions=0,targets=0;
 await runtimes((site,url)=>envelope(site,url),async(old,next)=>{
  for(const [url,row] of Object.entries(data.languageLinks)){
   const previous=await get(old,url);const before=await previous.text();const response=await get(next,url);const after=await response.text();assert.equal(response.status,200,url);assert.deepEqual([...response.headers],[...previous.headers],url);
   const description=data.descriptions[url]?.text;
   assert.equal(after,expectedDelta(before,row,description),url);if(description)descriptions++;
   for(const target of Object.values(row.alternatives)){assert.ok(after.includes(`href="${target}"`),`${url} -> ${target}`);targets++;}
   assert.ok(after.includes(`id="logo" href="${SITES.fr.productionOrigin}/"`));
   assert.ok(after.includes('<title>Native title kept</title>'));assert.ok(after.includes('<h1>Native H1 kept</h1>'));assert.ok(after.includes('nonce="readiness-native"'));
  }
 });assert.equal(descriptions,148);assert.equal(targets,756);
});

test('mapped metadata is one safelyescaped standard head tag; OG remains author content; HEAD/query keep contracts',async()=>{
 const url='https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama';
 await runtimes((site,upstream)=>envelope(site,upstream,footers.en,'<meta name="description" content="old"><meta NAME="DESCRIPTION" content="duplicate"><meta property="og:description" content="native OG">'),async(old,next)=>{
  const response=await get(next,url+'?utm_source=preserved&literal=%2F');const html=await response.text();assert.equal(response.status,200);
  assert.equal((html.match(/<meta\b[^>]*name="description"/gi)??[]).length,1);assert.ok(html.includes(meta(data.descriptions[url].text)));assert.ok(html.includes('content="native OG"'));
  assert.ok(!html.includes('utm_source=preserved&literal=%2F" target='));
  const a=await get(old,url,'HEAD'),b=await get(next,url,'HEAD');assert.equal(b.status,a.status);assert.deepEqual([...b.headers],[...a.headers]);assert.equal(await b.text(),'');
 });
});

test('unknown selector, badlabels, rootqueries, repeatedgroups and non-language links fail closed',async()=>{
 const url='https://en.panamalegallab.com/contact-us';
 const media=footers.en.replace(/(<a\b[^>]*href="https:\/\/fr\.panamalegallab\.com"[^>]*>)[\s\S]*?<\/a>/,'$1<img id="logo-inside-controls" alt="Logo" src="https://example.invalid/logo.png"></a>');
 const background=footers.en.replace(/(<a\b[^>]*href="https:\/\/fr\.panamalegallab\.com"[^>]*style=")[^"]*(")/,'$1background-image:url(https://example.invalid/logo.png);$2');
 const escapedBackground=background.replace('background-image:url',String.raw`b\61 ckground-image:u\72 l`);
 const variants=[media,background,escapedBackground,footers.en.replace('jsname="yePe5c"','role="contentinfo"'),footers.en.replace('>French<','>Home<'),footers.en.replaceAll('https://fr.panamalegallab.com/','https://fr.panamalegallab.com/?x=1'),footers.en+footers.en,footers.en.replaceAll('class="XqQF9c"','class="other"')];
 for(const footer of variants)await runtimes((site,upstream)=>envelope(site,upstream,footer),async(old,next)=>{
  const a=await get(old,url);const before=await a.text();const b=await get(next,url);const after=await b.text();assert.equal(b.status,a.status);assert.equal(after,before);
 });
});

test('preview, Search and newpage preserve baseline full responses',async()=>{
 const urls=['https://pll-seo-preview-20261102.pages.dev/en/contact-us','https://en.panamalegallab.com/new-published-page','https://en.panamalegallab.com/_/search?query=business&scope=site&showCloudSearchTab=false'];
 await runtimes((site,upstream)=>envelope(site,upstream),async(old,next)=>{
  for(const url of urls){const a=await get(old,url);const before=await a.text();const b=await get(next,url);const after=await b.text();assert.equal(b.status,a.status,url);assert.deepEqual([...b.headers],[...a.headers],url);assert.equal(after,before,url);}
 });
});


test('native home aliases use only their preferred canonical root description',async()=>{
 const aliases={es:'inicio',en:'home',fr:'accueil',it:'inizio'};
 await runtimes((site,upstream)=>envelope(site,upstream),async(old,next)=>{
  for(const [lang,alias] of Object.entries(aliases)){
   const root=SITES[lang].productionOrigin+'/';const url=SITES[lang].productionOrigin+'/'+alias;
   const a=await get(old,url);const before=await a.text();const b=await get(next,url);const after=await b.text();
   assert.equal(b.status,a.status);assert.deepEqual([...b.headers],[...a.headers]);assert.equal(after,before.replace('</head>',meta(data.descriptions[root].text)+'</head>'));
  }
 });
});


test('Site locale stays authoritative when native Google viewer declares en-US',async()=>{
 await runtimes((site,upstream)=>envelope(site,upstream).replace('<html lang="'+site.language+'">','<html lang="en-US">'),async(old,next)=>{
  for(const lang of ['en','fr','it']){
   const url=Object.keys(data.descriptions).find(url=>data.descriptions[url].language===lang);
   const a=await get(old,url);const before=await a.text();const b=await get(next,url);const after=await b.text();
   assert.equal(b.status,200);assert.equal(after,expectedDelta(before,data.languageLinks[url],data.descriptions[url].text));assert.ok(after.includes('<html lang="en-US">'));
  }
 });
});
