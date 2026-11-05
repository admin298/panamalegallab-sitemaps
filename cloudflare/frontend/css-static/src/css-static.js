import { planDeliveryRequest } from '../renderer/src/plan.js';
import { authorizedNonce } from './image-helpers.js';
import { collectRawTextSpans, elementAttributes, applyTextEdits } from './html-spans.js';
import { impressionPolicyEnabled, impressionDocumentEdit } from './native-impressions.js';

export const CSS_NATIVE_URL='https://www.gstatic.com/_/atari/_/ss/k=atari.vw.VWOdPCMSEos.L.X.O/am=AAAAGAAE/d=1/rs=AGEqA5kDZG7hRoGssZU386DkZtLorCpeeA';
export const CSS_ASSET_PATH='/_pll-assets/sites-7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61.css';
export const CSS_BODY_LIMIT=1_310_720;
export const CSS_DEADLINE_MS=1_000;
const PREVIEW='https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const utf8Html=/^text\/html\s*;\s*charset\s*=\s*(?:"utf-8"|utf-8)\s*$/iu;
const noncePattern=/^[A-Za-z0-9+/_-]{8,256}={0,2}$/u;
const encoder=new TextEncoder();

function eligiblePolicies(request, environment) {
  const mode=environment?.PLL_CSS_STATIC, impressionMode=environment?.PLL_NATIVE_IMPRESSIONS;
  if(request.method!=='GET'||![mode,impressionMode].some(value=>['preview','all'].includes(value)))return null;
  const plan=planDeliveryRequest(request.url,request.method);
  if(plan.kind!=='page'||plan.searchPage)return null;
  const css=plan.mode==='production'?mode==='all':plan.previewOrigin===PREVIEW
    &&['preview','all'].includes(mode)&&new URL(request.url).searchParams.get('_pll_speed')!=='control';
  const impressions=impressionPolicyEnabled(request,impressionMode,plan);
  return css||impressions?{site:plan.site,css,impressions}:null;
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
  let state={html:0,head:0,body:0,marker:0,charset:0,links:0,selected:0,safe:true,cssSafe:true,nonces:[]};
  const count=name=>({element(){state={...state,[name]:state[name]+1};}});
  const context=()=>{
    const valid=state.safe&&['html','head','body','marker','charset'].every(name=>state[name]===1);
    return {nonces:valid?state.nonces:null,cssValid:valid&&state.cssSafe&&['links','selected'].every(name=>state[name]===1)};
  };
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
      cssSafe:state.cssSafe&&approvedLink(name=>element.getAttribute(name))};}},
    context,
    result(){const result=context();return result.cssValid?result.nonces:null;},
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

function cssLinkEdits(html,nonce,inert) {
  if(!noncePattern.test(nonce))return null;
  const heads=[...html.matchAll(/<head(?:\s[^<>]*)?>/giu)],ends=[...html.matchAll(/<\/head\s*>/giu)];
  if(heads.length!==1||ends.length!==1||/["']/u.test(heads[0][0]))return null;
  const begin=heads[0].index+heads[0][0].length,end=ends[0].index;
  if(begin>=end)return null;
  // Native parsing proves structure, while this read-only classifier keeps the
  // exact-byte splice out of comments and raw-text/script strings.
  if(!inert)return null;
  const candidates=[];
  for(const match of html.matchAll(/<link\b[^<>]*>/giu)){
    const attrs=elementAttributes(match[0],'link');if(!attrs)return null;
    if(attrs.get('data-id')?.value!=='_cl')continue;
    if(match.index<begin||match.index>=end||inert.some(span=>match.index>=span.start&&match.index<span.end)
      ||!approvedLink(name=>attrs.get(name)?.value??null))return null;
    const href=attrs.get('href');candidates.push({start:match.index+href.start,end:match.index+href.start+href.length});
  }
  if(candidates.length!==1)return null;
  const span=candidates[0];
  return [{start:span.start,end:span.end,replacement:CSS_ASSET_PATH},
    {start:begin,end:begin,replacement:`<script nonce="${nonce}" data-pll-css-fallback="v1">${cssFallbackScript()}</script>`}];
}

export function spliceCssLink(html,nonce) {
  const edits=cssLinkEdits(html,nonce,collectRawTextSpans(html));
  return edits?applyTextEdits(html,edits):null;
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

async function inspect(response,policies,Rewriter,timing) {
  let sourceReader,parserReader,timer,aborted=false;
  const deadline=new Promise(resolve=>{timer=timing.setTimeout(()=>{aborted=true;resolve(null);},CSS_DEADLINE_MS);timer?.unref?.();});
  try{
    sourceReader=response.clone().body.getReader();
    const inspection=(async()=>{
      const bytes=await readBounded(sourceReader);if(!bytes||aborted)return null;
      const html=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
      const roundtrip=encoder.encode(html);
      if(roundtrip.length!==bytes.length||!roundtrip.every((value,index)=>value===bytes[index]))return null;
      const inspector=createCssInspector(policies.site);
      parserReader=attach(new Rewriter(),inspector).transform(new Response(bytes)).body.getReader();
      while(!(await parserReader.read()).done){if(aborted)return null;}
      if(aborted)return null;
      const context=inspector.context();if(!context.nonces)return null;
      const nonce=authorizedNonce(response.headers.get('Content-Security-Policy'),context.nonces);if(!nonce)return null;
      const spans=collectRawTextSpans(html);if(!spans)return null;
      const css=policies.css&&context.cssValid?cssLinkEdits(html,nonce,spans):null;
      const impressions=policies.impressions?impressionDocumentEdit(html,policies.site,nonce,spans):null;
      if(!css&&!impressions)return null;
      const edits=[...(css??[]),...(impressions?[impressions]:[])];
      const result=applyTextEdits(html,edits);
      return result?{bytes:encoder.encode(result),css:Boolean(css),impressions:Boolean(impressions)}:null;
    })();
    return await Promise.race([inspection,deadline]);
  }catch{return null;}
  finally{aborted=true;timing.clearTimeout(timer);cancelQuietly(parserReader);cancelQuietly(sourceReader);}
}

export async function withCssStatic(response,request,environment,options={}) {
  try{
    if(response.status!==200||!response.body||response.headers.has('Content-Encoding')
      ||!utf8Html.test(response.headers.get('Content-Type')??''))return response;
    const selected=eligiblePolicies(request,environment);if(!selected)return response;
    const policies={...selected,css:selected.css&&stylePolicyAbsent(response.headers.get('Content-Security-Policy'))};
    if(!policies.css&&!policies.impressions)return response;
    const Rewriter=options.Rewriter??globalThis.HTMLRewriter;if(typeof Rewriter!=='function')return response;
    const result=await inspect(response,policies,Rewriter,options.timing??globalThis);if(!result)return response;
    const headers=new Headers(response.headers);
    for(const name of ['Content-Length','ETag','Content-MD5','Digest','Content-Digest','Repr-Digest'])headers.delete(name);
    if(result.css)headers.set('X-PLL-CSS-Policy',`static-exact-v1-${policies.site.language}`);
    if(result.impressions)headers.set('X-PLL-Impression-Policy',`native-noop-v1-${policies.site.language}`);
    const delivered=new Response(result.bytes,{status:response.status,statusText:response.statusText,headers});
    try{response.body.cancel().catch(()=>{});}catch{/* Already closed. */}
    return delivered;
  }catch{return response;}
}
