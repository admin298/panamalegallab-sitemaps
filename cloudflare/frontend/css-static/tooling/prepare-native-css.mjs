/** Explicit offline preparation only. No postinstall hook, network, or runtime change. */
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

export const CSS_SHA = '7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61';
export const CSS_BYTES = 1954605;
export const GZIP_SHA = 'a929e1a80e2a0a876fafbffcddf45fcc1873db166fa0ade583c405ae2922e962';
export const GZIP_BYTES = 221926;
export const BASE64_BYTES = 295904;
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const legacyId = 'native-20261104';
const versions = Object.freeze([
  Object.freeze({ id: legacyId, input: 'assets/native-styles-gzip-base64.txt',
    sha256: CSS_SHA, bytes: CSS_BYTES, gzipSha256: GZIP_SHA, gzipBytes: GZIP_BYTES, base64Bytes: BASE64_BYTES }),
  Object.freeze({ id: 'native-20261106', input: 'assets/native-styles-20261106-gzip-base64.txt',
    sha256: '790a81d59f7bd31d12167ffe5405befff4738f024acd6ed39ab40a25b020291d', bytes: 1955718,
    gzipSha256: '6fb9bf35955b2c902b49f13fab453f1898e7db90f0084fa0df46d3069c1e4057',
    gzipBytes: 221930, base64Bytes: 295908 }),
]);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const require = (valid, message) => { if (!valid) throw new Error(message); };

function versionFor(id) {
  const version = versions.find(row => row.id === id);
  require(Boolean(version), 'Unsupported CSS version');
  return version;
}

export function decodeNativeCss(compressed, id = legacyId) {
  const version = versionFor(id);
  require(Buffer.isBuffer(compressed) && compressed.length === version.gzipBytes && compressed.length < 250000,
    'Unexpected compressed CSS size/type');
  require(digest(compressed) === version.gzipSha256, 'Unexpected compressed CSS hash');
  const decoded = zlib.gunzipSync(compressed, { maxOutputLength: version.bytes });
  require(decoded.length === version.bytes, 'Unexpected decoded CSS size');
  require(digest(decoded) === version.sha256, 'Unexpected decoded CSS hash');
  return decoded;
}

export function decodeStoredCss(encoded, id = legacyId) {
  const version = versionFor(id);
  require(Buffer.isBuffer(encoded) && encoded.length === version.base64Bytes, 'Unexpected base64 CSS size/type');
  const text = encoded.toString('latin1');
  require(/^[A-Za-z0-9+/]+={0,2}$/.test(text), 'Unexpected base64 CSS alphabet/padding');
  const compressed = Buffer.from(text, 'base64');
  require(compressed.toString('base64') === text, 'Noncanonical base64 CSS encoding');
  return decodeNativeCss(compressed, id);
}

function fixedPath(relative) {
  const result = path.resolve(root, relative);
  const inside = path.relative(root, result);
  require(inside && !inside.startsWith('..') && !path.isAbsolute(inside), 'Fixed package path escaped its root');
  return result;
}

