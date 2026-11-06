import test from 'node:test';
import assert from 'node:assert/strict';
import { fontDocumentEdit, initialRenderPolicyEnabled, initialRenderCacheRevision, INVALID_FONT_URL } from '../src/initial-render.js';
import { collectRawTextSpans, applyTextEdits } from '../src/html-spans.js';
import { planDeliveryRequest } from '../renderer/src/plan.js';
import { impressionCacheRevision } from '../src/native-impressions.js';

const link=`<link href="${INVALID_FONT_URL}" rel="stylesheet" nonce="StyleNonce456">`;
const html=`<!doctype html><html><head><meta charset="utf-8">${link}<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto&display=swap"></head><body>Panamá 😀</body></html>`;
const edit=value=>fontDocumentEdit(value,collectRawTextSpans(value),true);

test('only the one exact invalid font link is removed, preserving every other byte',()=>{
  const result=edit(html);assert.ok(result);
  assert.equal(applyTextEdits(html,[result]),html.replace(link,''));
  const upper=html.replace(link,`<LINK NONCE='StyleNonce456' REL='stylesheet' HREF='${INVALID_FONT_URL}'>`);
  assert.equal(applyTextEdits(upper,[edit(upper)]),html.replace(link,''));
});

test('ambiguous, altered, inert or unsupported font shapes are preserved',()=>{
  const variants=[html.replace(link,link+link),html.replace(link,'<!--'+link+'-->'),
    html.replace(link,`<script nonce="ScriptNonce789">${JSON.stringify(link)}</script>`),
    html.replace(link,link.replace(' rel=', ' media="screen" rel=')),
    html.replace(link,link.replace(' nonce="StyleNonce456"','')),html.replace(link,link.replace('StyleNonce456','short')),
    html.replace(link,link.replace('rel="stylesheet"','rel="preload"')),
    html.replace(link,link.replace(' href=',' href="first" href=')),
    html.replace(link,link.replace(' href="',' href=')).replace('&display=swap"','&display=swap'),
    html.replace(link,'').replace('</body>',link+'</body>'),
    html.replace(link,link.replace(INVALID_FONT_URL,INVALID_FONT_URL+'&other=1')),
    html.replace('<head>','<head><head>'),html.replace('</head>',''),html+'<!-- unterminated',
  ];
  for(const value of variants)assert.equal(edit(value),null,value.slice(0,150));
  assert.equal(fontDocumentEdit(html,collectRawTextSpans(html),false),null);
  assert.equal(fontDocumentEdit(html,null,true),null);
});

test('font policy only enables known ordinary pages at the approved preview or public all mode',()=>{
  const preview='https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev/es/';
  for(const [url,method,mode,expected] of [
    ['https://www.panamalegallab.com/','GET','all',true],
    ['https://www.panamalegallab.com/?_pll_initial_render=control','GET','all',true],
    ['https://www.panamalegallab.com/','GET','preview',false],
    ['https://www.panamalegallab.com/','HEAD','all',false],
    ['https://www.panamalegallab.com/_/search?q=law','GET','all',false],
    ['https://evil.invalid/','GET','all',false],
    [preview,'GET','preview',true],[preview+'?_pll_initial_render=candidate','GET','all',true],
    [preview+'?_pll_initial_render=control','GET','all',false],
    [preview+'?_pll_initial_render=unknown','GET','all',false],
    [preview+'?_pll_initial_render=candidate&_pll_initial_render=control','GET','all',false],
    [preview.replace('recovery-prodlike-20261103','other'),'GET','all',false],
    [preview,'GET',undefined,false],[preview,'GET','off',false],[preview,'GET','invalid',false],
  ]){const request=new Request(url,{method});assert.equal(initialRenderPolicyEnabled(request,mode,planDeliveryRequest(url,method)),expected,url);}
});

test('font modes isolate cache identity while mode off preserves the accepted baseline revision',()=>{
  const base=impressionCacheRevision('all');
  const modes=['off','preview','all'].map(mode=>initialRenderCacheRevision(base,mode));
  assert.equal(modes[0],base);assert.equal(new Set(modes).size,3);
  assert.equal(initialRenderCacheRevision(base,undefined),base);assert.equal(initialRenderCacheRevision(base,'unknown'),base);
  assert.ok(modes.every(value=>/^[a-zA-Z0-9_-]{1,64}$/u.test(value)));
});

test('initial policy includes only validated native home aliases canonicalized to their own preferred root',()=>{
  for(const [language,alias]of Object.entries({es:'inicio',en:'home',fr:'accueil',it:'inizio'})){
    const origin='https://'+(language==='es'?'www':language)+'.panamalegallab.com';
    const request=new Request(origin+'/'+alias),plan=planDeliveryRequest(request.url);
    assert.equal(plan.canonical,origin+'/');
    assert.equal(initialRenderPolicyEnabled(request,'all',plan),true);
    assert.equal(initialRenderPolicyEnabled(request,'all',{...plan,canonical:'https://evil.invalid/'}),false);
    assert.equal(initialRenderPolicyEnabled(request,'all',{...plan,canonical:origin+'/unknown'}),false);
  }
});
