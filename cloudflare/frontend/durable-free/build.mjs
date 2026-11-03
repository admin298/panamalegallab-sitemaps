import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const provenance = JSON.parse(await readFile(path.join(root, 'renderer-source-provenance.json'), 'utf8'));
for (const [file, hash] of Object.entries(provenance.files)) {
  if (sha(await readFile(path.join(root, 'renderer', file))) !== hash)
    throw new Error(`Frozen renderer source changed: ${file}`);
}
const files = {};
for (const [entry, output] of [['src/frontend-entry.js', 'dist/frontend/_worker.js'], ['src/backend.js', 'dist/backend/worker.js']]) {
  const absolute = path.join(root, output);
  await mkdir(path.dirname(absolute), { recursive: true });
  await build({ entryPoints: [path.join(root, entry)], bundle: true, format: 'esm', platform: 'browser',
    target: 'es2022', outfile: absolute, legalComments: 'none', external: ['cloudflare:workers'],
    define: { __PLL_HERO_PRIORITY__: 'false' } });
  const bytes = await readFile(absolute);
  files[output] = { bytes: bytes.length, sha256: sha(bytes) };
}
for (const [name, content] of Object.entries({ '_routes.json': JSON.stringify({ version: 1, include: ['/*'], exclude: [] }) + '\n',
  'deployment.txt': 'Panama Legal Lab delivery assets.\n' })) {
  const relative = `dist/frontend/${name}`;
  await writeFile(path.join(root, relative), content);
  files[relative] = { bytes: Buffer.byteLength(content), sha256: sha(content) };
}
const report = { release: 'pll-durable-free-20261103-v1', rendererWorkerSha256: provenance.rendererWorkerSha256,
  builtAt: new Date().toISOString(), files };
await writeFile(path.join(root, 'build-manifest.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