async function optionalStat(name) {
  try { return await fs.lstat(name); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function checkedDirectory(name, allowCreate = false) {
  const before = await optionalStat(name);
  if (!before && allowCreate) await fs.mkdir(name);
  const info = before ?? await fs.lstat(name);
  require(info.isDirectory() && !info.isSymbolicLink(), 'Expected a real directory without symlink/junction');
  require(path.relative(name, await fs.realpath(name)) === '', 'Directory resolves through a symlink/junction');
}

async function existingOutput(target, version) {
  const info = await optionalStat(target);
  if (!info) return false;
  require(info.isFile() && !info.isSymbolicLink(), 'Existing CSS destination must be a regular non-symlink file');
  require(info.size === version.bytes && digest(await fs.readFile(target)) === version.sha256,
    'Existing CSS differs from the approved original; refusing replacement');
  return true;
}

async function inputCss(version) {
  const input = fixedPath(version.input);
  const info = await fs.lstat(input);
  require(info.isFile() && !info.isSymbolicLink() && info.size === version.base64Bytes, 'Base64 CSS must be the exact regular input file');
  return decodeStoredCss(await fs.readFile(input), version.id);
}

async function removeOwnStage(stage) {
  const current = await optionalStat(stage.temp);
  if (!current) return;
  require(current.isFile() && !current.isSymbolicLink() && current.dev === stage.identity.dev
    && current.ino === stage.identity.ino && current.birthtimeMs === stage.identity.birthtimeMs,
  'Staging file identity changed; refusing cleanup of another file');
  await fs.unlink(stage.temp);
}

async function stageOutput(row) {
  const cssName = `sites-${row.version.sha256}.css`;
  const temp = path.join(path.dirname(row.target), `.${cssName}.${randomUUID()}.prepare-tmp`);
  const handle = await fs.open(temp, 'wx', 0o600);
  const identity = await handle.stat().catch(async error => {
    const close = await handle.close().then(() => ({}), closeError => ({ error: closeError }));
    throw new AggregateError([error, close.error].filter(Boolean),
      'Unverified staging identity; temporary file retained for manual inspection');
  });
  const stage = { ...row, temp, identity };
  const write = await (async () => {
    try { await handle.writeFile(row.css); await handle.sync(); return {}; }
    catch (error) { return { error }; }
  })();
  const close = await handle.close().then(() => ({}), error => ({ error }));
  if (write.error || close.error) {
    await removeOwnStage(stage);
    throw new AggregateError([write.error, close.error].filter(Boolean), 'CSS staging failed');
  }
  return stage;
}

async function cleanup(stages) {
  const results = await Promise.allSettled(stages.map(removeOwnStage));
  const failures = results.filter(row => row.status === 'rejected').map(row => row.reason);
  if (failures.length) throw new AggregateError(failures, 'CSS staging cleanup failed');
}

async function publishStage(stage) {
  await checkedDirectory(path.dirname(stage.target));
  try { await fs.link(stage.temp, stage.target); return true; }
  catch (error) {
    if (error.code === 'EEXIST' && await existingOutput(stage.target, stage.version)) return false;
    throw error;
  }
}

export async function prepareNativeCss() {
  await checkedDirectory(root);
  for (const relative of ['assets', 'dist', 'dist/frontend']) await checkedDirectory(fixedPath(relative));
  const decoded = await Promise.all(versions.map(async version => ({ version, css: await inputCss(version) })));
  await checkedDirectory(fixedPath('dist/frontend/_pll-assets'), true);
  const rows = await Promise.all(decoded.flatMap(({ version, css }) => {
    const name = `sites-${version.sha256}.css`;
    return [`assets/${name}`, `dist/frontend/_pll-assets/${name}`].map(async relative => {
      const target = fixedPath(relative);
      return { relative, target, version, css, existing: await existingOutput(target, version) };
    });
  }));
  let stages = [];
  let written = [];
  let unchanged = rows.filter(row => row.existing).map(row => row.relative);
  try {
    for (const row of rows.filter(item => !item.existing)) stages = [...stages, await stageOutput(row)];
    for (const stage of stages) {
      const created = await publishStage(stage);
      written = created ? [...written, stage.relative] : written;
      unchanged = created ? unchanged : [...unchanged, stage.relative];
    }
    for (const row of rows) require(await existingOutput(row.target, row.version), 'Prepared CSS output missing');
  } catch (error) {
    await cleanup(stages);
    throw new Error(`CSS publication incomplete: ${written.length} of 4 outputs created. ${error.message}. Resolve the error and rerun; existing approved files are preserved.`, { cause: error });
  }
  await cleanup(stages);
  return { written, unchanged, decodedSha256: CSS_SHA, decodedBytes: CSS_BYTES,
    decodedVersions: versions.map(({ id, sha256, bytes }) => ({ id, sha256, bytes })) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    require(process.argv.length === 2, 'No destination arguments are accepted; paths are fixed within this package');
    const result = await prepareNativeCss();
    console.log(`Native CSS verified: ${result.written.length} created, ${result.unchanged.length} already exact. Four fixed paths only.`);
  } catch (error) {
    console.error(`Native CSS preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
