import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { impressionDocumentEdit } from '../src/native-impressions.js';
import { spliceCssLink, cssFallbackScript, CSS_NATIVE_URL, CSS_ASSET_PATH } from '../src/css-static.js';
import { collectRawTextSpans } from '../src/html-spans.js';
import { SITES } from '../renderer/vendor/logic.js';
import { impressionDocument, impressionScript, VIEW_SCRIPTS } from './fixtures/impression-fixtures.js';
import { CURRENT_VIEW_URLS, CURRENT_CSS_URL, CURRENT_CSS_SHA, CURRENT_CSS_PATH,
  CURRENT_NONCE, currentScript, currentConfig, currentDocument } from './fixtures/current-native-fixtures.js';

const patch = (source, edit) => source.slice(0, edit.start) + edit.replacement + source.slice(edit.end);
const edit = (source, lang = 'es') => impressionDocumentEdit(source, SITES[lang], CURRENT_NONCE, collectRawTextSpans(source));
const stripFallback = html => html.replace(/<script nonce="CurrentNonce123" data-pll-css-fallback="v1">[\s\S]*?<\/script>/u, '');

test('reviewed current locale bundle and519shape change only native field357 in four languages', () => {
  for (const lang of ['es', 'en', 'fr', 'it']) {
    for (const value of [null, false, true]) {
      const source = currentDocument(lang, { script: currentScript(value) });
      const mutation = edit(source, lang);
      assert.ok(mutation, lang);
      assert.equal(mutation.changed, value !== true);
      assert.equal(patch(source, mutation), currentDocument(lang, { script: currentScript(true) }));
      assert.ok(source.includes('G-FNRPN562BY'));
    }
  }
});

test('current and legacy viewer/schema contracts cannot be mixed or extended', () => {
  const source = currentDocument();
  const configTag = `<script nonce="${CURRENT_NONCE}">${currentScript()}</script>`;
  const viewTag = `<script src="${CURRENT_VIEW_URLS.es}" nonce="${CURRENT_NONCE}"></script>`;
  const invalid = [
    source.replace(CURRENT_VIEW_URLS.es, VIEW_SCRIPTS.es),
    currentDocument('es', { script: impressionScript() }),
    currentDocument('es', { script: '_at_config = ' + JSON.stringify(currentConfig(null).with(518, 1)) + ';' }),
    currentDocument('es', { script: '_at_config = ' + JSON.stringify([...currentConfig(null), 0]) + ';' }),
    currentDocument('es', { script: '_at_config = ' + JSON.stringify(currentConfig(null).with(316, 'https://sites.google.com/other/')) + ';' }),
    currentDocument('es', { script: '_at_config = ' + JSON.stringify(currentConfig(null).with(212, 1)) + ';' }),
    ...[0, 1, 'true', {}, []].map(value => currentDocument('es', { script: '_at_config = ' + JSON.stringify(currentConfig(value)) + ';' })),
    source.replace(CURRENT_VIEW_URLS.es, CURRENT_VIEW_URLS.en),
    source.replace(CURRENT_VIEW_URLS.es, CURRENT_VIEW_URLS.es + '/next'),
    source.replace(configTag, configTag + configTag),
    source.replace(viewTag, viewTag + viewTag),
    source.replace(configTag, configTag.replace(CURRENT_NONCE, 'DifferentNonce123')),
    source.replace(viewTag, viewTag.replace(CURRENT_NONCE, 'DifferentNonce123')),
    source.replace(configTag, '<!--' + configTag + '-->'),
    source.replace(configTag, configTag.replace('<script ', '<script type="application/json" ')),
    source.replace(configTag, configTag.replace('nonce=', 'nonce="OtherNonce123" nonce=')),
    currentDocument('es', { script: currentScript() + '_at_config=[];' }),
  ];
  for (const value of invalid) assert.equal(edit(value), null);
});

test('current CSS maps exact version to exact bytes while preserving legacy mapping and link attributes', async () => {
  for (const lang of ['es', 'en', 'fr', 'it']) {
    const source = currentDocument(lang);
    const mapped = spliceCssLink(source, CURRENT_NONCE);
    assert.ok(mapped, lang);
    assert.equal(stripFallback(mapped), source.replace(`href="${CURRENT_CSS_URL}"`, `href="${CURRENT_CSS_PATH}"`));
    for (const bad of [CURRENT_CSS_URL + '/next', CURRENT_CSS_URL.replace('www.gstatic.com', 'evil.invalid')])
      assert.equal(spliceCssLink(source.replace(CURRENT_CSS_URL, bad), CURRENT_NONCE), null);
    assert.equal(spliceCssLink(source.replace('data-id="_cl"', 'data-id="_cl" integrity="sha256-unknown"'), CURRENT_NONCE), null);
    assert.equal(spliceCssLink(source.replace('</head>', `<link rel="stylesheet" nonce="StyleNonce456" data-id="_cl" href="${CSS_NATIVE_URL}"></head>`), CURRENT_NONCE), null);
  }
  const bytes = await readFile(new URL('../assets/' + CURRENT_CSS_PATH.split('/').at(-1), import.meta.url));
  assert.equal(bytes.length, 1955718);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), CURRENT_CSS_SHA);
  const old = spliceCssLink(impressionDocument('es'), 'ValidNonce123');
  assert.ok(old.includes(`href="${CSS_ASSET_PATH}"`));
});

test('CSS fallback restores only each mapped version to its own native URL once per exact LINK', () => {
  let listener;
  const document = { location: { origin: 'https://www.panamalegallab.com' },
    addEventListener(name, callback, capture) { assert.equal(name, 'error'); assert.equal(capture, true); listener = callback; } };
  vm.runInNewContext(cssFallbackScript(), { document, WeakSet });
  const node = href => { const attrs = { href, rel: 'stylesheet', 'data-id': '_cl' }; return {
    tagName: 'LINK', getAttribute: name => attrs[name] ?? null, setAttribute: (name, value) => { attrs[name] = value; },
    get href() { return 'https://www.panamalegallab.com' + attrs.href; }, attrs }; };
  for (const [path, original] of [[CSS_ASSET_PATH, CSS_NATIVE_URL], [CURRENT_CSS_PATH, CURRENT_CSS_URL]]) {
    const link = node(path); listener({ target: link }); assert.equal(link.attrs.href, original);
    link.attrs.href = path; listener({ target: link }); assert.equal(link.attrs.href, path);
  }
  for (const path of [CURRENT_CSS_PATH + '?extra', 'https://evil.invalid' + CURRENT_CSS_PATH, CURRENT_CSS_URL]) {
    const link = node(path); listener({ target: link }); assert.equal(link.attrs.href, path);
  }
});
