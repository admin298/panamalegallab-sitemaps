import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const requestedProfile = process.argv[2] ?? '--profile=all';
if (!['--profile=full', '--profile=geometry', '--profile=all'].includes(requestedProfile) || process.argv.length > 3) throw new Error('Unsupported build profile.');
const profiles = requestedProfile === '--profile=all' ? ['full', 'geometry'] : [requestedProfile.slice('--profile='.length)];
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
const readinessBytes = await readFile(path.join(root, 'data/readiness.json'));
const readinessProvenance = JSON.parse(await readFile(path.join(root, 'data/provenance.json'), 'utf8'));
if (createHash('sha256').update(readinessBytes).digest('hex') !== readinessProvenance.output.sha256) {
  throw new Error('Reviewed readiness data changed.');
}
const readinessData = JSON.parse(readinessBytes);
if (readinessData.draft !== true || Object.keys(readinessData.descriptions).length !== 148
  || Object.keys(readinessData.languageLinks).length !== 252) throw new Error('Unsupported readiness data scope.');
for (const profile of profiles) {
  const output = profile === 'geometry' ? 'dist-geometry' : 'dist';
  await mkdir(path.join(root, output), { recursive: true });
  await build({ entryPoints: [path.join(root, 'src/entry.js')], bundle: true, format: 'esm',
    platform: 'browser', target: 'es2022', outfile: path.join(root, output, '_worker.js'), legalComments: 'none',
    define: { __PLL_HERO_PRIORITY__: String(profile !== 'geometry') } });
  await writeFile(path.join(root, output, '_routes.json'), JSON.stringify({ version: 1, include: ['/*'], exclude: [] }) + '\n');
  await writeFile(path.join(root, output, 'deployment.txt'), 'Panama Legal Lab delivery assets.\n');
  console.log(JSON.stringify({ artifact: `${output}/_worker.js`, profile, reviewedCore: manifest.reviewedCompatibilityBundleSha256 }));
}
