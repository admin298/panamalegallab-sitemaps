import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const read = name => readFile(new URL('../' + name, import.meta.url));
const json = async name => JSON.parse(await read(name));
const FRONTEND = '72d46465485f1b00ecab178a57ab9db03403ba37371011840183afa241a2f953';
const RENDERER = 'ab2390e634808742a87beddd19bce908eef3d7ac5ea5375dc709d99a7e546a07';

test('hero width configs add only one explicit mode to the accepted free-plan resource config', async () => {
  const base = await json('config/backend.initial-render-all.wrangler.json');
  for (const mode of ['preview', 'all']) {
    const config = await json('config/backend.hero-width-' + mode + '.wrangler.json');
    assert.deepEqual(config, { ...base, vars: { ...base.vars, PLL_HERO_WIDTH: mode } });
    assert.deepEqual(config.vars, { PLL_IMAGE_FORMAT: 'all', PLL_CSS_STATIC: 'all',
      PLL_NATIVE_IMPRESSIONS: 'all', PLL_INITIAL_RENDER: 'all', PLL_HERO_WIDTH: mode });
    for (const field of ['migrations', 'durable_objects', 'routes', 'triggers', 'limits', 'kv_namespaces', 'r2_buckets', 'd1_databases'])
      assert.equal(config[field], undefined, field);
  }
  assert.equal(base.vars.PLL_HERO_WIDTH, undefined);
  assert.deepEqual(await json('config/backend.cache-off.wrangler.json'), base);
});

test('manifest records mobile-only dual-reference width cap, default off and no added runtime work', async () => {
  const manifest = await json('build-manifest.json');
  assert.equal(manifest.release, 'pll-hero-width-mobile-20261106-v1');
  assert.equal(manifest.heroWidth.modeVariable, 'PLL_HERO_WIDTH');
  assert.equal(manifest.heroWidth.defaultMode, 'off');
  assert.deepEqual(manifest.heroWidth.modes, ['off', 'preview', 'all']);
  assert.equal(manifest.heroWidth.width, 1280);
  assert.equal(manifest.heroWidth.mobileOnly, true);
  assert.equal(manifest.heroWidth.matchingUrlSpans, 2);
  assert.equal(manifest.heroWidth.addedClientScripts, 0);
  assert.equal(manifest.heroWidth.extraFetches, 0);
  assert.equal(manifest.heroWidth.previewControlParameter, '_pll_hero_width');
  assert.equal(manifest.heroWidth.previewControlValue, 'control');
  assert.equal(manifest.heroWidth.previewCandidateValue, 'candidate');
  assert.equal(manifest.htmlCache.mode, 'off');
  assert.equal(manifest.htmlCache.activeReuse, false);
  for (const field of ['addedBindings', 'newPaidResources', 'recurringJobs']) assert.equal(manifest.htmlCache[field], 0);
  assert.equal(manifest.rendererWorkerSha256, RENDERER);
});

test('frontend manifest exposes only normalized mobile signal and pins its new exact bundle', async () => {
  const manifest = await json('build-manifest.json');
  assert.deepEqual(manifest.frontend.mobileSignal, { header: 'X-PLL-Mobile', values: ['0', '1'],
    clientHint: 'Sec-CH-UA-Mobile ?0/?1 preferred; otherwise bounded User-Agent phone token',
    maximumUserAgentCharacters: 512, forwardsRawUserAgent: false, forwardsRawClientHint: false,
    overwritesIncomingSignal: true });
  const frontend = await read('dist/frontend/_worker.js');
  assert.equal(createHash('sha256').update(frontend).digest('hex'), FRONTEND);
  assert.equal(manifest.files['dist/frontend/_worker.js'].sha256, FRONTEND);
});
