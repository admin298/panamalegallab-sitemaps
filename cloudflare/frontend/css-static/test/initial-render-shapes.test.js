import test from 'node:test';
import assert from 'node:assert/strict';
import { frameDocumentEdit } from '../src/initial-render.js';
import { overlayDocumentEdit, HOME_OVERLAY_PROFILES } from '../src/home-overlay.js';
import { collectRawTextSpans,applyTextEdits } from '../src/html-spans.js';

const app='https://script.google.com/macros/s/AKfycbwpm6hhxmlmZkN3a2QAQWyXn1hnLE9mvbm9lLr8c_YvYapHjY59vIREKmxs2mMK94Vq/exec?lang=';
const sandbox='allow-scripts allow-popups allow-forms allow-same-origin allow-popups-to-escape-sandbox allow-downloads allow-modals allow-storage-access-by-user-activation';
const frame=language=>`<iframe jsname="L5Fo6c" class="YMEQtf" sandbox="${sandbox}" frameborder="0" aria-label="Apps Script" src="${app+language}" allowfullscreen></iframe>`;
const document=body=>`<html><head></head><body>${body}</body></html>`;
const frameEdit=html=>frameDocumentEdit(html,'es',collectRawTextSpans(html),true);

test('exact native Apps Script frame gains only loading lazy; src, sandbox, dimensions and content stay exact',()=>{
  for(const language of ['es','en','fr','it']){
    const html=document(frame(language));
    const edit=frameDocumentEdit(html,language,collectRawTextSpans(html),true);
    assert.ok(edit);assert.equal(applyTextEdits(html,[edit]),html.replace(' allowfullscreen>',' allowfullscreen loading="lazy">'));
  }
});

test('altered, duplicate, inert, preloaded or unknown Apps Script frame shapes are preserved',()=>{
  const one=frame('es'),html=document(one);
  for(const variant of [document(one+one),document('<!--'+one+'-->'),document('<script>'+JSON.stringify(one)+'</script>'),
    html.replace('lang=es','lang=en'),html.replace('class="YMEQtf"','class="YMEQtf extra"'),
    html.replace(' allowfullscreen>',' loading="eager" allowfullscreen>'),html.replace(' allowfullscreen>',' loading="lazy" allowfullscreen>'),
    html.replace(' allowfullscreen>',' width="600" allowfullscreen>'),html.replace('allow-downloads ','') ,
    html.replace(' allowfullscreen>',' allowfullscreen="unknown">'),
    html.replace('</iframe>','fallback</iframe>'),html.replace('frameborder="0"','frameborder="1"'),html.replace('aria-label="Apps Script"','aria-label="Other"'),
    html.replace(' jsname=',' jsname="duplicate" jsname='),html.replace('</body>',''),
  ])assert.equal(frameEdit(variant),null);
  assert.equal(frameDocumentEdit(html,'es',collectRawTextSpans(html),false),null);
  assert.equal(frameDocumentEdit(html,'es',null,true),null);
});

const image=language=>`<img src="https://lh7-us.googleusercontent.com/sitesv-images-rt/TestChangingToken=w1280" class="CENy8b" role="img" alt="${HOME_OVERLAY_PROFILES[language].alt}">`;
const overlay=language=>document(`<div class="UtePc"><section id="h.INITIAL_GRID.85u6di9ec7a5"><div id="${HOME_OVERLAY_PROFILES[language].widgetId}">${image(language)}</div></section><section id="later"></section></div>`);
const overlayEdit=html=>overlayDocumentEdit(html,'fr',collectRawTextSpans(html),true);

test('only recognized homepage overlay image gains auto intrinsic-ratio fallback, retaining every original source/size byte',()=>{
  for(const language of ['es','en','fr','it']){
    const html=overlay(language),edit=overlayDocumentEdit(html,language,collectRawTextSpans(html),true);
    assert.ok(edit);assert.equal(applyTextEdits(html,[edit]),html.replace(image(language),image(language).replace('>',' style="aspect-ratio:auto 1168 / 854">')));
    const already=html.replace(image(language),image(language).replace('>',' style="aspect-ratio: auto 1168 / 854;">'));
    assert.equal(overlayDocumentEdit(already,language,collectRawTextSpans(already),true),null,'already sized is byte-identical');
  }
});

test('overlay edits skip unknown styles/attributes, wrong structure, duplicates and inert lookalikes',()=>{
  const html=overlay('fr'),img=image('fr');
  for(const variant of [html.replace(img,img+img),html.replace(img,'<!--'+img+'-->'),
    html.replace(img,`<script>${JSON.stringify(img)}</script>`),html.replace('class="CENy8b"','class="CENy8b other"'),
    html.replace(img,img.replace('>',' style="width:100%">')),html.replace(img,img.replace('>',' width="1168">')),
    html.replace('1168','1000'),html.replace('role="img"','role="presentation"'),
    html.replace(HOME_OVERLAY_PROFILES.fr.widgetId,'unknown'),html.replace('h.INITIAL_GRID.85u6di9ec7a5','other'),
    html.replace('Logo de Panamá','Other'),html.replace('lh7-us.googleusercontent.com','evil.invalid'),
    html.replace('</section>',''),html.replace(' src=',' src="duplicate" src='),
  ]){if(variant!==html)assert.equal(overlayEdit(variant),null,variant.slice(0,200));}
  assert.equal(overlayDocumentEdit(html,'fr',null,true),null);
  assert.equal(overlayDocumentEdit(html,'fr',collectRawTextSpans(html),false),null);
  assert.equal(overlayDocumentEdit(html,'unknown',collectRawTextSpans(html),true),null);
});
