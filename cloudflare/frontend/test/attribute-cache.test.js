import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryValueRewriter } from '../src/html.js';
import { planDeliveryRequest, rewriteProductionUrl } from '../src/plan.js';
import { rewriteSiteUrl, rewriteImageReferences } from '../vendor/logic.js';

const plan = planDeliveryRequest('https://en.panamalegallab.com/contact-us');
const values = [null, '', '#section', 'color: #000000;', 'display:none;',
  '/panamalegallab.com/panamlegallab-en/contact-us?x=1#section',
  'https://sites.google.com/panamalegallab.com/panamlegallab-en/home',
  'https://fr.panamalegallab.com/guide', 'https://en.panamalegallab.com:443/a',
  'https://evil.example/panamalegallab.com/', 'https://user:pass@en.panamalegallab.com/',
  'https://www.google.com/url?q=https%3A%2F%2Fen.panamalegallab.com%2Fcontact-us',
  'https://www.google.com/url?q=https://en.panamalegallab.com/a&q=https://evil.example/',
  'https://sites.google.com/sitesv-images-rt/token=w300',
  'background:url(https://sites.google.com/sitesv-images-rt/token=w300)',
  'https://script.google.com/macros/s/public/exec?lang=en', '//en.panamalegallab.com/home',
  ' HTTPS://EN.PANAMALEGALLAB.COM/contact-us ', 'not a URL', 'https://[invalid'];

test('document attribute cache preserves exact production and preview rewrite semantics', () => {
  for (const candidate of [plan, planDeliveryRequest('https://pll-seo-preview-20261102.pages.dev/en/contact-us')]) {
    const rewrite = createDeliveryValueRewriter(candidate);
    for (let repeat = 0; repeat < 4; repeat += 1) for (const value of values) {
      const expected = rewriteImageReferences(candidate.mode === 'production'
        ? rewriteProductionUrl(value) : rewriteSiteUrl(value, candidate.previewOrigin));
      assert.equal(rewrite(value), expected);
    }
  }
});

test('repeated attribute values incur one URL parse per document and caches never cross documents', () => {
  const NativeURL = globalThis.URL;
  let calls = 0;
  globalThis.URL = new Proxy(NativeURL, { construct(target, args) { calls += 1; return Reflect.construct(target, args); } });
  try {
    const rewrite = createDeliveryValueRewriter(plan);
    const source = 'https://en.panamalegallab.com/contact-us';
    for (let count = 0; count < 100; count += 1) assert.equal(rewrite(source), source);
    assert.equal(calls, 1);
    assert.equal(createDeliveryValueRewriter(plan)(source), source);
    assert.equal(calls, 2);
  } finally { globalThis.URL = NativeURL; }
});

test('document cache is bounded for unique untrusted attribute values and large strings', () => {
  const NativeURL = globalThis.URL;
  let calls = 0;
  globalThis.URL = new Proxy(NativeURL, { construct(target, args) { calls += 1; return Reflect.construct(target, args); } });
  try {
    const rewrite = createDeliveryValueRewriter(plan);
    for (let count = 0; count < 600; count += 1) rewrite(`https://en.panamalegallab.com/p${count}`);
    const before = calls;
    rewrite('https://en.panamalegallab.com/p599');
    assert.equal(calls, before + 1);
    for (const [length, expectedParses] of [[32_768, 1], [32_769, 2]]) {
      const freshRewrite = createDeliveryValueRewriter(plan);
      const large = 'x'.repeat(length);
      const beforeLarge = calls;
      freshRewrite(large); freshRewrite(large);
      assert.equal(calls - beforeLarge, expectedParses);
    }
  } finally { globalThis.URL = NativeURL; }
});
