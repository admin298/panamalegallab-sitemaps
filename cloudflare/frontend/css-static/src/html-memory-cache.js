import { targetForCache, cacheKeyFor } from './cache-routes.js';
import { certifyHtml, readTemplateCertificate, renewTemplate } from './html-template.js';

export const MEMORY_CACHE_MAX_BYTES = 8 * 1024 * 1024;
export const MEMORY_CACHE_MAX_ENTRIES = 32;
export const MEMORY_CAPTURE_DEADLINE_MS = 1000;
export const MEMORY_BODY_LIMIT = 1_048_576;
const STORE_DEADLINE_MS = 100;
const MAX_STORE_OPERATIONS = 8;
const REVISION = 'pll-html-memory-v1';
const CERTIFICATE = 'X-PLL-HTML-Template';
const encoder = new TextEncoder();
const internalHeader = name => /^x-pll-(?:html-)?template/iu.test(name);
const replayHeaders = ['Age', 'CF-Ray', 'CF-Cache-Status', 'Server-Timing', 'Date',
  'X-Cloud-Trace-Context', 'X-Request-ID', 'X-Correlation-ID',
  'X-PLL-HTML-Cache', 'X-PLL-HTML-Cache-Age', 'X-PLL-HTML-Cache-Source'];

function cancel(reader) { try { reader?.cancel().catch(() => {}); } catch { /* Already closed. */ } }
function headersWithoutReplay(input) {
  const headers = new Headers(input);
  for (const name of replayHeaders) headers.delete(name);
  return headers;
}
function outward(response, state, age, source) {
  const headers = new Headers([...response.headers].filter(([name]) => !internalHeader(name)));
  if (state === 'HIT') for (const name of replayHeaders) headers.delete(name);
  if (state === 'MISS' || state === 'HIT') headers.set('Cache-Control', 'no-store');
  headers.set('X-PLL-HTML-Cache', state);
  headers.delete('X-PLL-HTML-Cache-Age'); headers.delete('X-PLL-HTML-Cache-Source');
  if (age !== undefined) headers.set('X-PLL-HTML-Cache-Age', String(age));
  if (source) headers.set('X-PLL-HTML-Cache-Source', source);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function validClock(value, current) {
  return value && Number.isSafeInteger(value.createdAt) && value.createdAt >= 0 && value.createdAt <= current
    && value.expiresAt === value.createdAt + 300000 && value.expiresAt > current;
}
async function capture(response, timing) {
  let reader, timer, stopped = false;
  try {
    reader = response.clone().body.getReader();
    const read = (async () => {
      const buffer = new Uint8Array(MEMORY_BODY_LIMIT); let size = 0, chunks = 0, empty = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) return buffer.slice(0, size);
        if (stopped || !(value instanceof Uint8Array) || ++chunks > 2048 || (!value.byteLength && ++empty > 8)
          || size + value.byteLength > MEMORY_BODY_LIMIT) return null;
        buffer.set(value, size); size += value.byteLength;
      }
    })();
    const deadline = new Promise(resolve => { timer = timing.setTimeout(() => {
      stopped = true; cancel(reader); resolve(null);
    }, MEMORY_CAPTURE_DEADLINE_MS); });
    return await Promise.race([read, deadline]);
  } catch { return null; }
  finally { stopped = true; timing.clearTimeout(timer); cancel(reader); }
}
function copyEntry(value, key) {
  if (typeof key !== 'string' || !key || key.length > 8192
    || !(value?.bytes instanceof Uint8Array) || value.bytes.byteLength < 1 || value.bytes.byteLength > MEMORY_BODY_LIMIT
    || !Array.isArray(value.headers) || value.headers.length > 64) return null;
  if (!value.headers.every(pair => Array.isArray(pair) && pair.length === 2
    && pair.every(item => typeof item === 'string'))) return null;
  const headers = [...headersWithoutReplay(value.headers)].map(pair => Object.freeze(pair));
  const characters = key.length + headers.reduce((sum, pair) => sum + pair[0].length + pair[1].length, 0);
  if (characters > 65536) return null;
  return Object.freeze({ bytes: new Uint8Array(value.bytes), headers: Object.freeze(headers),
    createdAt: value.createdAt, expiresAt: value.expiresAt,
    // Conservative payload accounting includes UTF-16 metadata and fixed entry overhead.
    // Transient response copies and the JavaScript engine's whole heap are separate.
    size: value.bytes.byteLength + 2 * characters + 4096 });
}

