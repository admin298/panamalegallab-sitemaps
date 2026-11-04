import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const readConfig = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const account = '20f76014286629dae916202a43465d8d';
const service = 'pll-renderer-free-20261103';
const binding = { name: 'PLL_RENDERER', class_name: 'PllRenderer', script_name: service };

test('backend registers the actual exported renderer as SQLite in the intended account', async () => {
  const config = await readConfig('backend.wrangler.json');
  const source = await readFile(new URL('../src/backend.js', import.meta.url), 'utf8');
  assert.equal(config.account_id, account);
  assert.equal(config.name, service);
  assert.match(source, /export class PllRenderer\b/);
  assert.deepEqual(config.exports, { PllRenderer: { type: 'durable-object', storage: 'sqlite' } });
  assert.equal(config.migrations, undefined);
  assert.equal(config.durable_objects, undefined);
});

test('backend deploys the existing build artifact with real version metadata and no public entry', async () => {
  const config = await readConfig('backend.wrangler.json');
  assert.equal(config.main, '../dist/backend/worker.js');
  assert.ok((await stat(new URL(config.main, new URL('.', import.meta.url)))).isFile());
  assert.equal(config.no_bundle, true);
  assert.deepEqual(config.version_metadata, { binding: 'CF_VERSION_METADATA' });
  assert.equal(config.compatibility_date, '2026-07-30');
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(config.routes, undefined);
  assert.equal(config.triggers, undefined);
  assert.equal(config.limits, undefined);
  assert.equal(config.observability, undefined);
});

test('Pages binds the fixed external namespace explicitly in preview and production', async () => {
  const config = await readConfig('pages.wrangler.json');
  const frontend = await readFile(new URL('../src/frontend.js', import.meta.url), 'utf8');
  assert.equal(config.account_id, account);
  assert.equal(config.name, 'pll-seo-preview-20261102');
  assert.equal(config.pages_build_output_dir, '../dist/frontend');
  assert.match(frontend, /OBJECT_NAME = 'pll-renderer-v1'/);
  assert.match(frontend, /env\.PLL_RENDERER/);
  for (const environment of [config, config.env.preview, config.env.production]) {
    assert.deepEqual(environment.durable_objects, { bindings: [binding] });
  }
  assert.equal(config.exports, undefined);
  assert.equal(config.migrations, undefined);
});

test('deployment configurations have no unrelated resource or credentials configuration', async () => {
  for (const name of ['backend.wrangler.json', 'pages.wrangler.json']) {
    const config = await readConfig(name);
    assert.equal(config.send_metrics, false);
    for (const key of ['kv_namespaces', 'r2_buckets', 'd1_databases', 'queues', 'ai',
      'secrets_store_secrets', 'containers', 'assets', 'services', 'unsafe']) {
      assert.equal(config[key], undefined, `${name} must not configure ${key}`);
    }
    assert.deepEqual(config.vars,name==='backend.wrangler.json'?{PLL_IMAGE_FORMAT:'off',PLL_CSS_STATIC:'off'}:undefined);
    assert.doesNotMatch(JSON.stringify(config), /api[_-]?(?:token|key)|oauth|refresh_token/i);
  }
});
