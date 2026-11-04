import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readConfig = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
// The public package omits a workstation-specific editor schema; deployment fields remain exact.
const withoutEditorSchema = ({ $schema, ...deployment }) => deployment;
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
    assert.deepEqual(withoutEditorSchema(await readConfig(name)), withoutEditorSchema({
      ...backend, vars: { PLL_IMAGE_FORMAT: image, PLL_CSS_STATIC: css },
    }));
  });
}

test('Pages preserves all existing bindings and account metadata without a new resource', async () => {
  const binding = {
    name: 'PLL_RENDERER', class_name: 'PllRenderer', script_name: backend.name,
  };
  const durableObjects = { bindings: [binding] };
  assert.deepEqual(withoutEditorSchema(await readConfig('pages.wrangler.json')), withoutEditorSchema({
    $schema: backend.$schema,
    name: 'pll-seo-preview-20261102',
    account_id: backend.account_id,
    pages_build_output_dir: '../dist/frontend',
    compatibility_date: backend.compatibility_date,
    send_metrics: false,
    durable_objects: durableObjects,
    env: { preview: { durable_objects: durableObjects }, production: { durable_objects: durableObjects } },
  }));
});

test('portable comparison ignores only top-level editor metadata without changing inputs', () => {
  const original = Object.freeze({ $schema: 'editor-only.json', vars: Object.freeze({ PLL_CSS_STATIC: 'off' }) });
  const portable = Object.freeze({ vars: original.vars });
  assert.deepEqual(withoutEditorSchema(original), withoutEditorSchema(portable));
  assert.equal(original.$schema, 'editor-only.json');
  assert.equal(withoutEditorSchema(original).vars, original.vars);
});

test('portable comparison still rejects runtime and nested metadata differences', () => {
  const original = { $schema: 'editor-only.json', account_id: backend.account_id,
    vars: { PLL_CSS_STATIC: 'off', $schema: 'nested-runtime-value' } };
  for (const changed of [
    { ...original, account_id: 'different-account' },
    { ...original, vars: { ...original.vars, PLL_CSS_STATIC: 'all' } },
    { ...original, vars: { ...original.vars, $schema: 'different-nested-value' } },
  ]) {
    assert.throws(() => assert.deepEqual(withoutEditorSchema(changed), withoutEditorSchema(original)),
      { name: 'AssertionError' });
  }
});
