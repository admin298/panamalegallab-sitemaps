import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const cssHash = '7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61';
const assetPath = `/_pll-assets/sites-${cssHash}.css`;
const currentAssetPath = '/_pll-assets/sites-790a81d59f7bd31d12167ffe5405befff4738f024acd6ed39ab40a25b020291d.css';
const assetPaths = [assetPath, currentAssetPath];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = name => readFile(new URL(`../${name}`, import.meta.url));

test('source and Pages CSS are the exact pinned native bytes without transforms', async () => {
  const source = await read(`assets/sites-${cssHash}.css`);
  const served = await read(`dist/frontend${assetPath}`);
  assert.equal(source.byteLength, 1_954_605);
  assert.equal(sha(source), cssHash);
  assert.deepEqual(served, source);
});

test('only the two exact static CSS URLs bypass the thin Pages renderer', async () => {
  const routes = JSON.parse(await read('dist/frontend/_routes.json'));
  assert.deepEqual(routes, { version: 1, include: ['/*'], exclude: assetPaths });
  for (const path of [assetPath + '.old', currentAssetPath + '.old', '/_pll-assets/other.css', '/', '/_/search']) {
    assert.equal(routes.exclude.includes(path), false, path);
  }
});

test('immutable cache and CSS MIME headers apply only to the exact CSS URL', async () => {
  const lines = String(await read('dist/frontend/_headers')).trim().split(/\r?\n/u);
  assert.equal(lines.length, 6, 'two exact paths with two CSS-only headers each');
  for (const [index, path] of assetPaths.entries()) {
    assert.equal(lines[index * 3], path);
    const headers = new Headers();
    for (const line of lines.slice(index * 3 + 1, index * 3 + 3)) {
      assert.match(line, /^\s+[^:]+:/u);
      const colon = line.indexOf(':');
      headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
    }
    assert.equal(headers.get('Content-Type'), 'text/css; charset=UTF-8');
    assert.equal(headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
  }
});

test('build manifest seals the static CSS, route metadata and unchanged frontend', async () => {
  const manifest = JSON.parse(await read('build-manifest.json'));
  for (const name of ['dist/frontend/_worker.js', 'dist/frontend/_routes.json',
    'dist/frontend/_headers', 'dist/frontend/deployment.txt', `dist/frontend${assetPath}`, `dist/frontend${currentAssetPath}`]) {
    const bytes = await read(name);
    assert.deepEqual(manifest.files[name], { bytes: bytes.byteLength, sha256: sha(bytes) }, name);
  }
  assert.equal(sha(await read('dist/frontend/_worker.js')),
    '72d46465485f1b00ecab178a57ab9db03403ba37371011840183afa241a2f953');
  assert.equal(String(await read('dist/frontend/deployment.txt')), 'Panama Legal Lab delivery assets.\n');
});

test('all twenty-seven current renderer files are attested while the historical reference stays exact', async () => {
  const provenanceBytes = await read('renderer-source-provenance.json');
  assert.equal(JSON.parse(provenanceBytes).legacySourceProvenanceSha256, '73ec185c946b0e66b97f7261e4e93cd54fed45bd4acdd5a514f3c4ee975e37a1');
  assert.equal(sha(await read('renderer/reference-worker-58.js')), '58a76f2dd366fb20b03ebb9db9f0dd401df51ef10186959a96d844285c38e509');
  const provenance = JSON.parse(provenanceBytes);
  assert.equal(Object.keys(provenance.files).length, 27);
  for (const [file, hash] of Object.entries(provenance.files)) {
    assert.equal(sha(await read(`renderer/${file}`)), hash, file);
  }
});
