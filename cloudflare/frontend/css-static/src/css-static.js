import { planDeliveryRequest } from '../renderer/src/plan.js';
import { authorizedNonce } from './image-helpers.js';
import { collectRawTextSpans, elementAttributes, applyTextEdits } from './html-spans.js';
import { impressionPolicyEnabled, impressionDocumentEdit } from './native-impressions.js';
import { initialRenderPolicyEnabled, fontDocumentEdit, frameDocumentEdit, approvedFrame, INVALID_FONT_URL } from './initial-render.js';
import { HOME_OVERLAY_PROFILES, HOME_SECTION_ID, createOverlayInspector, overlayDocumentEdit } from './home-overlay.js';

export const CSS_NATIVE_URL='https://www.gstatic.com/_/atari/_/ss/k=atari.vw.VWOdPCMSEos.L.X.O/am=AAAAGAAE/d=1/rs=AGEqA5kDZG7hRoGssZU386DkZtLorCpeeA';
export const CSS_ASSET_PATH='/_pll-assets/sites-7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61.css';
export const CSS_CONTRACTS=Object.freeze([
  Object.freeze({id:'native-20261104',nativeUrl:CSS_NATIVE_URL,assetPath:CSS_ASSET_PATH,
    sha256:'7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61',bytes:1_954_605}),
  Object.freeze({id:'native-20261106',nativeUrl:'https://www.gstatic.com/_/atari/_/ss/k=atari.vw.FdCCmLj_-18.L.X.O/am=AAAAYAAI/d=1/rs=AGEqA5n0xDEdNb8kZN9KvVeGKVosSfnN8Q',
    assetPath:'/_pll-assets/sites-790a81d59f7bd31d12167ffe5405befff4738f024acd6ed39ab40a25b020291d.css',
    sha256:'790a81d59f7bd31d12167ffe5405befff4738f024acd6ed39ab40a25b020291d',bytes:1_955_718}),
]);
export const CSS_BODY_LIMIT=1_310_720;
export const CSS_DEADLINE_MS=1_000;
const PREVIEW='https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const utf8Html=/^text\/html\s*;\s*charset\s*=\s*(?:"utf-8"|utf-8)\s*$/iu;
const noncePattern=/^[A-Za-z0-9+/_-]{8,256}={0,2}$/u;
const encoder=new TextEncoder();

function eligiblePolicies(request, environment) {
  const mode=environment?.PLL_CSS_STATIC, impressionMode=environment?.PLL_NATIVE_IMPRESSIONS,initialMode=environment?.PLL_INITIAL_RENDER;
  if(request.method!=='GET'||![mode,impressionMode,initialMode].some(value=>['preview','all'].includes(value)))return null;
  const plan=planDeliveryRequest(request.url,request.method);
  if(plan.kind!=='page'||plan.searchPage)return null;
  const css=plan.mode==='production'?mode==='all':plan.previewOrigin===PREVIEW
    &&['preview','all'].includes(mode)&&new URL(request.url).searchParams.get('_pll_speed')!=='control';
  const impressions=impressionPolicyEnabled(request,impressionMode,plan);
  const initial=initialRenderPolicyEnabled(request,initialMode,plan);
  return css||impressions||initial?{site:plan.site,css,impressions,initial,
    overlayProfile:initial&&plan.canonical===plan.site.productionOrigin+'/'?HOME_OVERLAY_PROFILES[plan.site.language]:null}:null;
}

export function stylePolicyAbsent(csp) {
  // The snapshot has no style/default restriction. Future styling policies are
  // deliberately unsupported: never weaken CSP or assume script nonce = style nonce.
  return typeof csp==='string'&&csp.length>0&&!csp.split(',').some(policy=>policy.split(';')
    .some(raw=>/^(?:default-src|style-src(?:-elem|-attr)?)$/iu.test(raw.trim().split(/\s+/u)[0])));
}

function approvedLink(get) {
  return CSS_CONTRACTS.some(contract=>get('href')===contract.nativeUrl)&&get('data-id')==='_cl'
    &&get('rel')?.toLowerCase()==='stylesheet'&&noncePattern.test(get('nonce')??'')
    &&get('integrity')===null;
}

export function createCssInspector(site,overlayProfile=null) {
  let state={html:0,head:0,body:0,marker:0,charset:0,links:0,selected:0,fonts:0,headFonts:0,frames:0,frameSafe:true,safe:true,cssSafe:true,nonces:[]};
  const overlay=createOverlayInspector(overlayProfile);
  const count=name=>({element(){state={...state,[name]:state[name]+1};}});
  const context=()=>{
    const valid=state.safe&&['html','head','body','marker','charset'].every(name=>state[name]===1);
    return {nonces:valid?state.nonces:null,cssValid:valid&&state.cssSafe&&['links','selected'].every(name=>state[name]===1),
      fontValid:valid&&state.fonts===1&&state.headFonts===1,
      frameValid:valid&&state.frames===1&&state.frameSafe,overlayValid:valid&&overlay.valid()};
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
    link:{element(element){if(element.getAttribute('data-id')==='_cl')state={...state,links:state.links+1};
      if(element.getAttribute('href')===INVALID_FONT_URL)state={...state,fonts:state.fonts+1};}},
    headLink:{element(element){if(element.getAttribute('data-id')==='_cl')state={...state,selected:state.selected+1,
      cssSafe:state.cssSafe&&approvedLink(name=>element.getAttribute(name))};
      if(element.getAttribute('href')===INVALID_FONT_URL)state={...state,headFonts:state.headFonts+1};}},
    frame:{element(element){if(element.getAttribute('src')?.startsWith('https://script.google.com/'))state={...state,
      frames:state.frames+1,frameSafe:state.frameSafe&&approvedFrame(name=>element.getAttribute(name),site.language)};}},
    overlay,
    context,
    result(){const result=context();return result.cssValid?result.nonces:null;},
  };
}

