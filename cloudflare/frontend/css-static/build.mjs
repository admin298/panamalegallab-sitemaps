import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CSS_ASSET_PATH, CSS_NATIVE_URL, CSS_CONTRACTS } from './src/css-static.js';
import { IMPRESSION_VIEW_SCRIPTS, CURRENT_IMPRESSION_VIEW_SCRIPTS, impressionCacheRevision } from './src/native-impressions.js';
import { INVALID_FONT_URL, initialRenderCacheRevision } from './src/initial-render.js';
import { RENDERER_SHA256, RELEASE_ID } from './src/boundary.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const cacheMode = process.env.PLL_HTML_CACHE_MODE ?? 'off';
if (cacheMode !== 'off') throw new Error('Recovery build requires PLL_HTML_CACHE_MODE=off.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const provenance = JSON.parse(await readFile(path.join(root, 'renderer-source-provenance.json'), 'utf8'));
const impressionContract = JSON.parse(await readFile(path.join(root, 'impression-contract-provenance.json'), 'utf8'));
const legacyRenderer = '58a76f2dd366fb20b03ebb9db9f0dd401df51ef10186959a96d844285c38e509';
if (provenance.legacyRendererWorkerSha256 !== legacyRenderer
  || sha(await readFile(path.join(root, 'renderer/reference-worker-58.js'))) !== legacyRenderer)
  throw new Error('Historical renderer reference changed.');
for (const [file, hash] of Object.entries(provenance.files)) {
  if (sha(await readFile(path.join(root, 'renderer', file))) !== hash)
    throw new Error(`Reviewed renderer source changed: ${file}`);
}
for (const [file, hash] of Object.entries(provenance.legacySourceFiles)) {
  if (!['src/config-query.js', 'src/html.js'].includes(file) && provenance.files[file] !== hash)
    throw new Error(`Unchanged renderer source changed: ${file}`);
}
const reference = await build({ absWorkingDir: path.join(root, 'renderer'), entryPoints: ['src/entry.js'],
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', legalComments: 'none', write: false,
  define: { __PLL_HERO_PRIORITY__: 'false' } });
if (sha(reference.outputFiles[0].contents) !== provenance.rendererWorkerSha256
  || provenance.rendererWorkerSha256 !== RENDERER_SHA256 || RENDERER_SHA256 === legacyRenderer)
  throw new Error('Current renderer reference/marker mismatch.');
for (const [urls, hashes, expected] of [
  [impressionContract.viewScriptUrls, impressionContract.viewScriptSha256, IMPRESSION_VIEW_SCRIPTS],
  [impressionContract.currentViewScriptUrls, impressionContract.currentViewScriptSha256, CURRENT_IMPRESSION_VIEW_SCRIPTS],
]) {
  if (JSON.stringify(urls) !== JSON.stringify(expected) || Object.keys(hashes).length !== 4
    || Object.values(hashes).some(hash => !/^[a-f0-9]{64}$/u.test(hash)))
    throw new Error('Reviewed native impression script gates changed.');
}
const cssAssets = [];
for (const contract of CSS_CONTRACTS) {
  if (contract.assetPath !== `/_pll-assets/sites-${contract.sha256}.css`)
    throw new Error('Unsupported static CSS destination.');
  const bytes = await readFile(path.join(root, 'assets', path.basename(contract.assetPath)));
  if (bytes.length !== contract.bytes || sha(bytes) !== contract.sha256)
    throw new Error(`Exact captured CSS bytes changed: ${contract.id}`);
  cssAssets.push({ contract, bytes });
}
const files = {};
for (const [entry, output] of [['src/frontend-entry.js', 'dist/frontend/_worker.js'], ['src/backend.js', 'dist/backend/worker.js']]) {
  const absolute = path.join(root, output);
  await mkdir(path.dirname(absolute), { recursive: true });
  await build({ absWorkingDir: root, entryPoints: [entry], bundle: true, format: 'esm', platform: 'browser',
    target: 'es2022', outfile: absolute, legalComments: 'none', external: ['cloudflare:workers'],
    define: { __PLL_HERO_PRIORITY__: 'false', __PLL_HTML_CACHE_MODE__: JSON.stringify(cacheMode) } });
  const bytes = await readFile(absolute);
  files[output] = { bytes: bytes.length, sha256: sha(bytes) };
}
const headers = CSS_CONTRACTS.map(row => `${row.assetPath}\n  Content-Type: text/css; charset=UTF-8\n  Cache-Control: public, max-age=31536000, immutable\n`).join('');
for (const [name, content] of Object.entries({
  '_routes.json': JSON.stringify({ version: 1, include: ['/*'], exclude: CSS_CONTRACTS.map(row => row.assetPath) }) + '\n',
  '_headers': headers, 'deployment.txt': 'Panama Legal Lab delivery assets.\n',
})) {
  const relative = `dist/frontend/${name}`;
  await writeFile(path.join(root, relative), content);
  files[relative] = { bytes: Buffer.byteLength(content), sha256: sha(content) };
}
for (const { contract, bytes } of cssAssets) {
  const relative = 'dist/frontend' + contract.assetPath;
  await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  await writeFile(path.join(root, relative), bytes);
  files[relative] = { bytes: bytes.length, sha256: contract.sha256 };
}
if (files['dist/frontend/_worker.js'].sha256 !== '72d46465485f1b00ecab178a57ab9db03403ba37371011840183afa241a2f953')
  throw new Error('Thin frontend identity changed.');
const legacyCss = CSS_CONTRACTS.find(row => row.assetPath === CSS_ASSET_PATH);
const report = { release: RELEASE_ID, rendererWorkerSha256: RENDERER_SHA256,
  legacyRendererWorkerSha256: legacyRenderer, rendererSourceFiles: Object.keys(provenance.files).length,
  rendererReferenceBytes: reference.outputFiles[0].contents.length,
  frontend: { mobileSignal: { header: 'X-PLL-Mobile', values: ['0', '1'],
    clientHint: 'Sec-CH-UA-Mobile ?0/?1 preferred; otherwise bounded User-Agent phone token',
    maximumUserAgentCharacters: 512, forwardsRawUserAgent: false, forwardsRawClientHint: false,
    overwritesIncomingSignal: true } },
  heroWidth: { modeVariable: 'PLL_HERO_WIDTH', defaultMode: 'off', modes: ['off','preview','all'],
    width: 1280, mobileOnly: true, matchingUrlSpans: 2, addedClientScripts: 0, extraFetches: 0,
    previewOrigin: 'https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev',
    previewControlParameter: '_pll_hero_width', previewControlValue: 'control', previewCandidateValue: 'candidate',
    publicQueryOverride: false, eligibleMethods: ['GET'], knownPreferredPages: 252,
    mutation: 'Only matching raw CSS and native escaped const imageUrl widths change from16383 to1280; same signed image base, native script logic, crop and other bytes.',
    mobileSignal: 'Normalized X-PLL-Mobile=1 required; desktop is unchanged by this policy.',
    parser: 'Existing native inspector and raw-text spans; no additional HTML parser or serialization.',
    unsupportedShape: 'Original document unchanged by this policy; no-photo headers are valid noops.',
    storage: 'None; HTML reuse remains compiled OFF.' },
  htmlCache: { placement: 'durable-object', mode: cacheMode, activeReuse: false, certificateVersion: 2,
    revision: impressionCacheRevision('off'),
    revisionsByImpressionMode: Object.fromEntries(['off','preview','all'].map(mode => [mode, impressionCacheRevision(mode)])),
    revisionsByPolicyMode: Object.fromEntries(['off','preview','all'].map(impressions => [impressions,
      Object.fromEntries(['off','preview','all'].map(initial => [initial, initialRenderCacheRevision(impressionCacheRevision(impressions), initial)]))])),
    maximumAgeSeconds: 300, maximumEntries: 32, maximumMemoryBytes: 8_388_608, persistentSlots: 32, maximumConcurrentFills: 1,
    perVisitPagesExecutions: 1, perVisitDurableObjectCalls: 1, perVisitOriginCalls: 1, perHitOriginCalls: 0,
    recurringJobs: 0, addedBindings: 0, newPaidResources: 0 },
  initialRender: { modeVariable: 'PLL_INITIAL_RENDER', modes: ['off','preview','all'], removedUrl: INVALID_FONT_URL,
    previewControlParameter: '_pll_initial_render', previewControlValue: 'control', previewCandidateValue: 'candidate',
    shape: 'Exact invalid-font removal; recognized Apps Script iframe native lazy loading; recognized homepage overlay ratio reservation.',
    frame: 'Same URL, sandbox, permissions and dimensions; native loading lazy only.',
    overlay: 'Recognized homepage widgets retain intrinsic fallback with aspect-ratio auto 1168 / 854.',
    parser: 'Existing native inspector and raw-text spans; no extra parse or upstream fetch.',
    styling: 'Font-family, fallback stacks and valid font stylesheets remain unchanged.' },
  impressions: { modeVariable: 'PLL_NATIVE_IMPRESSIONS', modes: ['off','preview','all'],
    previewOrigin: 'https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev',
    previewControlParameter: '_pll_native_impressions', previewControlValue: 'control', previewCandidateValue: 'candidate',
    viewScriptUrls: IMPRESSION_VIEW_SCRIPTS, viewScriptSha256: impressionContract.viewScriptSha256,
    currentViewScriptUrls: CURRENT_IMPRESSION_VIEW_SCRIPTS, currentViewScriptSha256: impressionContract.currentViewScriptSha256,
    nativeField: 357, arrayIndex: 356, recognizedArrayLength: 518, currentRecognizedArrayLength: 519, changedValue: true,
    mutation: 'Exact recognized native configuration token only; docs-liap, GA4 and unrelated bytes preserved.',
    unsupportedShape: 'Original document unchanged by this policy; no endpoint acknowledgement or relay.',
    parser: 'Shared native inspector and raw-text spans; one native parse and no extra upstream fetch.' },
  css: { originalUri: CSS_NATIVE_URL, path: CSS_ASSET_PATH, sha256: legacyCss.sha256, bytes: legacyCss.bytes,
    transformations: 'none', provenance: 'Exact public version-pinned Google CSS. Original copyright and applicable terms remain with their holders; no separate license asserted.' },
  cssVersions: CSS_CONTRACTS, builtAt: new Date().toISOString(), files };
await writeFile(path.join(root, 'build-manifest.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
