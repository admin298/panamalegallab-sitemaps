import test from 'node:test';
import assert from 'node:assert/strict';
import { impressionConfigEdit, impressionDocumentEdit, impressionCacheRevision } from '../src/native-impressions.js';
import { collectRawTextSpans } from '../src/html-spans.js';
import { impressionConfig, impressionScript, impressionDocument, origin, VIEW_SCRIPTS, IMPRESSION_NONCE } from './fixtures/impression-fixtures.js';
import { SITES } from '../renderer/vendor/logic.js';
import { targetForCache, cacheKeyFor } from '../src/cache-routes.js';
import { createHtmlMemoryCache } from '../src/html-memory-cache.js';
import { handleThinRequest } from '../src/frontend.js';
import { createRendererClass } from '../src/backend-core.js';

const patch = (source, edit) => source.slice(0, edit.start) + edit.replacement + source.slice(edit.end);
const editDocument = (html, language = 'es') => impressionDocumentEdit(html, SITES[language], IMPRESSION_NONCE, collectRawTextSpans(html));

test('config span changes only recognized null/false native field357 and preserves nested/escaped/Unicode bytes', () => {
  for (const value of [null, false, true]) {
    const source = impressionScript(value);
    const edit = impressionConfigEdit(source);
    assert.ok(edit);
    assert.equal(edit.changed, value !== true);
    assert.equal(patch(source, edit), impressionScript(true));
    assert.equal(source.slice(0, edit.start), patch(source, edit).slice(0, edit.start));
    assert.ok(source.includes('Panamá'));
  }
});

test('config parser rejects malformed, ambiguous, unknown shape or slot types without evaluating source', () => {
  const base = impressionConfig();
  const variants = [
    'window._at_config = ' + JSON.stringify(base) + ';',
    '_at_config = ' + JSON.stringify(base.slice(0, 517)) + ';',
    '_at_config = ' + JSON.stringify([...base, null]) + ';',
    '_at_config = ' + JSON.stringify(base) + ' trailingWithoutSemicolon',
    '_at_config = ' + JSON.stringify(base) + ';_at_config=[];',
    '_at_config = ' + JSON.stringify(base).slice(0, -1) + ';',
    '_at_config = [invalid];',
    '_at_config = ' + JSON.stringify({ ...base }) + ';',
    '_at_config = ['.repeat(25_000),
    '_at_config = ' + JSON.stringify(base.with(212, 1)) + ';',
    '_at_config = ' + JSON.stringify(base.with(316, 'https://example.invalid/')) + ';',
    ...[0, 1, '', 'true', {}, []].map(value => '_at_config = ' + JSON.stringify(base.with(356, value)) + ';'),
  ];
  for (const variant of variants) assert.equal(impressionConfigEdit(variant), null);
  assert.equal(impressionConfigEdit(null), null);
  assert.equal(impressionConfigEdit('x'.repeat(512_001)), null);
});

test('exact locale bundle, one nonce bootstrap and all unrelated source bytes are required', () => {
  for (const language of ['es', 'en', 'fr', 'it']) {
    const source = impressionDocument(language);
    const edit = editDocument(source, language);
    assert.ok(edit, language);
    assert.equal(patch(source, edit), impressionDocument(language, { value: true }));
    assert.equal(source.includes(VIEW_SCRIPTS[language]), true);
    assert.equal(patch(source, edit).includes('G-FNRPN562BY'), true);
    const already = impressionDocument(language, { value: true });
    assert.equal(editDocument(already, language).changed, false);
  }
});

