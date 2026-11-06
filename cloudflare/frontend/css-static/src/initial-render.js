import { elementAttributes } from './html-spans.js';
import { CACHE_PATHS } from './cache-routes.js';

export const INVALID_FONT_URL='https://fonts.googleapis.com/css?family=Century%20Gothic%3Ai%2Cbi%2C700%2C400&display=swap';
const PREVIEW='https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const normalizedMode=mode=>['preview','all'].includes(mode)?mode:'off';
const noncePattern=/^[A-Za-z0-9+/_-]{8,256}={0,2}$/u;
export const APP_SCRIPT_BASE='https://script.google.com/macros/s/AKfycbwpm6hhxmlmZkN3a2QAQWyXn1hnLE9mvbm9lLr8c_YvYapHjY59vIREKmxs2mMK94Vq/exec?lang=';
export const APP_SCRIPT_SANDBOX='allow-scripts allow-popups allow-forms allow-same-origin allow-popups-to-escape-sandbox allow-downloads allow-modals allow-storage-access-by-user-activation';

export function initialRenderPolicyEnabled(request,mode,plan) {
  if(request.method!=='GET'||normalizedMode(mode)==='off'||plan?.kind!=='page'||plan.searchPage)return false;
  if(!CACHE_PATHS[plan.site?.language]?.some(path=>plan.canonical===plan.site.productionOrigin+path))return false;
  if(plan.mode==='production')return mode==='all';
  if(plan.mode!=='preview'||plan.previewOrigin!==PREVIEW)return false;
  const values=new URL(request.url).searchParams.getAll('_pll_initial_render');
  return values.length===0||(values.length===1&&values[0]==='candidate');
}

export function initialRenderCacheRevision(base,mode) {
  const selected=normalizedMode(mode);
  return selected==='off'?base:base+'-initial-v1-'+selected;
}

// The existing native inspector attests one real head link and document identity.
// This lexical pass removes its complete original tag without serializing HTML.
export function fontDocumentEdit(html,spans,nativeValid) {
  if(!nativeValid||!Array.isArray(spans))return null;
  const heads=[...html.matchAll(/<head(?:\s[^<>]*)?>/giu)],ends=[...html.matchAll(/<\/head\s*>/giu)];
  if(heads.length!==1||ends.length!==1||/["']/u.test(heads[0][0]))return null;
  const begin=heads[0].index+heads[0][0].length,end=ends[0].index;
  if(begin>=end)return null;
  const candidates=[];
  for(const match of html.matchAll(/<link\b[^<>]*>/giu)){
    const attrs=elementAttributes(match[0],'link');if(!attrs)return null;
    if(attrs.get('href')?.value!==INVALID_FONT_URL)continue;
    if(match.index<begin||match.index>=end||spans.some(span=>match.index>=span.start&&match.index<span.end)
      ||attrs.size!==3||![...attrs.keys()].every(name=>['href','rel','nonce'].includes(name))
      ||attrs.get('rel')?.value.toLowerCase()!=='stylesheet'||!noncePattern.test(attrs.get('nonce')?.value??''))return null;
    candidates.push({start:match.index,end:match.index+match[0].length,replacement:''});
  }
  return candidates.length===1?candidates[0]:null;
}

export function approvedFrame(get,language) {
  return ['es','en','fr','it'].includes(language)&&get('src')===APP_SCRIPT_BASE+language
    &&get('jsname')==='L5Fo6c'&&get('class')==='YMEQtf'&&get('sandbox')===APP_SCRIPT_SANDBOX
    &&get('frameborder')==='0'&&get('aria-label')==='Apps Script'&&get('allowfullscreen')==='';
}

export function frameDocumentEdit(html,language,spans,nativeValid) {
  if(!nativeValid||!Array.isArray(spans))return null;
  const bodies=[...html.matchAll(/<body(?:\s[^<>]*)?>/giu)],ends=[...html.matchAll(/<\/body\s*>/giu)];
  if(bodies.length!==1||ends.length!==1)return null;
  const begin=bodies[0].index+bodies[0][0].length,end=ends[0].index,candidates=[];
  for(const match of html.matchAll(/<iframe\b[^<>]*>/giu)){
    const attrs=elementAttributes(match[0],'iframe');if(!attrs)return null;
    if(!attrs.get('src')?.value.startsWith('https://script.google.com/'))continue;
    const raw=spans.find(span=>span.start===match.index&&span.kind==='iframe');
    if(match.index<begin||match.index>=end||!raw||raw.contentEnd!==raw.openEnd
      ||spans.some(span=>span!==raw&&match.index>=span.start&&match.index<span.end)
      ||attrs.size!==7||!approvedFrame(name=>attrs.get(name)?.value??null,language))return null;
    candidates.push({start:match.index+match[0].length-1,end:match.index+match[0].length-1,replacement:' loading="lazy"'});
  }
  return candidates.length===1?candidates[0]:null;
}
