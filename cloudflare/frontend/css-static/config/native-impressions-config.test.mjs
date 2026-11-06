import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { impressionCacheRevision, IMPRESSION_VIEW_SCRIPTS } from '../src/native-impressions.js';

const read = name => readFile(new URL('../' + name, import.meta.url));
test('native impression deployment modes only add one explicit variable to the existing backend configuration', async () => {
  const base = JSON.parse(await read('config/backend.all.wrangler.json'));
  for (const mode of ['off', 'preview', 'all']) {
    const candidate = JSON.parse(await read('config/backend.impressions-' + mode + '.wrangler.json'));
    assert.deepEqual(candidate, { ...base, vars: { ...base.vars, PLL_NATIVE_IMPRESSIONS: mode } });
    for (const field of ['migrations', 'durable_objects', 'routes', 'triggers', 'limits', 'kv_namespaces', 'r2_buckets', 'd1_databases'])
      assert.equal(candidate[field], undefined, field);
  }
});

test('new release explicitly records the exact four script gates and mode-specific cache identities', async () => {
  const manifest = JSON.parse(await read('build-manifest.json'));
  assert.equal(manifest.release, 'pll-compatibility-recovery-20261106-v1');
  assert.deepEqual(manifest.impressions.viewScriptUrls, IMPRESSION_VIEW_SCRIPTS);
  assert.equal(manifest.impressions.modeVariable, 'PLL_NATIVE_IMPRESSIONS');
  assert.deepEqual(manifest.htmlCache.revisionsByImpressionMode,
    Object.fromEntries(['off', 'preview', 'all'].map(mode => [mode, impressionCacheRevision(mode)])));
  assert.equal(manifest.htmlCache.recurringJobs, 0);
  assert.equal(manifest.htmlCache.addedBindings, 0);
  assert.equal(manifest.htmlCache.newPaidResources, 0);
  const frontend = await read('dist/frontend/_worker.js');
  assert.equal(createHash('sha256').update(frontend).digest('hex'),
    '3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9');
});