export function createHtmlMemoryCache({ mode = 'off', now = Date.now, certify = certifyHtml,
  renew = renewTemplate, readCertificate = readTemplateCertificate, timing = globalThis,
  maxBytes = MEMORY_CACHE_MAX_BYTES, maxEntries = MEMORY_CACHE_MAX_ENTRIES, store, revision = REVISION } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MEMORY_CACHE_MAX_BYTES
    || !Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > MEMORY_CACHE_MAX_ENTRIES)
    throw new RangeError('Cache budgets exceed the fixed limits');
  if(typeof revision!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/u.test(revision))throw new RangeError('Invalid cache identity');
  let entries = new Map(), fillInFlight = false, storeEnabled = Boolean(store), storePending = 0;
  const total = rows => rows.reduce((sum, [, row]) => sum + row.size, 0);
  const expire = () => { entries = new Map([...entries].filter(([, row]) => validClock(row, now()))); };
  const drop = (key, expected) => { if (entries.get(key) === expected) entries = new Map([...entries].filter(([name]) => name !== key)); };
  const touch = key => { const row = entries.get(key); if (row) entries = new Map([...entries].filter(([name]) => name !== key).concat([[key, row]])); };
  function admit(key, value) {
    const entry = copyEntry(value, key); if (!entry || !validClock(entry, now()) || entry.size > maxBytes) return false;
    const previous = entries.get(key); if (previous && previous.createdAt > entry.createdAt) return false;
    let rows = [...entries].filter(([name, row]) => name !== key && validClock(row, now()));
    while (rows.length && (rows.length >= maxEntries || total(rows) + entry.size > maxBytes)) rows = rows.slice(1);
    entries = new Map([...rows, [key, entry]]); return true;
  }
  async function stored(method, ...args) {
    if (!storeEnabled || storePending >= MAX_STORE_OPERATIONS) return { ok: false };
    storePending += 1; let timer;
    const work = Promise.resolve().then(() => store[method](...args)).then(value => {
      storePending -= 1; return { ok: true, value };
    }, () => { storePending -= 1; storeEnabled = false; return { ok: false }; });
    const deadline = new Promise(resolve => { timer = timing.setTimeout(() => {
      storeEnabled = false; resolve({ ok: false });
    }, STORE_DEADLINE_MS); });
    try { return await Promise.race([work, deadline]); }
    finally { timing.clearTimeout(timer); }
  }
  async function hit(entry, target, source) {
    let response;
    try {
      if (!validClock(entry, now())) return null;
      response = new Response(entry.bytes, { headers: entry.headers });
      const certificate = readCertificate(response, target, now());
      if (!validClock(certificate, now()) || certificate.createdAt !== entry.createdAt
        || certificate.expiresAt !== entry.expiresAt || certificate.bytes !== entry.bytes.byteLength) return null;
      const renewed = await renew(response, target, { now });
      if (!(renewed instanceof Response) || renewed.status !== 200 || !validClock(entry, now())) {
        cancel(renewed?.body); return null;
      }
      return outward(renewed, 'HIT', Math.floor((now() - entry.createdAt) / 1000), source);
    } catch { return null; }
    finally { cancel(response?.body); }
  }
  async function fill(response, target, key) {
    if (response.status !== 200 || !response.body || response.headers.has(CERTIFICATE)) return outward(response, 'BYPASS');
    let fresh = response;
    try {
      const certified = await certify(response, target, { now });
      if (!(certified instanceof Response)) return outward(response, 'BYPASS');
      fresh = certified;
      const certificate = readCertificate(certified, target, now());
      if (!validClock(certificate, now())) return outward(fresh, 'BYPASS');
      const bytes = await capture(certified, timing);
      if (!bytes || bytes.byteLength !== certificate.bytes || !validClock(certificate, now())) return outward(fresh, 'BYPASS');
      const entry = copyEntry({ bytes, headers: [...certified.headers], createdAt: certificate.createdAt,
        expiresAt: certificate.expiresAt }, key);
      if (!entry || !admit(key, entry)) return outward(fresh, 'BYPASS');
      if (storeEnabled) await stored('put', key, { bytes: new Uint8Array(entry.bytes),
        headers: entry.headers.map(pair => [...pair]), createdAt: entry.createdAt, expiresAt: entry.expiresAt });
      return outward(fresh, 'MISS');
    } catch { return outward(fresh, 'BYPASS'); }
  }
  async function handle(request, deliver) {
    const target = targetForCache(request, mode, revision);
    if (!target) return outward(await deliver(), 'BYPASS');
    expire(); const key = cacheKeyFor(request, target).url, memory = entries.get(key);
    if (memory) {
      const response = await hit(memory, target, 'memory');
      if (response) { touch(key); return response; }
      drop(key, memory);
    }
    if (storeEnabled) {
      const found = await stored('get', key);
      if (found.ok && found.value) {
        let row;
        try { row = copyEntry(found.value, key); } catch { row = null; }
        if (row) { const response = await hit(row, target, 'sqlite'); if (response) { admit(key, row); return response; } }
      }
    }
    if (fillInFlight) return outward(await deliver(), 'BYPASS');
    fillInFlight = true;
    try { const response = await deliver(); return await fill(response, target, key); }
    finally { fillInFlight = false; }
  }
  return Object.freeze({ handle, snapshot: () => Object.freeze({ entries: entries.size,
    accountedBytes: total([...entries]), maxBytes, maxEntries, fillInFlight, storeEnabled, storePending }) });
}
