import { planDeliveryRequest } from '../renderer/src/plan.js';
import { IMAGE_PROFILES } from './image-profiles.js';
import { approvedProcessUrl, rewriteReferences, authorizedNonce, fallbackScript, insertFallback } from './image-helpers.js';

export const IMAGE_BODY_LIMIT=1_310_720;
export const IMAGE_DEADLINE_MS=1_000;
export const IMAGE_PREVIEW_ORIGIN='https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const utf8Html=/^text\/html\s*;\s*charset\s*=\s*(?:"utf-8"|utf-8)\s*$/iu;
const encoder=new TextEncoder();

function eligibleProfile(request, mode) {
  if(request.method!=='GET' || !['preview','all'].includes(mode)) return null;
  const plan=planDeliveryRequest(request.url,request.method);
  if(plan.kind!=='page' || plan.searchPage) return null;
  const profile=IMAGE_PROFILES.find(value=>value.language===plan.site.language
    && plan.canonical===plan.site.productionOrigin+value.canonicalPath);
  if(!profile) return null;
  if(plan.mode==='production') return mode==='all'?profile:null;
  return plan.previewOrigin===IMAGE_PREVIEW_ORIGIN
    && new URL(request.url).searchParams.get('_pll_speed')!=='control'?profile:null;
}

function visible(element) {
  const style=element.getAttribute('style')??'';
  return style.length<=8192 && !/[\\\u0000-\u001f]|\/\*/u.test(style)
    && !/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden)\b/iu.test(style)
    && element.getAttribute('hidden')===null && element.getAttribute('aria-hidden')?.trim().toLowerCase()!=='true';
}

export function createImageInspector(profile) {
  let state={html:0,head:0,body:0,root:0,section:0,widget:0,marker:0,charset:0,image:0,
    safe:true,url:null,nonces:[]};
  const count=name=>({element(element){state={...state,[name]:state[name]+1,safe:state.safe&&visible(element)};}});
  return {
    ...Object.fromEntries(['html','head','body','root','section','widget'].map(name=>[name,count(name)])),
    ancestor:{element(element){state={...state,safe:state.safe&&visible(element)};}},
    beforeImage:{element(){state={...state,safe:state.safe&&state.head===1};}},
    marker:{element(element){state={...state,marker:state.marker+1,safe:state.safe
      && element.getAttribute('data-domain')===profile.dataDomain && element.getAttribute('data-sitename')===profile.dataSiteName};}},
    charset:{element(element){state={...state,charset:state.charset+1,safe:state.safe&&/^utf-?8$/iu.test(element.getAttribute('charset')??'')};}},
    meta:{element(element){if(element.getAttribute('http-equiv')?.toLowerCase()==='content-security-policy') state={...state,safe:false};}},
    script:{element(element){const nonce=element.getAttribute('nonce');
      const dataOnly=['application/json','application/ld+json'].includes(element.getAttribute('type')?.trim().toLowerCase());
      // A URL edit must not invalidate a hash-only inline executable script.
      const authorizedShape=nonce!==null||element.getAttribute('src')!==null||dataOnly;
      state={...state,safe:state.safe&&authorizedShape};
      if(nonce!==null) state={...state,nonces:[...state.nonces,nonce],safe:state.safe&&state.nonces.length<256};}},
    image:{element(element){const url=approvedProcessUrl(element.getAttribute('src'));state={...state,image:state.image+1,url,
      safe:state.safe&&visible(element)&&Boolean(url)&&element.getAttribute('srcset')===null
        &&(element.getAttribute('class')??'').split(/\s+/u).includes(profile.imageClass)
        &&element.getAttribute('role')===profile.imageRole&&element.getAttribute('alt')===profile.imageAlt};}},
    result(){return ['html','head','body','root','section','widget','marker','charset','image'].every(name=>state[name]===1)
      &&state.safe?{url:state.url,nonces:state.nonces}:null;},
  };
}

