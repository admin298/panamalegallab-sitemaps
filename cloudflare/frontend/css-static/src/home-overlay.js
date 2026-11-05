import { elementAttributes } from './html-spans.js';

export const HOME_SECTION_ID='h.INITIAL_GRID.85u6di9ec7a5';
export const HOME_OVERLAY_PROFILES=Object.freeze(Object.fromEntries(Object.entries({
  es:{widgetId:'h.4a7e47a7ec29bfb_69',alt:'Logo de Panamá Legal Lab con símbolo gráfico y nombre de la marca en naranja y blanco.'},
  en:{widgetId:'h.11e95cabf7fb90b9_4',alt:'Panamá Legal Lab logo with a graphic symbol and the brand name in orange and white.'},
  fr:{widgetId:'h.7c6fe75593748597_4',alt:'Logo de Panamá Legal Lab avec un symbole graphique et le nom de la marque en orange et blanc.'},
  it:{widgetId:'h.2563f0efc2ea0320_4',alt:'Logo di Panamá Legal Lab con un simbolo grafico e il nome del marchio in arancione e bianco.'},
}).map(([language,profile])=>[language,Object.freeze(profile)])));
const imageUrl=/^https:\/\/lh7-us\.googleusercontent\.com\/sitesv-images-rt\/[A-Za-z0-9_-]+=w1280(?:-rw)?$/u;
const knownRatio=/^\s*aspect-ratio\s*:\s*auto\s+1168\s*\/\s*854\s*;?\s*$/u;

function approvedImage(get,profile) {
  const style=get('style');
  return imageUrl.test(get('src')??'')&&get('class')==='CENy8b'&&get('role')==='img'
    &&get('alt')===profile.alt&&(style===null||knownRatio.test(style));
}

export function createOverlayInspector(profile) {
  let state={roots:0,sections:0,selected:0,widgets:0,images:0,firstMatches:false,safe:true};
  return {
    root:{element(){state={...state,roots:state.roots+1};}},
    firstSection:{element(element){state={...state,sections:state.sections+1,
      firstMatches:state.sections===0?element.getAttribute('id')===HOME_SECTION_ID:state.firstMatches};}},
    section:{element(){state={...state,selected:state.selected+1};}},
    widget:{element(){state={...state,widgets:state.widgets+1};}},
    image:{element(element){state={...state,images:state.images+1,safe:state.safe&&approvedImage(name=>element.getAttribute(name),profile)};}},
    nested:{element(){state={...state,safe:false};}},
    valid(){return Boolean(profile)&&state.safe&&state.firstMatches&&['roots','selected','widgets','images'].every(name=>state[name]===1);},
  };
}

function widgetBounds(html,section,profile,spans) {
  const tags=[...section[0].matchAll(/<div\b[^<>]*>|<\/div\s*>/giu)];let depth=0,begin=null;
  for(const tag of tags){
    const offset=section.index+tag.index;
    if(spans.some(span=>offset>=span.start&&offset<span.end))continue;
    if(/^<\//u.test(tag[0])){if(begin!==null&&--depth===0)return {begin,end:offset};continue;}
    const attrs=elementAttributes(tag[0],'div');if(!attrs)return null;
    if(begin===null&&attrs.get('id')?.value===profile.widgetId){begin=offset+tag[0].length;depth=1;}
    else if(begin!==null)depth++;
  }
  return null;
}

export function overlayDocumentEdit(html,language,spans,nativeValid) {
  const profile=HOME_OVERLAY_PROFILES[language];if(!nativeValid||!profile||!Array.isArray(spans))return null;
  const section=/<section\b[^<>]*>[\s\S]*?<\/section\s*>/iu.exec(html);
  if(!section||spans.some(span=>section.index>=span.start&&section.index<span.end))return null;
  const tag=section[0].slice(0,section[0].indexOf('>')+1);
  if(elementAttributes(tag,'section')?.get('id')?.value!==HOME_SECTION_ID||/<section\b/iu.test(section[0].slice(tag.length)))return null;
  const bounds=widgetBounds(html,section,profile,spans);if(!bounds)return null;
  const candidates=[];
  for(const match of html.matchAll(/<img\b[^<>]*>/giu)){
    const attrs=elementAttributes(match[0],'img');if(!attrs)return null;
    if(attrs.get('alt')?.value!==profile.alt)continue;
    if(match.index<bounds.begin||match.index>=bounds.end||spans.some(span=>match.index>=span.start&&match.index<span.end)
      ||![4,5].includes(attrs.size)||![...attrs.keys()].every(name=>['src','class','role','alt','style'].includes(name))
      ||!approvedImage(name=>attrs.get(name)?.value??null,profile))return null;
    candidates.push({match,attrs});
  }
  if(candidates.length!==1||candidates[0].attrs.has('style'))return null;
  const match=candidates[0].match,offset=match.index+match[0].length-1;
  return {start:offset,end:offset,replacement:' style="aspect-ratio:auto 1168 / 854"'};
}