test('comments, data scripts, duplicate attributes/configs, wrong nonce/bundles and broken raw text fail unchanged', () => {
  const source = impressionDocument('es');
  const configTag = `<script nonce="${IMPRESSION_NONCE}">${impressionScript()}</script>`;
  const viewTag = `<script src="${VIEW_SCRIPTS.es}" nonce="${IMPRESSION_NONCE}"></script>`;
  const variants = [
    source.replace(configTag, '<!--' + configTag + '-->'),
    source.replace(configTag, configTag + configTag),
    source.replace(viewTag, viewTag + viewTag),
    source.replace(viewTag, ''),
    source.replace(VIEW_SCRIPTS.es, VIEW_SCRIPTS.en),
    source.replace(VIEW_SCRIPTS.es, VIEW_SCRIPTS.es + '/next'),
    source.replace(configTag, configTag.replace('nonce=', 'data-nonce=')),
    source.replace(configTag, configTag.replace(IMPRESSION_NONCE, 'DifferentNonce123')),
    source.replace(configTag, configTag.replace('<script ', '<script type="application/json" ')),
    source.replace(viewTag, viewTag.replace(' src=', ' src="https://evil.invalid/" src=')),
    source.replace(configTag, configTag.replace('<script ', '<script nonce="OtherNonce123" ')),
    source.replace(configTag, configTag.replace('<script ', '<script unquoted=value ')),
    source + '<!-- unterminated',
    source + '<script nonce="ValidNonce123">',
    source.replace(configTag, configTag.replace('_at_config =', 'window.test = "_at_config = [null]";')),
  ];
  for (const variant of variants) assert.equal(editDocument(variant), null);
  assert.equal(impressionDocumentEdit(source, SITES.es, 'invalid"nonce', collectRawTextSpans(source)), null);
  assert.equal(impressionDocumentEdit(source, null, IMPRESSION_NONCE, collectRawTextSpans(source)), null);
});

test('mode-specific cache revision isolates old bodies, preview/all/off and rejects unsafe revisions', () => {
  const revisions = ['off', 'preview', 'all'].map(mode => impressionCacheRevision(mode));
  assert.equal(new Set(revisions).size, 3);
  assert.ok(revisions.every(value => /^[a-zA-Z0-9_-]{1,64}$/u.test(value) && value !== 'pll-html-memory-v1'));
  assert.equal(impressionCacheRevision(undefined), revisions[0]);
  assert.equal(impressionCacheRevision('invalid'), revisions[0]);
  for (const revision of revisions) assert.ok(targetForCache(new Request(origin('es') + '/'), 'all', revision));
});

test('all252preferred routes retain ordinary thin dispatch; renderer and Pages behavior are not replaced', async () => {
  let count = 0;
  const namespace = { idFromName: name => name, get: () => ({ fetch: async request => {
    count += 1; return new Response(request.url, { headers: { 'X-Keep': 'original' } });
  } }) };
  for (const language of ['es', 'en', 'fr', 'it']) {
    const { CACHE_PATHS } = await import('../src/cache-routes.js');
    assert.equal(CACHE_PATHS[language].length, 63);
    for (const path of CACHE_PATHS[language]) {
      const request = new Request(origin(language) + path);
      const response = await handleThinRequest(request, { PLL_RENDERER: namespace });
      assert.equal(await response.text(), request.url);
      assert.equal(response.headers.get('X-Keep'), 'original');
    }
  }
  assert.equal(count, 252);
});

test('renderer cache identity includes impression policy without modifying budgets or native request forwarding', () => {
  class Base { constructor() {} }
  const identities = [];
  const Renderer = createRendererClass(Base, () => async () => new Response('native'), { cacheMode: 'all', cacheOptions: {
    store: null, certify: async (response, identity) => { identities.push(identity); return response; },
  } });
  return (async () => {
    for (const mode of ['off', 'preview', 'all']) {
      const renderer = new Renderer({}, { PLL_NATIVE_IMPRESSIONS: mode });
      await (await renderer.fetch(new Request(origin('es') + '/'))).text();
    }
    assert.equal(new Set(identities.map(value => value.revision)).size, 3);
  })();
});

test('mode isolation never reads the old SQLite key and invalid cache revisions fail before work', async () => {
  const request = new Request(origin('es') + '/');
  const oldKey = cacheKeyFor(request, targetForCache(request, 'all', 'pll-html-memory-v1')).url;
  const reads = [];
  class Base { constructor() {} }
  const Renderer = createRendererClass(Base, () => async () => new Response('fresh'), { cacheMode: 'all', cacheOptions: {
    store: { get(key) { assert.notEqual(key, oldKey); reads.push(key); return null; }, put() {} },
    certify: async response => response,
  } });
  for (const mode of ['off', 'preview', 'all']) {
    const response = await new Renderer({}, { PLL_NATIVE_IMPRESSIONS: mode }).fetch(request);
    assert.equal(await response.text(), 'fresh');
  }
  assert.equal(new Set(reads).size, 3);
  for (const revision of ['', 'x'.repeat(65), '../unsafe', null, 123])
    assert.throws(() => createHtmlMemoryCache({ revision }), RangeError);
});
