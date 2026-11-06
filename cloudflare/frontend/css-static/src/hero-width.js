import {CACHE_PATHS} from './cache-routes.js';
import {elementAttributes} from './html-spans.js';

const PREVIEW='https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const noncePattern=/^[A-Za-z0-9+/_-]{8,256}={0,2}$/u;
const imagePattern=/^https:\/\/lh7-us\.googleusercontent\.com\/sitesv-images-rt\/[A-Za-z0-9_-]{40,2048}=w16383$/u;
const nativeTemplate=`const imageUrl = '__HERO_IMAGE_URL__';
function bgImgLoaded() { if (!globals.headerBgImgLoaded) { globals.headerBgImgLoaded = new Date().getTime(); }
else { globals.headerBgImgLoaded(); } }
if (imageUrl) { const img = new Image(); img.src = imageUrl; img.onload = bgImgLoaded; globals.headerBgImgExists = true; }
else { globals.headerBgImgExists = false; }`;
const normalized=source=>source.replace(/\s+/gu,'');

export function heroWidthPolicyEnabled(request,mode,plan) {
  if(request.method!=='GET'||request.headers.get('X-PLL-Mobile')!=='1'||!['preview','all'].includes(mode)
    ||plan?.kind!=='page'||plan.searchPage||!CACHE_PATHS[plan.site?.language]?.includes(plan.path)
    ||plan.canonical!==plan.site.productionOrigin+plan.path)return false;
  if(plan.mode==='production')return mode==='all';
  if(plan.mode!=='preview'||plan.previewOrigin!==PREVIEW)return false;
  const values=new URL(request.url).searchParams.getAll('_pll_hero_width');
  return values.length===0||(values.length===1&&values[0]==='candidate');
}

// These handlers join the existing native parse only for an enabled mobile
// request. They attest the first real background independently of source splices.
export function createHeroWidthInspector() {
  let state={backgrounds:0,heroes:0,first:null,safe:true};
  return {
    background:{element(element){
      const hero=element.getAttribute('jsname')==='LQX2Vd';
      const first=state.backgrounds===0?{hero,role:element.getAttribute('role'),style:element.getAttribute('style')}:state.first;
      state={...state,backgrounds:state.backgrounds+1,heroes:state.heroes+(hero?1:0),first,safe:state.safe&&state.backgrounds<256};
    }},
    template:{element(){state={...state,safe:false};}},
    context(){return state.safe?{...state}:null;},
  };
}

function headPreloader(html,nonce,spans) {
  const outside=index=>!spans.some(span=>index>=span.start&&index<span.end);
  const heads=[...html.matchAll(/<head(?:\s[^<>]*)?>/giu)].filter(m=>outside(m.index));
  const ends=[...html.matchAll(/<\/head\s*>/giu)].filter(m=>outside(m.index));
  if(heads.length!==1||ends.length!==1||heads[0].index+heads[0][0].length>=ends[0].index)return null;
  const scripts=spans.filter(span=>span.kind==='script');
  const candidates=scripts.filter(span=>/^\s*const imageUrl = /u.test(html.slice(span.openEnd,span.contentEnd)));
  if(candidates.length!==1||scripts.reduce((n,span)=>n+[...html.slice(span.openEnd,span.contentEnd).matchAll(/\bconst\s+imageUrl\s*=/gu)].length,0)!==1)return null;
  const span=candidates[0],attrs=elementAttributes(html.slice(span.start,span.openEnd),'script');
  if(span.start<heads[0].index+heads[0][0].length||span.end>ends[0].index||!attrs
    ||attrs.get('nonce')?.value!==nonce||![...attrs.keys()].every(key=>['nonce','type'].includes(key))
    ||(attrs.has('type')&&attrs.get('type').value.toLowerCase()!=='text/javascript'))return null;
  const body=html.slice(span.openEnd,span.contentEnd),match=/^\s*const imageUrl = ('([^']*)'|null)\s*;/u.exec(body);
  if(!match)return null;
  if(normalized(body.replace(match[1],"'__HERO_IMAGE_URL__'"))!==normalized(nativeTemplate))return null;
  return {span,body,literal:match[2]??null,literalStart:span.openEnd+match.index+match[0].indexOf(match[1])+1,headEnd:ends[0].index+ends[0][0].length};
}

function firstBackground(html,spans,native) {
  const backgrounds=[];
  for(const match of html.matchAll(/<div\b[^<>]*>/giu)){
    if(spans.some(span=>match.index>=span.start&&match.index<span.end))continue;
    const attrs=elementAttributes(match[0],'div');if(!attrs)return null;
    if(attrs.get('class')?.value.split(/\s+/u).includes('IFuOkc'))backgrounds.push({match,attrs});
  }
  if(backgrounds.length!==native.backgrounds)return null;
  const heroes=backgrounds.filter(value=>value.attrs.get('jsname')?.value==='LQX2Vd');
  if(heroes.length!==native.heroes)return null;
  if(heroes.length===0)return {noPhoto:true};
  if(heroes.length!==1||heroes[0]!==backgrounds[0]||!native.first?.hero)return null;
  const selected=heroes[0],get=name=>selected.attrs.get(name)?.value??null;
  if(![null,'img'].includes(get('role'))||get('role')!==native.first.role||get('style')!==native.first.style)return null;
  const style=get('style')??'',match=/^\s*background-position:\s*(?:center|top|bottom) center;\s*background-image:\s*url\(([^)]+)\);\s*background-size:\s*cover;\s*$/u.exec(style);
  if(!match||!imagePattern.test(match[1]))return null;
  return {...selected,url:match[1],noPhoto:false};
}

// Effective script nonce and document identity were already authorized by the
// shared native inspector. Both recognized URL spans change in a single splice;
// the preloader's logic and all other source bytes remain unchanged.
export function heroWidthDocumentEdits(html,nonce,spans,native) {
  if(typeof html!=='string'||!noncePattern.test(nonce??'')||!Array.isArray(spans)||!native)return null;
  const preloader=headPreloader(html,nonce,spans),hero=firstBackground(html,spans,native);
  if(!preloader||!hero)return null;
  if(hero.noPhoto)return preloader.literal===null?{edits:[],reason:'no-header-photo'}:null;
  if(hero.match.index<preloader.headEnd)return null;
  const literal=hero.url.replaceAll('/','\\/').replace(/=w16383$/u,'\\x3dw16383');
  const token=hero.url.split('/').at(-1).slice(0,-'=w16383'.length);
  if(preloader.literal!==literal||html.split(hero.url).length!==2||html.split(literal).length!==2||html.split(token).length!==3)return null;
  const style=hero.attrs.get('style'),relative=style.value.indexOf(hero.url);
  const cssStart=hero.match.index+style.start+relative;
  return {reason:'resized',edits:[
    {start:cssStart,end:cssStart+hero.url.length,replacement:hero.url.slice(0,-'=w16383'.length)+'=w1280'},
    {start:preloader.literalStart,end:preloader.literalStart+literal.length,replacement:literal.slice(0,-'\\x3dw16383'.length)+'\\x3dw1280'},
  ]};
}
