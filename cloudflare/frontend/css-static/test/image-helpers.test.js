import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { approvedProcessUrl, rewriteReferences, authorizedNonce, fallbackScript, insertFallback } from '../src/image-helpers.js';

const original = 'https://lh7-us.googleusercontent.com/sitesv-images-rt/Fresh_Token=w1280';
const nonce = 'ValidNonce123';
const policy = `script-src 'nonce-${nonce}' 'unsafe-inline'`;

test('only exact current Google PNG cohort URI shapes are accepted', () => {
  assert.equal(approvedProcessUrl(original), original);
  for (const value of [original+'-rw', original+'?x=1', original+'#x', original.replace('https:','http:'), original.replace('lh7-us.', 'evil.'), original.replace('/Fresh_', '/bad%2f'), original.replace('https://','https://u@'), original.replace('=w1280','=w1200')]) assert.equal(approvedProcessUrl(value), null, value);
});

test('all supported exact native/config spellings change without reserializing anything', () => {
  const forms = [original, original.replaceAll('/', '\\/'), original.replace('=', '\\u003d'), original.replaceAll('/', '\\/').replace('=', '\\u003D'), original.replace('=', '\\x3d')];
  const input = forms.map(value=>`"${value}"`).join('\n');
  assert.equal(rewriteReferences(input, original), forms.map(value=>`"${value}-rw"`).join('\n'));
  for (const extra of [original+'-c', original+'-rw', original+'0', original+'?x', original+'#x', original+'/x', original+'\\u003fquery', original.replace('Fresh_', '\\u0046resh_'), original.replace('https://','http://'), 'Fresh_Token']) assert.equal(rewriteReferences(`"${original}" "${extra}"`, original), null, extra);
  assert.equal(rewriteReferences('no selected URI', original), null);
  const fullyEscaped=[...original].map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join('');
  assert.equal(rewriteReferences(`"${original}" "${fullyEscaped}"`,original),null,'unsupported fully escaped URI prevents a partial rewrite');
  const braced=[...original].map(c=>'\\u{'+c.charCodeAt(0).toString(16)+'}').join('');
  assert.equal(rewriteReferences(`"${original}" "${braced}"`,original),null);
});

test('every effective enforced CSP policy must authorize the unique existing nonce', () => {
  assert.equal(authorizedNonce(policy, [nonce,nonce]), nonce);
  assert.equal(authorizedNonce(`default-src 'nonce-${nonce}'`,[nonce]),nonce);
  assert.equal(authorizedNonce(`script-src 'none'; script-src-elem 'nonce-${nonce}'`,[nonce]),nonce);
  assert.equal(authorizedNonce(`${policy}, ${policy}`,[nonce]),nonce);
  for (const [csp,nonces] of [[null,[nonce]], [policy,[]], [policy,[nonce,'OtherNonce1']], [policy,['bad\"nonce']], [`${policy}, script-src 'none'`,[nonce]], [`${policy}; sandbox`,[nonce]], [`${policy}; script-src 'nonce-${nonce}'`,[nonce]], [`script-src 'nonce-other'`,[nonce]]]) assert.equal(authorizedNonce(csp,nonces),null);
});

test('fallback script installs before images and escapes data without touching unrelated errors', () => {
  const script = fallbackScript(original, original+'-rw', nonce);
  assert.ok(!script.includes('</script>'));
  let listener;
  const context = {WeakSet, document:{ addEventListener(type,fn,capture) { assert.equal(type,'error');assert.equal(capture,true);listener=fn; } }};
  vm.runInNewContext(script,context);
  const injected=fallbackScript('</script><script>bad()</script>\u2028',original+'-rw');
  assert.equal(injected.includes('</script>'),false);assert.equal(injected.includes('\u2028'),false);
  vm.runInNewContext(injected,{WeakSet,document:{addEventListener(){}}});
  const image = source=>({tagName:'IMG', src:source,currentSrc:source,sets:0,getAttribute(key){return key==='src'?this.src:null;}, setAttribute(key,value){assert.equal(key,'src');this.src=value;this.sets++;}});
  const chosen=image(original+'-rw'); listener({target:chosen});assert.equal(chosen.src,original);assert.equal(chosen.sets,1);
  chosen.src=original+'-rw';listener({target:chosen});assert.equal(chosen.sets,1);
  for (const target of [image(original),image('https://unrelated.example/a-rw'),{tagName:'SCRIPT'},null]) listener({target});
  const untouched=image(original+'-rw');assert.equal(untouched.src,original+'-rw');assert.equal(untouched.sets,0);
  const html='\uFEFF<!doctype html><html><head><meta charset="utf-8"></head><body>á</body></html>';
  const changed=insertFallback(html,script,nonce);
  assert.ok(changed.startsWith('\uFEFF'));assert.ok(changed.indexOf(script)<changed.indexOf('<meta'));
  assert.equal(changed.replace(`<script nonce="${nonce}" data-pll-image-fallback="v1">${script}</script>`,''),html);
  for(const malformed of ['<html><body></body></html>','<head></head><head></head>','<head x=">">']) assert.equal(insertFallback(malformed,script,nonce),null);
});
