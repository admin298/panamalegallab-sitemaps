import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test, mock } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import * as css from './prepare-native-css.mjs';

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version = 'native-20261106';
const currentSha = '790a81d59f7bd31d12167ffe5405befff4738f024acd6ed39ab40a25b020291d';
const currentBytes = 1955718;
const currentGzipSha = '6fb9bf35955b2c902b49f13fab453f1898e7db90f0084fa0df46d3069c1e4057';
const currentInput = 'assets/native-styles-20261106-gzip-base64.txt';
const encoded = await fs.readFile(path.join(packageRoot, currentInput));
const gzip = Buffer.from(encoded.toString('ascii'), 'base64');
const outputs = [`assets/sites-${css.CSS_SHA}.css`, `dist/frontend/_pll-assets/sites-${css.CSS_SHA}.css`,
  `assets/sites-${currentSha}.css`, `dist/frontend/_pll-assets/sites-${currentSha}.css`];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pll-native-css-current-'));
  assert.equal(path.dirname(root), await fs.realpath(os.tmpdir()));
  assert.ok(path.basename(root).startsWith('pll-native-css-current-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const name of ['tooling', 'assets', 'dist/frontend/_pll-assets'])
    await fs.mkdir(path.join(root, name), { recursive: true });
  await fs.copyFile(path.join(packageRoot, 'tooling/prepare-native-css.mjs'), path.join(root, 'tooling/prepare-native-css.mjs'));
  for (const name of ['assets/native-styles-gzip-base64.txt', currentInput])
    await fs.copyFile(path.join(packageRoot, name), path.join(root, name));
  return { root, helper: await import(pathToFileURL(path.join(root, 'tooling/prepare-native-css.mjs')).href) };
}

async function missing(file) {
  try { await fs.lstat(file); return false; }
  catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}

async function noOutputs(root) {
  for (const name of outputs) assert.equal(await missing(path.join(root, name)), true, name);
}

async function noStages(root) {
  for (const name of ['assets', 'dist/frontend/_pll-assets'])
    assert.equal((await fs.readdir(path.join(root, name))).some(file => file.endsWith('.prepare-tmp')), false);
}

test('current canonical transport and gzip restore exact CSS without changing the legacy default', () => {
  assert.equal(encoded.length, 295908);
  assert.equal(digest(encoded), 'ab5a65605332c46484806f6de1e1338cd4a1bc1de1833ea121c8ae063534c4bd');
  assert.equal(gzip.length, 221930);
  assert.equal(digest(gzip), currentGzipSha);
  assert.deepEqual([...gzip.subarray(4, 8)], [0, 0, 0, 0]);
  for (const raw of [css.decodeStoredCss(encoded, version), css.decodeNativeCss(gzip, version)]) {
    assert.equal(raw.length, currentBytes);
    assert.equal(digest(raw), currentSha);
  }
  assert.throws(() => css.decodeStoredCss(encoded), /base64.*size/i);
  assert.throws(() => css.decodeNativeCss(gzip, 'unknown'), /version/i);
});

test('current transport rejects malformed size, alphabet, padding and noncanonical pad bits', () => {
  for (const value of [encoded.subarray(1), Buffer.concat([encoded, Buffer.from('\n')]),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), encoded]), 'text'])
    assert.throws(() => css.decodeStoredCss(value, version), /base64.*size|base64.*type/i);
  for (const byte of [32, 255, 61, 45]) {
    const bad = Buffer.from(encoded); bad[20] = byte;
    assert.throws(() => css.decodeStoredCss(bad, version), /base64.*alphabet|base64.*padding/i);
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bad = Buffer.from(encoded), last = bad.length - 2;
  bad[last] = alphabet.charCodeAt(alphabet.indexOf(String.fromCharCode(bad[last])) ^ 1);
  assert.throws(() => css.decodeStoredCss(bad, version), /canonical.*base64|base64.*canonical/i);
});

test('current compressed bytes reject tampering and enforce decoded length, hash and expansion bound', t => {
  for (const value of [Buffer.alloc(221931), gzip.subarray(1), 'text'])
    assert.throws(() => css.decodeNativeCss(value, version));
  const corrupt = Buffer.from(gzip); corrupt[20] ^= 1;
  assert.throws(() => css.decodeNativeCss(corrupt, version), /compressed.*hash/i);
  const changed = Buffer.from(encoded); changed[0] = changed[0] === 72 ? 104 : 72;
  assert.throws(() => css.decodeStoredCss(changed, version), /compressed.*hash/i);
  const stub = mock.method(zlib, 'gunzipSync', (_input, options) => {
    assert.equal(options.maxOutputLength, currentBytes);
    return Buffer.alloc(currentBytes);
  });
  t.after(() => stub.mock.restore());
  assert.throws(() => css.decodeNativeCss(gzip, version), /decoded.*hash/i);
  stub.mock.mockImplementation(() => Buffer.alloc(currentBytes + 1));
  assert.throws(() => css.decodeNativeCss(gzip, version), /decoded.*size/i);
  stub.mock.mockImplementation(() => { throw new RangeError('Current expansion refused'); });
  assert.throws(() => css.decodeNativeCss(gzip, version), /Current expansion refused/);
});

