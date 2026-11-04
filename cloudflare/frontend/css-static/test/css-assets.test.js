import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const cssHash = '7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61';
const assetPath = `/_pll-assets/sites-${cssHash}.css`;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = name => readFile(new URL(`../${name}`, import.meta.url));

test('source and Pages CSS are the exact pinned native bytes without transforms', async () => {
  const source = await read(`assets/sites-${cssHash}.css`);
  const served = await read(`dist/frontend${assetPath}`);
  assert.equal(source.byteLength, 1_954_605);
  assert.equal(sha(source), cssHash);
  assert.deepEqual(served, source);
});

test('only the exact static CSS URL bypasses the thin Pages renderer', async () => {
  const routes = JSON.parse(await read('dist/frontend/_routes.json'));
  assert.deepEqual(routes, { version: 1, include: ['/*'], exclude: [assetPath] });
  for (const path of [assetPath + '.old', '/_pll-assets/other.css', '/', '/_/search']) {
    assert.equal(routes.exclude.includes(path), false, path);
  }
});

test('immutable cache and CSS MIME headers apply only to the exact CSS URL', async () => {
  const lines = String(await read('dist/frontend/_headers')).trim().split(/\r?\n/u);
  assert.equal(lines[0], assetPath);
  assert.equal(lines.length, 3, 'one exact path and two CSS-only headers');
  const headers = new Headers();
  for (const line of lines.slice(1)) {
    assert.match(line, /^\s+[^:]+:/u);
    const colon = line.indexOf(':');
    headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
  }
  assert.equal(headers.get('Content-Type'), 'text/css; charset=UTF-8');
  assert.equal(headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
});

test('build manifest seals the static CSS, route metadata and unchanged frontend', async () => {
  const manifest = JSON.parse(await read('build-manifest.json'));
  for (const name of ['dist/frontend/_worker.js', 'dist/frontend/_routes.json',
    'dist/frontend/_headers', 'dist/frontend/deployment.txt', `dist/frontend${assetPath}`]) {
    const bytes = await read(name);
    assert.deepEqual(manifest.files[name], { bytes: bytes.byteLength, sha256: sha(bytes) }, name);
  }
  assert.equal(sha(await read('dist/frontend/_worker.js')),
    '3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9');
  assert.equal(String(await read('dist/frontend/deployment.txt')), 'Panama Legal Lab delivery assets.\n');
});

test('all twenty-six renderer files and their source provenance stay frozen', async () => {
  const provenanceBytes = await read('renderer-source-provenance.json');
  assert.equal(sha(provenanceBytes), '73ec185c946b0e66b97f7261e4e93cd54fed45bd4acdd5a514f3c4ee975e37a1');
  const provenance = JSON.parse(provenanceBytes);
  assert.equal(Object.keys(provenance.files).length, 26);
  for (const [file, hash] of Object.entries(provenance.files)) {
    assert.equal(sha(await read(`renderer/${file}`)), hash, file);
  }
});
