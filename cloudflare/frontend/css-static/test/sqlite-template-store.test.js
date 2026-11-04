import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { createSqliteTemplateStore, SQLITE_TEMPLATE_SLOTS, SQLITE_TEMPLATE_BODY_LIMIT,
  SQLITE_TEMPLATE_HEADERS_LIMIT } from '../src/sqlite-template-store.js';

const baseTime = 1_800_000_000_000;
const key = (suffix = '', language = 'es', revision = 'pll-html-memory-v1') =>
  `https://${language === 'es' ? 'www' : language}.panamalegallab.com/_pll-internal-cache/${revision}/${language}/${encodeURIComponent('/' + suffix)}`;
const entry = (text = 'Panamá 😀', createdAt = baseTime) => ({ bytes: new TextEncoder().encode(text),
  headers: [['content-type', 'text/html; charset=utf-8'], ['cache-control', 'no-store'], ['x-keep', 'exact']],
  createdAt, expiresAt: createdAt + 300_000 });

class LocalSql {
  constructor() { this.db = new DatabaseSync(':memory:'); this.calls = []; }
  exec(statement, ...values) {
    this.calls.push({ statement, values });
    if (/^CREATE TABLE/iu.test(statement)) { this.db.exec(statement); return { toArray: () => [] }; }
    const bindings = values.map(value => value instanceof ArrayBuffer ? new Uint8Array(value) : value);
    const rows = this.db.prepare(statement).all(...bindings);
    return { toArray: () => rows };
  }
  count(prefix) { return this.calls.filter(row => row.statement.startsWith(prefix)).length; }
}

function harness(t, options = {}) {
  const sql = new LocalSql(); t.after(() => sql.db.close());
  return { sql, store: createSqliteTemplateStore(sql, { now: () => baseTime, ...options }) };
}

test('one lazy DDL, one bound SELECT per get and one UPSERT per put preserve exact owned data', async t => {
  const { sql, store } = harness(t);
  assert.equal(sql.calls.length, 0);
  assert.equal(await store.get(key()), null);
  const original = entry(); await store.put(key(), original);
  original.bytes.fill(0); original.headers[2][1] = 'changed';
  const first = await store.get(key());
  assert.deepEqual([...first.bytes], [...entry().bytes]); assert.deepEqual(first.headers, entry().headers);
  assert.equal(first.createdAt, baseTime); assert.equal(first.expiresAt, baseTime + 300_000);
  first.bytes.fill(1);
  assert.deepEqual([...(await store.get(key())).bytes], [...entry().bytes]);
  assert.equal(sql.count('CREATE TABLE'), 1); assert.equal(sql.count('SELECT'), 3); assert.equal(sql.count('INSERT'), 1);
  assert.equal(sql.calls.some(row => /DELETE|DROP|ALTER|PRAGMA/iu.test(row.statement)), false);
  for (const call of sql.calls.filter(row => !row.statement.startsWith('CREATE')))
    assert.equal(call.statement.includes(key()), false, 'data stays in parameter bindings');
  assert.equal(store.snapshot().state, 'ready');
});

test('a new logical adapter uses the existing row; expiry is lazy without HIT or cleanup writes', async t => {
  let now = baseTime; const { sql, store } = harness(t, { now: () => now });
  await store.put(key(), entry());
  const next = createSqliteTemplateStore(sql, { now: () => now });
  assert.ok(await next.get(key())); assert.equal(sql.count('CREATE TABLE'), 2);
  assert.equal(sql.count('INSERT'), 1);
  now += 300_000;
  assert.equal(await next.get(key()), null);
  assert.equal(sql.count('INSERT'), 1); assert.equal(sql.calls.some(row => row.statement.startsWith('DELETE')), false);
});

test('32 fixed slots allow safe collisions and never return a different key or revision', async t => {
  const { sql, store } = harness(t); const slots = new Map(); let collision;
  for (let index = 0; index <= SQLITE_TEMPLATE_SLOTS; index++) {
    const requested = key('probe-' + index); await store.put(requested, entry(String(index)));
    const last = sql.calls.at(-1), slot = last.values[0];
    assert.ok(Number.isInteger(slot) && slot >= 0 && slot < 32);
    if (slots.has(slot)) { collision = [slots.get(slot), requested]; break; }
    slots.set(slot, requested);
  }
  assert.ok(collision); assert.equal(await store.get(collision[0]), null); assert.ok(await store.get(collision[1]));
  assert.equal(await store.get(key('probe-0', 'es', 'another-release')), null);
  assert.ok(sql.db.prepare('SELECT COUNT(*) AS count FROM pll_html_templates_v1').get().count <= 32);
});

