import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));

test('documented default build produces both current profiles from a clean source copy', async () => {
  const temporary = await mkdtemp(path.join(root, '.build-repro-'));
  try {
    for (const item of ['src', 'vendor', 'data', 'build.mjs', 'package.json', 'frozen-core-manifest.json', 'search-derivation.json']) {
      await cp(path.join(root, item), path.join(temporary, item), { recursive: true });
    }
    const result = spawnSync(process.execPath, ['build.mjs'], { cwd: temporary, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const [full, geometry] = await Promise.all(['dist', 'dist-geometry'].map(async folder => {
      const contents = await readFile(path.join(temporary, folder, '_worker.js'), 'utf8');
      assert.deepEqual(JSON.parse(await readFile(path.join(temporary, folder, '_routes.json'), 'utf8')),
        { version: 1, include: ['/*'], exclude: [] });
      assert.equal(await readFile(path.join(temporary, folder, 'deployment.txt'), 'utf8'), 'Panama Legal Lab delivery assets.\n');
      return contents;
    }));
    assert.notEqual(full, geometry, 'control and full must be distinct build profiles');
    assert.equal(full, await readFile(path.join(root, 'dist/_worker.js'), 'utf8'), 'fresh build matches sealed full bytes');
    assert.equal(geometry, await readFile(path.join(root, 'dist-geometry/_worker.js'), 'utf8'), 'fresh build matches sealed geometry bytes');
  } finally {
    // Never recursively remove a path outside this test's unique workspace child.
    assert.equal(path.dirname(temporary), path.resolve(root));
    assert.ok(path.basename(temporary).startsWith('.build-repro-'));
    await rm(temporary, { recursive: true });
  }
});
