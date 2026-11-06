import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, mock } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import { decodeStoredCss, decodeNativeCss, CSS_BYTES, CSS_SHA, GZIP_BYTES, GZIP_SHA, BASE64_BYTES } from './prepare-native-css.mjs';

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cssName = `sites-${CSS_SHA}.css`;
const currentSha = '790a81d59f7bd31d12167ffe5405befff4738f024acd6ed39ab40a25b020291d';
const currentName = `sites-${currentSha}.css`;
const outputs = [`assets/${cssName}`, `dist/frontend/_pll-assets/${cssName}`,
  `assets/${currentName}`, `dist/frontend/_pll-assets/${currentName}`];
const outputSha = name => name.includes(currentSha) ? currentSha : CSS_SHA;
const encoded = await fs.readFile(path.join(packageRoot, 'assets/native-styles-gzip-base64.txt'));
const currentEncoded = await fs.readFile(path.join(packageRoot, 'assets/native-styles-20261106-gzip-base64.txt'));
const gzip = Buffer.from(encoded.toString('ascii'), 'base64');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pll-native-css-test-'));
  assert.equal(path.dirname(root), await fs.realpath(os.tmpdir()));
  assert.ok(path.basename(root).startsWith('pll-native-css-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'tooling'));
  await fs.mkdir(path.join(root, 'assets'));
  await fs.mkdir(path.join(root, 'dist/frontend'), { recursive: true });
  await fs.copyFile(path.join(packageRoot, 'tooling/prepare-native-css.mjs'), path.join(root, 'tooling/prepare-native-css.mjs'));
  await fs.writeFile(path.join(root, 'assets/native-styles-gzip-base64.txt'), encoded);
  await fs.writeFile(path.join(root, 'assets/native-styles-20261106-gzip-base64.txt'), currentEncoded);
  const helper = await import(pathToFileURL(path.join(root, 'tooling/prepare-native-css.mjs')).href);
  return { root, helper };
}

async function exists(file) {
  try { await fs.lstat(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function assertNoTemps(root) {
  for (const dir of ['assets', 'dist/frontend/_pll-assets']) {
    if (await exists(path.join(root, dir))) {
      assert.equal((await fs.readdir(path.join(root, dir))).some(name => name.endsWith('.prepare-tmp')), false);
    }
  }
}

test('exact deterministic gzip decodes to the original CSS, with bounded output', () => {
  assert.equal(gzip.length, GZIP_BYTES);
  assert.equal(digest(gzip), GZIP_SHA);
  const raw = decodeNativeCss(gzip);
  assert.equal(raw.length, CSS_BYTES);
  assert.equal(digest(raw), CSS_SHA);
  assert.deepEqual([...gzip.subarray(4, 8)], [0, 0, 0, 0]);
});

test('exact canonical ASCII transport restores the original CSS', () => {
  assert.equal(encoded.length, BASE64_BYTES);
  assert.equal(encoded.toString('ascii'), gzip.toString('base64'));
  assert.equal(digest(decodeStoredCss(encoded)), CSS_SHA);
});

test('base64 transport bounds reject truncation, newline, BOM and non-buffer input', () => {
  for (const value of [encoded.subarray(0, -1), Buffer.concat([encoded, Buffer.from('\n')]),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), encoded]), 'text']) {
    assert.throws(() => decodeStoredCss(value), /base64.*size|base64.*type/i);
  }
});

test('base64 alphabet and padding reject whitespace, non-ASCII and internal equals', () => {
  for (const byte of [32, 255, 61, 45]) {
    const bad = Buffer.from(encoded); bad[20] = byte;
    assert.throws(() => decodeStoredCss(bad), /base64.*alphabet|base64.*padding/i);
  }
});

test('noncanonical pad bits and changed letter case fail before publication', () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bad = Buffer.from(encoded);
  bad[bad.length - 3] = alphabet.charCodeAt(alphabet.indexOf(String.fromCharCode(bad[bad.length - 3])) ^ 1);
  assert.throws(() => decodeStoredCss(bad), /canonical.*base64|base64.*canonical/i);
  const changed = Buffer.from(encoded); changed[0] = changed[0] === 72 ? 104 : 72;
  assert.throws(() => decodeStoredCss(changed), /compressed.*hash/i);
});