test('SQL parameters handle apostrophes, input byte views and older same-key producers safely', async t => {
  const { sql, store } = harness(t); const requested = key("x'); DROP TABLE anything;--");
  const body = new Uint8Array([90, 65, 0, 255, 66, 90]);
  await store.put(requested, { ...entry(), bytes: body.subarray(1, 5) });
  assert.deepEqual([...(await store.get(requested)).bytes], [65, 0, 255, 66]);
  await store.put(requested, entry('older', baseTime - 1));
  assert.deepEqual([...(await store.get(requested)).bytes], [65, 0, 255, 66]);
  assert.equal(sql.calls.at(-1).statement.includes('DROP TABLE anything'), false);
});

test('entry and key limits reject before any database work', async t => {
  const { sql, store } = harness(t);
  for (const requested of ['', 'http://www.panamalegallab.com/', 'https://evil.invalid/_pll-internal-cache/v/es/%2F',
    key() + '?private=1', key() + '#fragment', key().replace('/es/', '/en/'), key('x'.repeat(9000))]) {
    assert.equal(await store.get(requested), null); await store.put(requested, entry());
  }
  for (const changed of [null, { ...entry(), bytes: new Uint8Array() },
    { ...entry(), bytes: new Uint8Array(SQLITE_TEMPLATE_BODY_LIMIT + 1) }, { ...entry(), bytes: 'text' },
    { ...entry(), createdAt: baseTime + 1 }, { ...entry(), createdAt: -1 },
    { ...entry(), expiresAt: baseTime }, { ...entry(), expiresAt: baseTime + 300001 },
    { ...entry(), expiresAt: NaN }, { ...entry(), headers: [['bad name', 'x']] },
    { ...entry(), headers: [['x-test', 'a\r\nb']] }, { ...entry(), headers: [['x-test', '\u0080']] },
    { ...entry(), headers: [['x-test', 'x'.repeat(SQLITE_TEMPLATE_HEADERS_LIMIT)]] },
    { ...entry(), headers: [['x-test', 'x'.repeat(SQLITE_TEMPLATE_HEADERS_LIMIT + 1)]] },
    { ...entry(), headers: [['x-test', 'x'], ['X-Test', 'duplicate']] },
    { ...entry(), headers: Array.from({ length: 129 }, (_, index) => ['x-' + index, 'v']) },
    { ...entry(), headers: [['x-test', 1]] }, { ...entry(), headers: [['x-test']] }]) await store.put(key(), changed);
  assert.equal(sql.calls.length, 0);
});

test('unavailable SQL, DDL, read and write failures disable the instance without retries or private errors', async () => {
  for (const sql of [undefined, {}, { get exec() { throw Error('private-session'); } }]) {
    const store = createSqliteTemplateStore(sql, { now: () => baseTime });
    assert.equal(await store.get(key()), null); await store.put(key(), entry());
    assert.equal(store.snapshot().state, 'disabled');
    assert.equal(JSON.stringify(store.snapshot()).includes('private-session'), false);
  }
  for (const phase of ['CREATE', 'SELECT', 'INSERT']) {
    let calls = 0;
    const store = createSqliteTemplateStore({ exec(statement) {
      calls++; if (statement.startsWith(phase)) throw Error('private-query');
      return { toArray: () => [] };
    } }, { now: () => baseTime });
    if (phase === 'INSERT') await store.put(key(), entry()); else await store.get(key());
    const failedAt = calls; assert.equal(store.snapshot().state, 'disabled');
    assert.equal(await store.get(key()), null); await store.put(key(), entry()); assert.equal(calls, failedAt);
  }
});

