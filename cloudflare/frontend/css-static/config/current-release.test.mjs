import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { CSS_CONTRACTS } from '../src/css-static.js';
import { IMPRESSION_VIEW_SCRIPTS, CURRENT_IMPRESSION_VIEW_SCRIPTS } from '../src/native-impressions.js';
import { RENDERER_SHA256, RELEASE_ID } from '../src/boundary.js';

const RELEASE = 'pll-compatibility-recovery-20261106-v1';
const LEGACY = '58a76f2dd366fb20b03ebb9db9f0dd401df51ef10186959a96d844285c38e509';
const FRONTEND = '3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = name => readFile(new URL('../' + name, import.meta.url));
const json = async name => JSON.parse(await read(name));
const currentHashes = {
  es: 'f5d4c560ad14201d6b2e09c97a1430d41c9011552cd25da9a400036124dc7e7e',
  en: '4a93ea8e983a635da9746946a4a7f51d53f68836a20618010733b4646cf1538e',
  fr: '920c2dc788273b2eaedd1e4b07fba73428d16f3e086491d9122534537c44056e',
  it: 'bd7301963332f6bb8cf85fb709b306c1061f4662b51c3a587ea6154d0cb651d2',
};

test('current release identifies the changed renderer while retaining the exact thin frontend', async () => {
  const manifest = await json('build-manifest.json');
  assert.equal(manifest.release, RELEASE);
  assert.equal(RELEASE_ID, RELEASE);
  assert.equal(manifest.htmlCache.mode, 'off');
  assert.equal(manifest.rendererWorkerSha256, RENDERER_SHA256);
  assert.notEqual(RENDERER_SHA256, LEGACY);
  assert.equal(sha(await read('dist/frontend/_worker.js')), FRONTEND);
  for (const field of ['addedBindings', 'newPaidResources', 'recurringJobs'])
    assert.equal(manifest.htmlCache[field], 0);
});

test('both reviewed CSS versions are exact static assets with exact exclusions and immutable headers', async () => {
  assert.equal(CSS_CONTRACTS.length, 2);
  const manifest = await json('build-manifest.json');
  assert.deepEqual(manifest.cssVersions, CSS_CONTRACTS);
  assert.deepEqual(await json('dist/frontend/_routes.json'),
    { version: 1, include: ['/*'], exclude: CSS_CONTRACTS.map(row => row.assetPath) });
  const expectedHeaders = CSS_CONTRACTS.map(row => `${row.assetPath}\n  Content-Type: text/css; charset=UTF-8\n  Cache-Control: public, max-age=31536000, immutable\n`).join('');
  assert.equal(String(await read('dist/frontend/_headers')), expectedHeaders);
  for (const contract of CSS_CONTRACTS) {
    const source = await read('assets/' + contract.assetPath.split('/').at(-1));
    const served = await read('dist/frontend' + contract.assetPath);
    assert.equal(source.length, contract.bytes);
    assert.equal(sha(source), contract.sha256);
    assert.deepEqual(served, source);
  }
});

test('current four-locale native script receipts are recorded without replacing the legacy contracts', async () => {
  const provenance = await json('impression-contract-provenance.json');
  const manifest = await json('build-manifest.json');
  assert.deepEqual(provenance.viewScriptUrls, IMPRESSION_VIEW_SCRIPTS);
  assert.deepEqual(provenance.currentViewScriptUrls, CURRENT_IMPRESSION_VIEW_SCRIPTS);
  assert.deepEqual(provenance.currentViewScriptSha256, currentHashes);
  assert.deepEqual(manifest.impressions.currentViewScriptUrls, CURRENT_IMPRESSION_VIEW_SCRIPTS);
  assert.deepEqual(manifest.impressions.currentViewScriptSha256, currentHashes);
  assert.equal(provenance.recognizedArrayLength, 518);
  assert.equal(provenance.currentRecognizedArrayLength, 519);
  assert.equal(Object.keys(provenance.viewScriptSha256).length, 4);
});

test('renderer provenance covers all27 sources and matches a reproducible current reference, retaining reference58', async () => {
  const provenance = await json('renderer-source-provenance.json');
  assert.equal(provenance.legacyRendererWorkerSha256, LEGACY);
  assert.equal(sha(await read('renderer/reference-worker-58.js')), LEGACY);
  assert.equal(Object.keys(provenance.files).length, 27);
  assert.ok(provenance.files['src/current-config-contract.js']);
  for (const [file, hash] of Object.entries(provenance.files))
    assert.equal(sha(await read('renderer/' + file)), hash, file);
  const reference = await build({ absWorkingDir: fileURLToPath(new URL('../renderer/', import.meta.url)),
    entryPoints: ['src/entry.js'], bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
    legalComments: 'none', write: false, define: { __PLL_HERO_PRIORITY__: 'false' } });
  assert.equal(sha(reference.outputFiles[0].contents), provenance.rendererWorkerSha256);
  assert.equal(provenance.rendererWorkerSha256, RENDERER_SHA256);
});

test('recovery retains the existing all-policy resource config and refuses non-off HTML cache builds', async () => {
  assert.deepEqual(await json('config/backend.cache-off.wrangler.json'), await json('config/backend.initial-render-all.wrangler.json'));
  for (const mode of ['preview', 'all']) {
    const result = spawnSync(process.execPath, ['build.mjs'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), env: { ...process.env, PLL_HTML_CACHE_MODE: mode }, encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Recovery build requires PLL_HTML_CACHE_MODE=off/u);
  }
});
