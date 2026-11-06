import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('HTML cache remains behind the exact accepted thin Pages code and finite free budgets', async () => {
  const read = name => readFile(new URL('../' + name, import.meta.url));
  const manifest = JSON.parse(await read('build-manifest.json'));
  assert.equal(manifest.release, 'pll-hero-width-mobile-20261106-v1');
  assert.equal(manifest.htmlCache.placement, 'durable-object');
  assert.ok(['off', 'preview', 'all'].includes(manifest.htmlCache.mode));
  assert.equal(manifest.htmlCache.perVisitDurableObjectCalls, 1);
  assert.equal(manifest.htmlCache.maximumAgeSeconds, 300);
  assert.equal(manifest.htmlCache.maximumMemoryBytes, 8_388_608);
  assert.equal(manifest.htmlCache.maximumEntries, 32);
  assert.equal(manifest.htmlCache.persistentSlots, 32);
  assert.equal(manifest.htmlCache.maximumConcurrentFills, 1);
  const frontend = await read('dist/frontend/_worker.js');
  assert.equal(createHash('sha256').update(frontend).digest('hex'),
    '72d46465485f1b00ecab178a57ab9db03403ba37371011840183afa241a2f953');
  for (const prohibited of ['renewTemplate', 'readTemplateCertificate', 'HTMLRewriter', 'sqlite'])
    assert.equal(frontend.toString().includes(prohibited), false, prohibited);
});