test('compressed tampering, oversized input and non-buffer inputs fail closed', () => {
  for (const value of [Buffer.alloc(GZIP_BYTES + 1), Buffer.from(gzip.subarray(1)), 'text']) {
    assert.throws(() => decodeNativeCss(value));
  }
  const corrupt = Buffer.from(gzip); corrupt[20] ^= 1;
  assert.throws(() => decodeNativeCss(corrupt), /compressed.*hash/i);
});

test('decoded wrong hash and wrong length are refused even if the decoder misbehaves', t => {
  const stub = mock.method(zlib, 'gunzipSync', () => Buffer.alloc(CSS_BYTES));
  t.after(() => stub.mock.restore());
  assert.throws(() => decodeNativeCss(gzip), /decoded.*hash/i);
  stub.mock.mockImplementation(() => Buffer.alloc(CSS_BYTES + 1));
  assert.throws(() => decodeNativeCss(gzip), /decoded.*size/i);
});

test('decompression receives its output limit and propagates an expansion failure', t => {
  const stub = mock.method(zlib, 'gunzipSync', (_input, options) => {
    assert.equal(options.maxOutputLength, CSS_BYTES);
    throw new RangeError('Bounded expansion refused');
  });
  t.after(() => stub.mock.restore());
  assert.throws(() => decodeNativeCss(gzip), /Bounded expansion refused/);
});

test('preparation writes only the four fixed paths and reruns without replacing them', async t => {
  const { root, helper } = await fixture(t);
  const first = await helper.prepareNativeCss();
  assert.deepEqual(first.written, outputs);
  const identities = await Promise.all(outputs.map(name => fs.stat(path.join(root, name))));
  for (const name of outputs) assert.equal(digest(await fs.readFile(path.join(root, name))), outputSha(name));
  const second = await helper.prepareNativeCss();
  assert.deepEqual(second.written, []);
  assert.deepEqual(second.unchanged, outputs);
  for (const [index, name] of outputs.entries()) assert.equal((await fs.stat(path.join(root, name))).ino, identities[index].ino);
  await assertNoTemps(root);
});

test('a conflicting second output refuses all file writes during preflight', async t => {
  const { root, helper } = await fixture(t);
  await fs.mkdir(path.dirname(path.join(root, outputs[1])));
  await fs.writeFile(path.join(root, outputs[1]), 'existing modified content');
  await assert.rejects(helper.prepareNativeCss(), /existing.*CSS/i);
  assert.equal(await exists(path.join(root, outputs[0])), false);
  assert.equal(await fs.readFile(path.join(root, outputs[1]), 'utf8'), 'existing modified content');
  await assertNoTemps(root);
});

test('symlink metadata guards refuse ancestors and destinations without platform privileges', async t => {
  const { root, helper } = await fixture(t);
  const nativeLstat = fs.lstat.bind(fs);
  await fs.mkdir(path.join(root, 'dist/frontend/_pll-assets'));
  const stub = mock.method(fs, 'lstat', async name => {
    const info = await nativeLstat(name);
    return name === path.join(root, 'dist/frontend/_pll-assets') ? { ...info, isDirectory: () => true, isSymbolicLink: () => true } : info;
  });
  await assert.rejects(helper.prepareNativeCss(), /symlink|directory/i);
  stub.mock.restore();
  assert.equal(await exists(path.join(root, outputs[0])), false);
  const other = await fixture(t);
  await fs.mkdir(path.dirname(path.join(other.root, outputs[1])));
  await fs.writeFile(path.join(other.root, outputs[1]), 'placeholder');
  const next = mock.method(fs, 'lstat', async name => {
    const info = await nativeLstat(name);
    return name === path.join(other.root, outputs[1]) ? { ...info, isFile: () => true, isSymbolicLink: () => true } : info;
  });
  t.after(() => next.mock.restore());
  await assert.rejects(other.helper.prepareNativeCss(), /symlink|regular/i);
  assert.equal(await exists(path.join(other.root, outputs[0])), false);
});

test('a directory at a fixed file path is refused', async t => {
  const { root, helper } = await fixture(t);
  await fs.mkdir(path.join(root, outputs[0]));
  await assert.rejects(helper.prepareNativeCss(), /regular/i);
});

