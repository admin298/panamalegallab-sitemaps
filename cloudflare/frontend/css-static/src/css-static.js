import { planDeliveryRequest } from '../renderer/src/plan.js';
import { authorizedNonce } from './image-helpers.js';

export const CSS_NATIVE_URL='https://www.gstatic.com/_/atari/_/ss/k=atari.vw.VWOdPCMSEos.L.X.O/am=AAAAGAAE/d=1/rs=AGEqA5kDZG7hRoGssZU386DkZtLorCpeeA';
export const CSS_ASSET_PATH='/_pll-assets/sites-7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61.css';
export const CSS_BODY_LIMIT=1_310_720;
export const CSS_DEADLINE_MS=1_000;
const PREVIEW='https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const utf8Html=/^text\/html\s*;\s*charset\s*=\s*(?:"utf-8"|utf-8)\s*$/iu;
const noncePattern=/^[A-Za-z0-9+/_-]{8,256}={0,2}$/u;
const encoder=new TextEncoder();

function eligibleSite(request, mode) {
  if(request.method!=='GET'||!['preview','all'].includes(mode))return null;
  const plan=planDeliveryRequest(request.url,request.method);
  if(plan.kind!=='page'||plan.searchPage)return null;
  if(plan.mode==='production')return mode==='all'?plan.site:null;
  return plan.previewOrigin===PREVIEW&&new URL(request.url).searchParams.get('_pll_speed')!=='control'?plan.site:null;
}

export function stylePolicyAbsent(csp) {
  // The snapshot has no style/default restriction. Future styling policies are
  // deliberately unsupported: never weaken CSP or assume script nonce = style nonce.
  return typeof csp==='string'&&csp.length>0&&!csp.split(',').some(policy=>policy.split(';')
    .some(raw=>/^(?:default-src|style-src(?:-elem|-attr)?)$/iu.test(raw.trim().split(/\s+/u)[0])));
}

function approvedLink(get) {
  return get('href')===CSS_NATIVE_URL&&get('data-id')==='_cl'
    &&get('rel')?.toLowerCase()==='stylesheet'&&noncePattern.test(get('nonce')??'')
    &&get('integrity')===null;
}

export function createCssInspector(site) {
  let state={html:0,head:0,body:0,marker:0,charset:0,links:0,selected:0,safe:true,nonces:[]};
  const count=name=>({element(){state={...state,[name]:state[name]+1};}});
  return {
    ...Object.fromEntries(['html','head','body'].map(name=>[name,count(name)])),
    base:{element(){state={...state,safe:false};}},
    marker:{element(element){state={...state,marker:state.marker+1,safe:state.safe
      &&element.getAttribute('data-domain')==='panamalegallab.com'
      &&element.getAttribute('data-sitename')===site.upstreamPrefix.split('/').at(-1)};}},
    charset:{element(element){state={...state,charset:state.charset+1,safe:state.safe&&/^utf-?8$/iu.test(element.getAttribute('charset')??'')};}},
    meta:{element(element){if(/^content-security-policy(?:-report-only)?$/iu.test(element.getAttribute('http-equiv')?.trim()??''))state={...state,safe:false};}},
    script:{element(element){const nonce=element.getAttribute('nonce');
      const dataOnly=['application/json','application/ld+json'].includes(element.getAttribute('type')?.trim().toLowerCase());
      state={...state,safe:state.safe&&(nonce!==null||element.getAttribute('src')!==null||dataOnly)};
      if(nonce!==null)state={...state,nonces:[...state.nonces,nonce],safe:state.safe&&state.nonces.length<256};}},
    link:{element(element){if(element.getAttribute('data-id')==='_cl')state={...state,links:state.links+1};}},
    headLink:{element(element){if(element.getAttribute('data-id')==='_cl')state={...state,selected:state.selected+1,
      safe:state.safe&&approvedLink(name=>element.getAttribute(name))};}},
    result(){return state.safe&&['html','head','body','marker','charset','links','selected'].every(name=>state[name]===1)?state.nonces:null;},
  };
}