function attach(rewriter, inspector, profile) {
  const section=`section[id="${profile.sectionId}"]`;
  const widget=`[id="${profile.widgetId}"]`;
  return rewriter.on('html',inspector.html).on('head',inspector.head).on('body',inspector.body)
    .on('div.UtePc',inspector.root).on(section,inspector.section).on(widget,inspector.widget)
    .on(`div.UtePc > ${section} ${widget} img`,inspector.image).on(`${section} div`,inspector.ancestor)
    .on('[data-domain][data-sitename]',inspector.marker).on('head meta[charset]',inspector.charset)
    .on('meta[http-equiv]',inspector.meta).on('script',inspector.script).on('img',inspector.beforeImage);
}

function cancelQuietly(reader) {
  // Do not await tee cancellation: it can wait for the untouched original body.
  try{reader?.cancel().catch(()=>{});}catch{/* Already closed. */}
}

async function readBounded(reader) {
  let size=0;const chunks=[];
  while(true){const chunk=await reader.read();if(chunk.done)break;
    size+=chunk.value.byteLength;if(size>IMAGE_BODY_LIMIT)return null;chunks.push(chunk.value);}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return bytes;
}

async function inspectResponse(response,profile,Rewriter,timing) {
  let sourceReader,parserReader,timer,aborted=false;
  const deadline=new Promise(resolve=>{timer=timing.setTimeout(()=>{aborted=true;resolve(null);},IMAGE_DEADLINE_MS);timer?.unref?.();});
  try{
    sourceReader=response.clone().body.getReader();
    const inspection=(async()=>{
      const bytes=await readBounded(sourceReader);if(!bytes||aborted)return null;
      // ignoreBOM=true retains U+FEFF. Fatal decode + roundtrip prohibits lossy changes.
      const html=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
      const roundtrip=encoder.encode(html);
      if(roundtrip.length!==bytes.length||!roundtrip.every((value,index)=>value===bytes[index]))return null;
      const inspector=createImageInspector(profile);
      parserReader=attach(new Rewriter(),inspector,profile).transform(new Response(bytes)).body.getReader();
      while(!(await parserReader.read()).done){if(aborted)return null; /* Discard all parser serialization. */}
      if(aborted)return null;
      const selected=inspector.result();if(!selected)return null;
      const nonce=authorizedNonce(response.headers.get('Content-Security-Policy'),selected.nonces);if(!nonce)return null;
      const rewritten=rewriteReferences(html,selected.url);if(!rewritten)return null;
      const script=fallbackScript(selected.url,selected.url+'-rw');
      const result=insertFallback(rewritten,script,nonce);
      return result?encoder.encode(result):null;
    })();
    return await Promise.race([inspection,deadline]);
  }catch{return null;}
  finally{aborted=true;timing.clearTimeout(timer);cancelQuietly(parserReader);cancelQuietly(sourceReader);}
}

export async function withImageFormat(response,request,environment,options={}) {
  try{
    if(response.status!==200||!response.body||response.headers.has('Content-Encoding')
      ||!utf8Html.test(response.headers.get('Content-Type')??''))return response;
    const profile=eligibleProfile(request,environment?.PLL_IMAGE_FORMAT);if(!profile)return response;
    const policy=profile.kind===undefined?'process-webp-v1'
      :profile.kind==='bank-corporate'?'bank-corporate-webp-v1':null;
    if(!policy)return response;
    const Rewriter=options.Rewriter??globalThis.HTMLRewriter;if(typeof Rewriter!=='function')return response;
    const bytes=await inspectResponse(response,profile,Rewriter,options.timing??globalThis);if(!bytes)return response;
    const headers=new Headers(response.headers);
    for(const name of ['Content-Length','ETag','Content-MD5','Digest','Content-Digest','Repr-Digest']) headers.delete(name);
    headers.set('X-PLL-Image-Policy',`${policy}-${profile.language}`);
    const delivered=new Response(bytes,{status:response.status,statusText:response.statusText,headers});
    // The replacement is complete; release the discarded original tee branch.
    try{response.body.cancel().catch(()=>{});}catch{/* Already closed. */}
    return delivered;
  }catch{return response;}
}