test('stored transport tampering produces no decoded output', async t => {
  const { root, helper } = await fixture(t);
  const corrupt = Buffer.from(encoded); corrupt[24] = corrupt[24] === 65 ? 66 : 65;
  await fs.writeFile(path.join(root, 'assets/native-styles-gzip-base64.txt'), corrupt);
  await assert.rejects(helper.prepareNativeCss(), /compressed.*hash/i);
  for (const name of outputs) assert.equal(await exists(path.join(root, name)), false);
});

test('first-publication failure leaves no output and cleans exclusive staging files', async t => {
  const { root, helper } = await fixture(t);
  const stub = mock.method(fs, 'link', async () => { throw Object.assign(new Error('Injected link failure'), { code: 'EIO' }); });
  t.after(() => stub.mock.restore());
  await assert.rejects(helper.prepareNativeCss(), /0 of 4|publication/i);
  for (const name of outputs) assert.equal(await exists(path.join(root, name)), false);
  await assertNoTemps(root);
});

test('staging write failure closes and removes only its exclusive temporary file', async t => {
  const { root, helper } = await fixture(t);
  const realOpen = fs.open.bind(fs);
  const stub = mock.method(fs, 'open', async (...args) => {
    const handle = await realOpen(...args);
    return { stat: handle.stat.bind(handle), close: handle.close.bind(handle), sync: handle.sync.bind(handle),
      writeFile: async () => { throw new Error('Injected staging write failure'); } };
  });
  t.after(() => stub.mock.restore());
  await assert.rejects(helper.prepareNativeCss(), /0 of 4/i);
  for (const name of outputs) assert.equal(await exists(path.join(root, name)), false);
  await assertNoTemps(root);
});

test('an initial staging-stat failure closes its handle and explicitly retains an unverified temp', async t => {
  const { root, helper } = await fixture(t);
  const realOpen = fs.open.bind(fs);
  let closed = 0;
  const stub = mock.method(fs, 'open', async (...args) => {
    const handle = await realOpen(...args);
    return { stat: async () => { throw new Error('Injected initial stat failure'); },
      close: async () => { await handle.close(); closed += 1; } };
  });
  t.after(() => stub.mock.restore());
  await assert.rejects(helper.prepareNativeCss(), /unverified.*retained/i);
  assert.equal(closed, 1);
  for (const name of outputs) assert.equal(await exists(path.join(root, name)), false);
  assert.equal((await fs.readdir(path.join(root, 'assets'))).filter(name => name.endsWith('.prepare-tmp')).length, 1);
});

test('second-publication failure reports partial success; rerun completes safely', async t => {
  const { root, helper } = await fixture(t);
  const realLink = fs.link.bind(fs);
  const stub = mock.method(fs, 'link', async (from, to) => {
    if (to === path.join(root, outputs[1])) throw Object.assign(new Error('Injected second link failure'), { code: 'EIO' });
    return realLink(from, to);
  });
  await assert.rejects(helper.prepareNativeCss(), /1 of 4/i);
  stub.mock.restore();
  assert.equal(digest(await fs.readFile(path.join(root, outputs[0]))), CSS_SHA);
  assert.equal(await exists(path.join(root, outputs[1])), false);
  await assertNoTemps(root);
  const rerun = await helper.prepareNativeCss();
  assert.deepEqual(rerun.written, outputs.slice(1));
  assert.deepEqual(rerun.unchanged, [outputs[0]]);
});

test('a concurrent conflicting destination is never overwritten', async t => {
  const { root, helper } = await fixture(t);
  const stub = mock.method(fs, 'link', async (_from, to) => {
    await fs.writeFile(to, 'concurrent content');
    throw Object.assign(new Error('exists'), { code: 'EEXIST' });
  });
  t.after(() => stub.mock.restore());
  await assert.rejects(helper.prepareNativeCss(), /publication|existing.*CSS/i);
  assert.equal(await fs.readFile(path.join(root, outputs[0]), 'utf8'), 'concurrent content');
  await assertNoTemps(root);
});

test('actual local CLI succeeds and rejects destination arguments', async t => {
  const { root } = await fixture(t);
  const command = path.join(root, 'tooling/prepare-native-css.mjs');
  const bad = spawnSync(process.execPath, [command, '--output', os.tmpdir()], { encoding: 'utf8' });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /arguments|fixed/i);
  const good = spawnSync(process.execPath, [command], { encoding: 'utf8' });
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, /verified/i);
  for (const name of outputs) assert.equal(digest(await fs.readFile(path.join(root, name))), outputSha(name));
});
