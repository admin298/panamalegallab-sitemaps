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
const cssName = `sites-${CSS_SHA}.css`;
const outputs = [`assets/${cssName}`, `dist/frontend/_pll-assets/${cssName}`];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const require = (valid, message) => { if (!valid) throw new Error(message); };

export function decodeNativeCss(compressed) {
  require(Buffer.isBuffer(compressed) && compressed.length === GZIP_BYTES && compressed.length < 250000,
    'Unexpected compressed CSS size/type');
  require(digest(compressed) === GZIP_SHA, 'Unexpected compressed CSS hash');
  const decoded = zlib.gunzipSync(compressed, { maxOutputLength: CSS_BYTES });
  require(decoded.length === CSS_BYTES, 'Unexpected decoded CSS size');
  require(digest(decoded) === CSS_SHA, 'Unexpected decoded CSS hash');
  return decoded;
}

export function decodeStoredCss(encoded) {
  require(Buffer.isBuffer(encoded) && encoded.length === BASE64_BYTES, 'Unexpected base64 CSS size/type');
  const text = encoded.toString('latin1');
  require(/^[A-Za-z0-9+/]+={0,2}$/.test(text), 'Unexpected base64 CSS alphabet/padding');
  const compressed = Buffer.from(text, 'base64');
  require(compressed.toString('base64') === text, 'Noncanonical base64 CSS encoding');
  return decodeNativeCss(compressed);
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

async function existingOutput(target) {
  const info = await optionalStat(target);
  if (!info) return false;
  require(info.isFile() && !info.isSymbolicLink(), 'Existing CSS destination must be a regular non-symlink file');
  require(info.size === CSS_BYTES && digest(await fs.readFile(target)) === CSS_SHA,
    'Existing CSS differs from the approved original; refusing replacement');
  return true;
}

async function inputCss() {
  const input = fixedPath('assets/native-styles-gzip-base64.txt');
  const info = await fs.lstat(input);
  require(info.isFile() && !info.isSymbolicLink() && info.size === BASE64_BYTES, 'Base64 CSS must be the exact regular input file');
  return decodeStoredCss(await fs.readFile(input));
}

async function removeOwnStage(stage) {
  const current = await optionalStat(stage.temp);
  if (!current) return;
  require(current.isFile() && !current.isSymbolicLink() && current.dev === stage.identity.dev
    && current.ino === stage.identity.ino && current.birthtimeMs === stage.identity.birthtimeMs,
  'Staging file identity changed; refusing cleanup of another file');
  await fs.unlink(stage.temp);
}

async function stageOutput(row, css) {
  const temp = path.join(path.dirname(row.target), `.${cssName}.${randomUUID()}.prepare-tmp`);
  const handle = await fs.open(temp, 'wx', 0o600);
  const identity = await handle.stat().catch(async error => {
    const close = await handle.close().then(() => ({}), closeError => ({ error: closeError }));
    throw new AggregateError([error, close.error].filter(Boolean),
      'Unverified staging identity; temporary file retained for manual inspection');
  });
  const stage = { ...row, temp, identity };
  const write = await (async () => {
    try { await handle.writeFile(css); await handle.sync(); return {}; }
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
    if (error.code === 'EEXIST' && await existingOutput(stage.target)) return false;
    throw error;
  }
}

export async function prepareNativeCss() {
  await checkedDirectory(root);
  for (const relative of ['assets', 'dist', 'dist/frontend']) await checkedDirectory(fixedPath(relative));
  const css = await inputCss();
  await checkedDirectory(fixedPath('dist/frontend/_pll-assets'), true);
  const rows = await Promise.all(outputs.map(async relative => {
    const target = fixedPath(relative);
    return { relative, target, existing: await existingOutput(target) };
  }));
  let stages = [];
  let written = [];
  let unchanged = rows.filter(row => row.existing).map(row => row.relative);
  try {
    for (const row of rows.filter(item => !item.existing)) stages = [...stages, await stageOutput(row, css)];
    for (const stage of stages) {
      const created = await publishStage(stage);
      written = created ? [...written, stage.relative] : written;
      unchanged = created ? unchanged : [...unchanged, stage.relative];
    }
    for (const row of rows) require(await existingOutput(row.target), 'Prepared CSS output missing');
  } catch (error) {
    await cleanup(stages);
    throw new Error(`CSS publication incomplete: ${written.length} of 2 outputs created. ${error.message}. Resolve the error and rerun; existing approved files are preserved.`, { cause: error });
  }
  await cleanup(stages);
  return { written, unchanged, decodedSha256: CSS_SHA, decodedBytes: CSS_BYTES };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    require(process.argv.length === 2, 'No destination arguments are accepted; paths are fixed within this package');
    const result = await prepareNativeCss();
    console.log(`Native CSS verified: ${result.written.length} created, ${result.unchanged.length} already exact. Two fixed paths only.`);
  } catch (error) {
    console.error(`Native CSS preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
