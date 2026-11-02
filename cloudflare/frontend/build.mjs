import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'frozen-core-manifest.json'), 'utf8'));
for (const [file, hash] of Object.entries(manifest.sourceFiles)) {
  const content = await readFile(path.join(root, 'vendor', file));
  if (createHash('sha256').update(content).digest('hex') !== hash) throw new Error(`Reviewed core snapshot changed: ${file}`);
}
const derivation = JSON.parse(await readFile(path.join(root, 'search-derivation.json'), 'utf8'));
let expectedProtocol = await readFile(path.join(root, derivation.sourceFile), 'utf8');
for (const { before, after } of derivation.changes) {
  if (expectedProtocol.split(before).length !== 2) throw new Error('Reviewed Search derivation token changed.');
  expectedProtocol = expectedProtocol.replace(before, after);
}
if (await readFile(path.join(root, derivation.derivedFile), 'utf8') !== expectedProtocol) throw new Error('Unrecorded Search protocol derivation.');
await mkdir(path.join(root, 'dist'), { recursive: true });
await build({ entryPoints: [path.join(root, 'src/entry.js')], bundle: true, format: 'esm',
  platform: 'browser', target: 'es2022', outfile: path.join(root, 'dist/_worker.js'), legalComments: 'none' });
await writeFile(path.join(root, 'dist/_routes.json'), JSON.stringify({ version: 1, include: ['/*'], exclude: [] }) + '\n');
await writeFile(path.join(root, 'dist/deployment.txt'), 'Panama Legal Lab delivery assets.\n');
console.log(JSON.stringify({ artifact: 'dist/_worker.js', reviewedCore: manifest.reviewedCompatibilityBundleSha256 }));
