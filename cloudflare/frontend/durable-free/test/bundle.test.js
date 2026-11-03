import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the Pages bundle excludes the renderer, route data, and source parsing', async () => {
  const thin = await readFile(new URL('../dist/frontend/_worker.js', import.meta.url), 'utf8');
  assert.ok(Buffer.byteLength(thin) < 10_000);
  for (const prohibited of ['HTMLRewriter', 'readiness', 'rewriteValidatedDocument', 'panamlegallab-en', 'JSON.parse'])
    assert.equal(thin.includes(prohibited), false, prohibited);
  const backend = await readFile(new URL('../dist/backend/worker.js', import.meta.url), 'utf8');
  assert.ok(backend.includes('PllRenderer')); assert.ok(backend.includes('rewriteValidatedDocument'));
  assert.ok(backend.includes('cloudflare:workers'));
});