function attach(rewriter,inspector) {
  return rewriter.on('html',inspector.html).on('head',inspector.head).on('body',inspector.body)
    .on('base',inspector.base).on('[data-domain][data-sitename]',inspector.marker)
    .on('head meta[charset]',inspector.charset).on('meta[http-equiv]',inspector.meta)
    .on('script',inspector.script).on('link',inspector.link).on('head link',inspector.headLink);
}

export function cssFallbackScript() {
  // Fixed public ASCII constants only. Capture load errors before the native link;
  // a WeakSet permits each failed mapped LINK to recover once, including clones.
  return `(()=>{const o=${JSON.stringify(CSS_NATIVE_URL)},v=${JSON.stringify(CSS_ASSET_PATH)},seen=new WeakSet;document.addEventListener('error',e=>{const n=e.target;if(!n||n.tagName!=='LINK'||seen.has(n)||n.getAttribute('rel')?.toLowerCase()!=='stylesheet'||n.getAttribute('data-id')!=='_cl'||(n.getAttribute('href')!==v&&n.href!==document.location.origin+v))return;seen.add(n);n.setAttribute('href',o)},true)})();`;
}

function linkAttributes(tag) {
  const attrs=new Map();let rest=tag.slice(5,-1),offset=5;
  while(rest.length){
    if(/^\s*\/?\s*$/u.test(rest))break;
    const match=/^\s+([a-z_:][a-z0-9_:.-]*)(?:\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)'))?/iu.exec(rest);
    if(!match)return null;
    const name=match[1].toLowerCase();if(attrs.has(name))return null;
    const value=match[2]??match[3]??'';
    const valueAt=match[0].indexOf('=');
    attrs.set(name,{value,start:offset+(valueAt<0?match[0].length:match[0].search(/["']/u)+1),length:value.length});
    offset+=match[0].length;rest=rest.slice(match[0].length);
  }
  return attrs;
}

function inertSpans(html) {
  // ASCII folding preserves source offsets even for Unicode letters such as İ.
  const lower=html.replace(/[A-Z]/gu,letter=>letter.toLowerCase()),spans=[];
  const starts=/<!--|<(script|style|title|textarea|xmp|iframe|noembed|noframes|noscript)\b[^<>]*>/giu;
  let match;
  // Advance past each complete raw-text block. Missing closes fail immediately;
  // repeated malformed openers cannot trigger quadratic regular-expression scans.
  while((match=starts.exec(html))!==null){
    let end;
    if(match[0]==='<!--'){
      const close=html.indexOf('-->',starts.lastIndex);if(close<0)return null;end=close+3;
    }else{
      const name=match[1].toLowerCase(),close=lower.indexOf('</'+name,starts.lastIndex);
      if(close<0)return null;
      const closing=/^<\/[a-z]+\s*>/iu.exec(html.slice(close,close+256));
      if(!closing||!closing[0].toLowerCase().startsWith('</'+name)||!/^\s*>$/u.test(closing[0].slice(name.length+2)))return null;
      end=close+closing[0].length;
    }
    spans.push({start:match.index,end});starts.lastIndex=end;
  }
  return spans;
}

export function spliceCssLink(html,nonce) {
  if(!noncePattern.test(nonce))return null;
  const heads=[...html.matchAll(/<head(?:\s[^<>]*)?>/giu)],ends=[...html.matchAll(/<\/head\s*>/giu)];
  if(heads.length!==1||ends.length!==1||/["']/u.test(heads[0][0]))return null;
  const begin=heads[0].index+heads[0][0].length,end=ends[0].index;
  if(begin>=end)return null;
  // Native parsing proves structure, while this read-only classifier keeps the
  // exact-byte splice out of comments and raw-text/script strings.
  const inert=inertSpans(html);if(!inert)return null;
  const candidates=[];
  for(const match of html.matchAll(/<link\b[^<>]*>/giu)){
    const attrs=linkAttributes(match[0]);if(!attrs)return null;
    if(attrs.get('data-id')?.value!=='_cl')continue;
    if(match.index<begin||match.index>=end||inert.some(span=>match.index>=span.start&&match.index<span.end)
      ||!approvedLink(name=>attrs.get(name)?.value??null))return null;
    const href=attrs.get('href');candidates.push({start:match.index+href.start,end:match.index+href.start+href.length});
  }
  if(candidates.length!==1)return null;
  const span=candidates[0];
  const rewritten=html.slice(0,span.start)+CSS_ASSET_PATH+html.slice(span.end);
  return rewritten.slice(0,begin)+`<script nonce="${nonce}" data-pll-css-fallback="v1">${cssFallbackScript()}</script>`+rewritten.slice(begin);
}

function cancelQuietly(reader) {
  // A cloned tee's cancellation can wait on the original, so never await it.
  try{reader?.cancel().catch(()=>{});}catch{/* Already closed. */}
}

async function readBounded(reader) {
  let size=0;const chunks=[];
  while(true){const chunk=await reader.read();if(chunk.done)break;
    size+=chunk.value.byteLength;if(size>CSS_BODY_LIMIT)return null;chunks.push(chunk.value);}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return bytes;
}

async function inspect(response,site,Rewriter,timing) {
  let sourceReader,parserReader,timer,aborted=false;
  const deadline=new Promise(resolve=>{timer=timing.setTimeout(()=>{aborted=true;resolve(null);},CSS_DEADLINE_MS);timer?.unref?.();});
  try{
    sourceReader=response.clone().body.getReader();
    const inspection=(async()=>{
      const bytes=await readBounded(sourceReader);if(!bytes||aborted)return null;
      const html=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
      const roundtrip=encoder.encode(html);
      if(roundtrip.length!==bytes.length||!roundtrip.every((value,index)=>value===bytes[index]))return null;
      const inspector=createCssInspector(site);
      parserReader=attach(new Rewriter(),inspector).transform(new Response(bytes)).body.getReader();
      while(!(await parserReader.read()).done){if(aborted)return null;}
      if(aborted)return null;
      const nonces=inspector.result();if(!nonces)return null;
      const nonce=authorizedNonce(response.headers.get('Content-Security-Policy'),nonces);if(!nonce)return null;
      const result=spliceCssLink(html,nonce);return result?encoder.encode(result):null;
    })();
    return await Promise.race([inspection,deadline]);
  }catch{return null;}
  finally{aborted=true;timing.clearTimeout(timer);cancelQuietly(parserReader);cancelQuietly(sourceReader);}
}

export async function withCssStatic(response,request,environment,options={}) {
  try{
    if(response.status!==200||!response.body||response.headers.has('Content-Encoding')
      ||!utf8Html.test(response.headers.get('Content-Type')??'')
      ||!stylePolicyAbsent(response.headers.get('Content-Security-Policy')))return response;
    const site=eligibleSite(request,environment?.PLL_CSS_STATIC);if(!site)return response;
    const Rewriter=options.Rewriter??globalThis.HTMLRewriter;if(typeof Rewriter!=='function')return response;
    const bytes=await inspect(response,site,Rewriter,options.timing??globalThis);if(!bytes)return response;
    const headers=new Headers(response.headers);
    for(const name of ['Content-Length','ETag','Content-MD5','Digest','Content-Digest','Repr-Digest'])headers.delete(name);
    headers.set('X-PLL-CSS-Policy',`static-exact-v1-${site.language}`);
    const delivered=new Response(bytes,{status:response.status,statusText:response.statusText,headers});
    try{response.body.cancel().catch(()=>{});}catch{/* Already closed. */}
    return delivered;
  }catch{return response;}
}