test('current transport preflight refuses tampering before staging any legacy or current output', async t => {
  const { root, helper } = await fixture(t);
  const bad = Buffer.from(encoded); bad[24] = bad[24] === 65 ? 66 : 65;
  await fs.writeFile(path.join(root, currentInput), bad);
  let staged = false;
  const stub = mock.method(fs, 'open', async () => { staged = true; throw new Error('Staging began before current input preflight'); });
  t.after(() => stub.mock.restore());
  await assert.rejects(helper.prepareNativeCss(), /compressed.*hash/i);
  assert.equal(staged, false);
  await noOutputs(root);
  await noStages(root);
});

test('missing or symlinked current transport prevents every decoded output', async t => {
  const absent = await fixture(t);
  await fs.unlink(path.join(absent.root, currentInput));
  await assert.rejects(absent.helper.prepareNativeCss(), { code: 'ENOENT' });
  await noOutputs(absent.root);
  const linked = await fixture(t);
  const nativeLstat = fs.lstat.bind(fs);
  const stub = mock.method(fs, 'lstat', async name => {
    const info = await nativeLstat(name);
    return name === path.join(linked.root, currentInput)
      ? { ...info, isFile: () => true, isSymbolicLink: () => true } : info;
  });
  t.after(() => stub.mock.restore());
  await assert.rejects(linked.helper.prepareNativeCss(), /regular.*input/i);
  await noOutputs(linked.root);
});

test('each current destination is preflighted before any legacy destination can be published', async t => {
  for (const name of outputs.slice(2)) {
    const { root, helper } = await fixture(t);
    await fs.writeFile(path.join(root, name), 'current conflict');
    await assert.rejects(helper.prepareNativeCss(), /existing.*CSS/i);
    for (const other of outputs.filter(output => output !== name))
      assert.equal(await missing(path.join(root, other)), true, other);
    assert.equal(await fs.readFile(path.join(root, name), 'utf8'), 'current conflict');
    await noStages(root);
  }
});

test('current destinations reject symlinks and directories during batch preflight', async t => {
  const linked = await fixture(t), destination = path.join(linked.root, outputs[2]);
  await fs.writeFile(destination, 'placeholder');
  const nativeLstat = fs.lstat.bind(fs);
  const stub = mock.method(fs, 'lstat', async name => {
    const info = await nativeLstat(name);
    return name === destination ? { ...info, isFile: () => true, isSymbolicLink: () => true } : info;
  });
  await assert.rejects(linked.helper.prepareNativeCss(), /symlink|regular/i);
  stub.mock.restore();
  for (const name of outputs.filter(output => output !== outputs[2]))
    assert.equal(await missing(path.join(linked.root, name)), true);
  const directory = await fixture(t);
  await fs.mkdir(path.join(directory.root, outputs[3]));
  await assert.rejects(directory.helper.prepareNativeCss(), /regular/i);
  for (const name of outputs.slice(0, 3)) assert.equal(await missing(path.join(directory.root, name)), true);
});

test('a current staging failure occurs before publication and cleans all earlier exclusive stages', async t => {
  const { root, helper } = await fixture(t), nativeOpen = fs.open.bind(fs);
  let opened = 0;
  const stub = mock.method(fs, 'open', async (...args) => {
    const handle = await nativeOpen(...args);
    if (++opened !== 4) return handle;
    return { stat: handle.stat.bind(handle), close: handle.close.bind(handle), sync: handle.sync.bind(handle),
      writeFile: async () => { throw new Error('Current staging write failed'); } };
  });
  t.after(() => stub.mock.restore());
  await assert.rejects(helper.prepareNativeCss(), error => {
    assert.match(error.message, /0 of 4.*CSS staging failed/i);
    assert.match(error.cause.errors[0].message, /Current staging write failed/);
    return true;
  });
  assert.equal(opened, 4);
  await noOutputs(root);
  await noStages(root);
});

test('last current publication failure reports three of four and a rerun preserves all earlier bytes', async t => {
  const { root, helper } = await fixture(t), nativeLink = fs.link.bind(fs);
  const stub = mock.method(fs, 'link', async (from, to) => {
    if (to === path.join(root, outputs[3])) throw Object.assign(new Error('Current publication failed'), { code: 'EIO' });
    return nativeLink(from, to);
  });
  await assert.rejects(helper.prepareNativeCss(), /3 of 4/i);
  stub.mock.restore();
  const before = await Promise.all(outputs.slice(0, 3).map(name => fs.stat(path.join(root, name))));
  const result = await helper.prepareNativeCss();
  assert.deepEqual(result.written, [outputs[3]]);
  assert.deepEqual(result.unchanged, outputs.slice(0, 3));
  assert.equal(result.decodedSha256, css.CSS_SHA);
  assert.equal(result.decodedBytes, css.CSS_BYTES);
  assert.deepEqual(result.decodedVersions, [
    { id: 'native-20261104', sha256: css.CSS_SHA, bytes: css.CSS_BYTES },
    { id: version, sha256: currentSha, bytes: currentBytes },
  ]);
  for (const [index, name] of outputs.entries()) {
    assert.equal(digest(await fs.readFile(path.join(root, name))), index < 2 ? css.CSS_SHA : currentSha);
    if (index < 3) assert.equal((await fs.stat(path.join(root, name))).ino, before[index].ino);
  }
  await noStages(root);
});
