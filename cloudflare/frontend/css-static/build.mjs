import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CSS_ASSET_PATH, CSS_NATIVE_URL } from './src/css-static.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const cssName=CSS_ASSET_PATH.split('/').at(-1);
const cssBytes=await readFile(path.join(root,'assets',cssName));
const cssHash='7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61';
if(cssBytes.length!==1_954_605||sha(cssBytes)!==cssHash)throw new Error('Exact captured CSS bytes changed.');
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
for (const [name, content] of Object.entries({ '_routes.json': JSON.stringify({ version: 1, include: ['/*'], exclude: [CSS_ASSET_PATH] }) + '\n',
  '_headers': `${CSS_ASSET_PATH}\n  Content-Type: text/css; charset=UTF-8\n  Cache-Control: public, max-age=31536000, immutable\n`,
  'deployment.txt': 'Panama Legal Lab delivery assets.\n' })) {
  const relative = `dist/frontend/${name}`;
  await writeFile(path.join(root, relative), content);
  files[relative] = { bytes: Buffer.byteLength(content), sha256: sha(content) };
}
const cssRelative='dist/frontend'+CSS_ASSET_PATH;
await mkdir(path.dirname(path.join(root,cssRelative)),{recursive:true});
await writeFile(path.join(root,cssRelative),cssBytes);
files[cssRelative]={bytes:cssBytes.length,sha256:cssHash};
if(files['dist/frontend/_worker.js'].sha256!=='3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9')throw new Error('Thin frontend identity changed.');
const report = { release: 'pll-css-static-exact-20261104-v1', rendererWorkerSha256: provenance.rendererWorkerSha256,
  css:{originalUri:CSS_NATIVE_URL,path:CSS_ASSET_PATH,sha256:cssHash,bytes:cssBytes.length,transformations:'none',
    provenance:'Exact decoded public Google gstatic version-pinned stylesheet, captured 2026-11-04T14:13:06Z. Original copyright and any applicable Google terms remain with their respective holders; no ownership or separate open-source license is asserted.'},
  builtAt: new Date().toISOString(), files };
await writeFile(path.join(root, 'build-manifest.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
