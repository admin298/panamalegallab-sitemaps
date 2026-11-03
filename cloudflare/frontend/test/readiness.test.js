import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import data from '../data/readiness.json' with { type: 'json' };
import { selectReadinessPolicy, escapeAttribute, descriptionTag } from '../src/readiness.js';
import { createDocumentInspector, createLanguageRewrite, FOOTER_GROUP } from '../src/language-controls.js';
import { planDeliveryRequest } from '../src/plan.js';

const roots={es:'https://www.panamalegallab.com',en:'https://en.panamalegallab.com',fr:'https://fr.panamalegallab.com',it:'https://it.panamalegallab.com'};
const labels={es:'ES Spanish',en:'EN English',fr:'FR French',it:'IT Italian'};
const canonical='https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama';
function element(attributes={}) { const end=[];return { getAttribute:name=>attributes[name]??null,setAttribute(name,value){attributes[name]=value;},onEndTag(callback){end.push(callback);},close(){for(const callback of end)callback({});},attributes }; }
function inspect({labelsOverride={},hrefOverride={},groups=1,extra=0,language='en',huge=false,media=null,blankText='\u00a0'}={}) {
 const i=createDocumentInspector('en');i.html.element(element({lang:language}));
 for(let n=0;n<groups;n++){
  const group=element();i.group.element(group);
  for(const lang of Object.keys(roots)){
   const a=element({href:hrefOverride[lang]??roots[lang]+'/',class:'XqQF9c'});i.anchor.element(a);
   i.anchor.text({text:huge?'x'.repeat(257):labelsOverride[lang]??labels[lang]});
   if(media)i.descendant.element({...element({style:media.style}),tagName:media.tagName});
   a.close();
  }
  for(let n=0;n<extra;n++){const a=element({href:roots.es,class:'XqQF9c'});i.anchor.element(a);i.anchor.text({text:blankText});a.close();}
  group.close();
 }
 return i.context();
}

test('draft data covers exact148descriptions and252reciprocal preferred sources',()=>{
 const provenance=JSON.parse(readFileSync(new URL('../data/provenance.json',import.meta.url),'utf8'));
 assert.equal(createHash('sha256').update(readFileSync(new URL('../data/readiness.json',import.meta.url))).digest('hex'),provenance.output.sha256);
 assert.equal(data.draft,true);assert.equal(Object.keys(data.descriptions).length,148);assert.equal(Object.keys(data.languageLinks).length,252);
 for(const [url,row] of Object.entries(data.languageLinks)){
  const p=selectReadinessPolicy(planDeliveryRequest(url));assert.equal(p.language,row.language);
  assert.deepEqual(p.alternatives,row.alternatives);
  for(const [lang,target] of Object.entries(row.alternatives))assert.equal(data.languageLinks[target].alternatives[row.language],url);
 }
 for(const [url,row] of Object.entries(data.descriptions))assert.equal(selectReadinessPolicy(planDeliveryRequest(url)).description,row.text);
});

test('policy never expands to preview, Search, unknown/new, wronglocale or errors',()=>{
 for(const input of ['https://pll-seo-preview-20261102.pages.dev/en/our-services-in-panama/start-business-in-panama','https://en.panamalegallab.com/new-published-page','https://en.panamalegallab.com/_/search?query=x&scope=site&showCloudSearchTab=false','https://evil.example/'])assert.equal(selectReadinessPolicy(planDeliveryRequest(input)),null);
 assert.notEqual(selectReadinessPolicy(planDeliveryRequest('https://en.panamalegallab.com/home')),null);
 const p=planDeliveryRequest(canonical);
 for(const override of [{kind:'error'},{indexable:false},{site:{...p.site,language:'fr'}}])assert.equal(selectReadinessPolicy({...p,...override}),null);
 assert.equal(selectReadinessPolicy(planDeliveryRequest(canonical+'?utm_source=untouched')).description,data.descriptions[canonical].text);
});

test('description attribute escaping prevents executable markup and preserves Unicode',()=>{
 assert.equal(descriptionTag(null,null),'');
 assert.equal(descriptionTag({language:'en',description:'safe'}, {siteLanguage:'fr'}),'');
 assert.equal(descriptionTag({language:'en',description:'A & <x>'}, {siteLanguage:'en'}), '<meta name="description" content="A &amp; &lt;x&gt;">');
 const nonAscii=String.fromCodePoint(0xf1), apostrophe=String.fromCharCode(39);
 assert.equal(escapeAttribute('A & "<tag>" '+apostrophe+' '+nonAscii), 'A &amp; &quot;&lt;tag&gt;&quot; &#39; '+nonAscii);
});

test('complete recognized four-language group is immutable and whitespace-only duplicates are safe',()=>{
 const sourceUi=inspect({language:'en-US'});assert.equal(sourceUi.languageGroup,0);assert.equal(sourceUi.authorLanguage,'en-US');
 const context=inspect({extra:2});assert.equal(context.authorLanguage,'en');assert.equal(context.languageGroup,0);assert.ok(Object.isFrozen(context));
 const policy=selectReadinessPolicy(planDeliveryRequest(canonical));const handlers=createLanguageRewrite(policy,context);const group=element();handlers.group.element(group);
 const foreign=element({href:roots.fr});handlers.anchor.element(foreign);assert.equal(foreign.attributes.href,policy.alternatives.fr);
 const own=element({href:roots.en});handlers.anchor.element(own);assert.equal(own.attributes.href,roots.en);
 const unknown=element({href:roots.fr+'/home'});handlers.anchor.element(unknown);assert.equal(unknown.attributes.href,roots.fr+'/home');
 group.close();const outside=element({href:roots.fr});handlers.anchor.element(outside);assert.equal(outside.attributes.href,roots.fr);
});

test('unknown/malformed/ambiguous/oversized footer structures fail closed without changing links',()=>{
 for(const options of [{groups:2},{groups:17},{extra:5},{labelsOverride:{fr:'Home'}},{labelsOverride:{fr:'ES Spanish'}},{hrefOverride:{fr:roots.fr+'/?utm=x'}},{hrefOverride:{fr:'https://evil.example/'}},{hrefOverride:{fr:roots.fr+'/#'}},{huge:true},{media:{tagName:'img'}},{media:{tagName:'span',style:String.raw`b\61 ckground-image:u\72 l(https://example.invalid/logo.png)`}},{media:{tagName:'span',style:'background-image:url(https://example.invalid/logo.png)'}},{extra:1,blankText:''}])assert.equal(inspect(options).languageGroup,null,JSON.stringify(options));
 const i=createDocumentInspector('en');i.html.element(element({lang:'en'}));assert.equal(i.context().languageGroup,null);
 const nested=createDocumentInspector('en');const a=element(),b=element();nested.group.element(a);nested.group.element(b);b.close();a.close();assert.equal(nested.context().languageGroup,null);
 const broken=createDocumentInspector('en');broken.group.element(element());assert.equal(broken.context().languageGroup,null);
 assert.equal(createLanguageRewrite(null,inspect()),null);assert.equal(createLanguageRewrite(selectReadinessPolicy(planDeliveryRequest(canonical)),inspect({groups:2})),null);
 assert.equal(FOOTER_GROUP,'footer[jsname="yePe5c"] small.zfr3Q');
});