function attach(rewriter,inspector,overlayProfile) {
  const result=rewriter.on('html',inspector.html).on('head',inspector.head).on('body',inspector.body)
    .on('base',inspector.base).on('[data-domain][data-sitename]',inspector.marker)
    .on('head meta[charset]',inspector.charset).on('meta[http-equiv]',inspector.meta)
    .on('script',inspector.script).on('link',inspector.link).on('head link',inspector.headLink).on('iframe',inspector.frame);
  if(!overlayProfile)return result;
  const section=`div.UtePc > section[id="${HOME_SECTION_ID}"]`,widget=`${section} [id="${overlayProfile.widgetId}"]`;
  return result.on('div.UtePc',inspector.overlay.root).on('div.UtePc > section',inspector.overlay.firstSection)
    .on(section,inspector.overlay.section).on(widget,inspector.overlay.widget)
    .on(`${widget} img`,inspector.overlay.image).on(`${section} section`,inspector.overlay.nested);
}

export function cssFallbackScript() {
  // Fixed public ASCII constants only. Capture load errors before the native link;
  // a WeakSet permits each failed mapped LINK to recover once, including clones.
  const originals=Object.fromEntries(CSS_CONTRACTS.map(contract=>[contract.assetPath,contract.nativeUrl]));
  return `(()=>{const originals=${JSON.stringify(originals)},seen=new WeakSet;document.addEventListener('error',e=>{const n=e.target;if(!n||n.tagName!=='LINK'||seen.has(n)||n.getAttribute('rel')?.toLowerCase()!=='stylesheet'||n.getAttribute('data-id')!=='_cl')return;const href=n.getAttribute('href'),key=Object.keys(originals).find(v=>href===v||n.href===document.location.origin+v);if(!key)return;seen.add(n);n.setAttribute('href',originals[key])},true)})();`;
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
    const href=attrs.get('href'),contract=CSS_CONTRACTS.find(value=>value.nativeUrl===href.value);
    candidates.push({start:match.index+href.start,end:match.index+href.start+href.length,contract});
  }
  if(candidates.length!==1)return null;
  const span=candidates[0];
  return [{start:span.start,end:span.end,replacement:span.contract.assetPath},
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
      const inspector=createCssInspector(policies.site,policies.overlayProfile);
      parserReader=attach(new Rewriter(),inspector,policies.overlayProfile).transform(new Response(bytes)).body.getReader();
      while(!(await parserReader.read()).done){if(aborted)return null;}
      if(aborted)return null;
      const context=inspector.context();if(!context.nonces)return null;
      const nonce=authorizedNonce(response.headers.get('Content-Security-Policy'),context.nonces);if(!nonce)return null;
      const spans=collectRawTextSpans(html);if(!spans)return null;
      const css=policies.css&&context.cssValid?cssLinkEdits(html,nonce,spans):null;
      const impressions=policies.impressions?impressionDocumentEdit(html,policies.site,nonce,spans):null;
      const font=policies.initial?fontDocumentEdit(html,spans,context.fontValid):null;
      const frame=policies.initial?frameDocumentEdit(html,policies.site.language,spans,context.frameValid):null;
      const overlay=policies.overlayProfile?overlayDocumentEdit(html,policies.site.language,spans,context.overlayValid):null;
      if(!css&&!impressions&&!font&&!frame&&!overlay)return null;
      const edits=[...(css??[]),...(impressions?[impressions]:[]),...(font?[font]:[]),...(frame?[frame]:[]),...(overlay?[overlay]:[])];
      const result=applyTextEdits(html,edits);
      return result?{bytes:encoder.encode(result),css:Boolean(css),impressions:Boolean(impressions),
        initial:[font?'font':null,frame?'lazy-frame':null,overlay?'home-ratio':null].filter(Boolean)}:null;
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
    const stylesAbsent=stylePolicyAbsent(response.headers.get('Content-Security-Policy'));
    const policies={...selected,css:selected.css&&stylesAbsent,overlayProfile:stylesAbsent?selected.overlayProfile:null};
    if(!policies.css&&!policies.impressions&&!policies.initial)return response;
    const Rewriter=options.Rewriter??globalThis.HTMLRewriter;if(typeof Rewriter!=='function')return response;
    const result=await inspect(response,policies,Rewriter,options.timing??globalThis);if(!result)return response;
    const headers=new Headers(response.headers);
    for(const name of ['Content-Length','ETag','Content-MD5','Digest','Content-Digest','Repr-Digest'])headers.delete(name);
    if(result.css)headers.set('X-PLL-CSS-Policy',`static-exact-v1-${policies.site.language}`);
    if(result.impressions)headers.set('X-PLL-Impression-Policy',`native-noop-v1-${policies.site.language}`);
    if(result.initial.length){headers.set('X-PLL-Initial-Render-Policy',`initial-render-v1-${policies.site.language}`);
      headers.set('X-PLL-Initial-Render-Edits',result.initial.join(','));}
    const delivered=new Response(result.bytes,{status:response.status,statusText:response.statusText,headers});
    try{response.body.cancel().catch(()=>{});}catch{/* Already closed. */}
    return delivered;
  }catch{return response;}
}