test('corrupt persisted rows safely miss without deleting or rewriting them', async () => {
  for (const row of [null, { cache_key: 'other' },
    { cache_key: key(), body: new ArrayBuffer(0), headers: '[]', created_at: baseTime, expires_at: baseTime + 300000 },
    { cache_key: key(), body: new Uint8Array([1]).buffer, headers: '{', created_at: baseTime, expires_at: baseTime + 300000 },
    { cache_key: key(), body: new Uint8Array([1]).buffer, headers: '[]', created_at: baseTime + 1, expires_at: baseTime + 300001 }]) {
    const statements = [];
    const store = createSqliteTemplateStore({ exec(statement) {
      statements.push(statement); return { toArray: () => row ? [row] : [] };
    } }, { now: () => baseTime });
    assert.equal(await store.get(key()), null);
    assert.equal(statements.filter(value => value.startsWith('SELECT')).length, 1);
    assert.equal(statements.some(value => /DELETE|INSERT/iu.test(value)), false);
  }
});

test('invalid clocks or malformed cursors fail closed and remain bounded', async t => {
  for (const now of [() => NaN, () => -1, () => { throw Error('clock'); }, 1]) {
    const { sql, store } = harness(t, { now });
    assert.equal(await store.get(key()), null); await store.put(key(), entry()); assert.equal(sql.calls.length, 0);
  }
  let calls = 0;
  const store = createSqliteTemplateStore({ exec(statement) { calls++; return statement.startsWith('CREATE') ? {} : {}; } },
    { now: () => baseTime });
  assert.equal(await store.get(key()), null); assert.equal(store.snapshot().state, 'disabled');
  const before = calls; assert.equal(await store.get(key()), null); assert.equal(calls, before);
});

async function nativeBundle() {
  const bundled = await build({ stdin: { contents: `
    import {DurableObject} from 'cloudflare:workers';
    import {createSqliteTemplateStore} from './src/sqlite-template-store.js';
    export class FixtureStore extends DurableObject {
      constructor(ctx,env){super(ctx,env);this.counts={ddl:0,reads:0,writes:0};
        this.store=createSqliteTemplateStore({exec:(query,...args)=>{
          if(query.startsWith('CREATE'))this.counts.ddl++;
          if(query.startsWith('SELECT'))this.counts.reads++;
          if(query.startsWith('INSERT'))this.counts.writes++;
          return ctx.storage.sql.exec(query,...args);
        }},{now:()=>${baseTime}});}
      async fetch(request){const input=await request.json();let value=null;
        if(input.op==='put')await this.store.put(input.key,{...input.entry,bytes:new Uint8Array(input.entry.bytes)});
        if(input.op==='get'){const entry=await this.store.get(input.key);
          value=entry?{...entry,bytes:Array.from(entry.bytes)}:null;}
        return Response.json({value,counts:this.counts,state:this.store.snapshot()});}
    }
    export default {fetch(request,env){return env.SQL_CACHE.get(env.SQL_CACHE.idFromName('fixed')).fetch(request);}};
    `, resolveDir: fileURLToPath(new URL('../', import.meta.url)), sourcefile: 'sqlite-template-native.js' },
  bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', external: ['cloudflare:workers'] });
  return bundled.outputFiles[0].text;
}

test('native SQLite backing survives full simulator restart with no per-HIT writes or external requests', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'pll-sql-cache-')); const script = await nativeBundle();
  const options = { modules: true, script, compatibilityDate: '2026-07-30',
    durableObjects: { SQL_CACHE: { className: 'FixtureStore', useSQLite: true } }, durableObjectsPersist: folder,
    outboundService() { assert.fail('External requests are forbidden.'); } };
  let runtime;
  const dispatch = async input => {
    const response = await runtime.dispatchFetch('https://fixture.invalid/', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    assert.equal(response.status, 200); return response.json();
  };
  try {
    runtime = new Miniflare(options);
    const original = entry(); original.bytes = [65, 0, 255, 66];
    const stored = await dispatch({ op: 'put', key: key(), entry: original });
    assert.deepEqual(stored.counts, { ddl: 1, reads: 0, writes: 1 });
    await runtime.dispose(); runtime = null;
    runtime = new Miniflare(options);
    for (let index = 0; index < 2; index++) {
      const loaded = await dispatch({ op: 'get', key: key() });
      assert.deepEqual(loaded.value, original);
      assert.deepEqual(loaded.counts, { ddl: 1, reads: index + 1, writes: 0 });
    }
    const missing = await dispatch({ op: 'get', key: key('', 'fr') });
    assert.equal(missing.value, null); assert.equal(missing.counts.writes, 0);
  } finally {
    if (runtime) await runtime.dispose();
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(tmpdir()));
    assert.ok(path.basename(folder).startsWith('pll-sql-cache-'));
    await rm(folder, { recursive: true, force: true });
  }
});
