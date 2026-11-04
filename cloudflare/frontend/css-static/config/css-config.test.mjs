import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readConfig = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const backend = {
  $schema: '../../tooling/node_modules/wrangler/config-schema.json',
  name: 'pll-renderer-free-20261103',
  account_id: '20f76014286629dae916202a43465d8d',
  main: '../dist/backend/worker.js',
  compatibility_date: '2026-07-30',
  no_bundle: true,
  workers_dev: false,
  preview_urls: false,
  send_metrics: false,
  upload_source_maps: false,
  exports: { PllRenderer: { type: 'durable-object', storage: 'sqlite' } },
  version_metadata: { binding: 'CF_VERSION_METADATA' },
};
const configurations = [
  ['backend.wrangler.json', 'off', 'off'],
  ['backend.off.wrangler.json', 'off', 'off'],
  ['backend.preview.wrangler.json', 'preview', 'preview'],
  ['backend.preview-css.wrangler.json', 'off', 'preview'],
  ['backend.all.wrangler.json', 'all', 'all'],
  ['backend.all-css.wrangler.json', 'off', 'all'],
  ['backend.css-preview-image-all.wrangler.json', 'all', 'preview'],
];

for (const [name, image, css] of configurations) {
  test(`${name} changes only opt-in policy vars on the existing Worker and class`, async () => {
    assert.deepEqual(await readConfig(name), {
      ...backend, vars: { PLL_IMAGE_FORMAT: image, PLL_CSS_STATIC: css },
    });
  });
}

test('Pages preserves all existing bindings and account metadata without a new resource', async () => {
  const binding = {
    name: 'PLL_RENDERER', class_name: 'PllRenderer', script_name: backend.name,
  };
  const durableObjects = { bindings: [binding] };
  assert.deepEqual(await readConfig('pages.wrangler.json'), {
    $schema: backend.$schema,
    name: 'pll-seo-preview-20261102',
    account_id: backend.account_id,
    pages_build_output_dir: '../dist/frontend',
    compatibility_date: backend.compatibility_date,
    send_metrics: false,
    durable_objects: durableObjects,
    env: { preview: { durable_objects: durableObjects }, production: { durable_objects: durableObjects } },
  });
});
