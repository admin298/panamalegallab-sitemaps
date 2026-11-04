export const SQLITE_TEMPLATE_SLOTS = 32;
export const SQLITE_TEMPLATE_BODY_LIMIT = 1_048_576;
export const SQLITE_TEMPLATE_HEADERS_LIMIT = 65_536;
const TTL_MS = 300_000;
const KEY_LIMIT = 8192;
const encoder = new TextEncoder();
const previewHost = 'recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const headerName = /^[!#$%&'*+.^_\x60|~0-9a-z-]+$/iu;
const schema = `CREATE TABLE IF NOT EXISTS pll_html_templates_v1 (
  slot INTEGER PRIMARY KEY CHECK(slot >= 0 AND slot < 32),
  cache_key TEXT NOT NULL CHECK(length(cache_key) <= 8192),
  body BLOB NOT NULL CHECK(typeof(body) = 'blob' AND length(body) BETWEEN 1 AND 1048576),
  headers TEXT NOT NULL CHECK(length(CAST(headers AS BLOB)) <= 65536),
  created_at INTEGER NOT NULL CHECK(created_at >= 0),
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at AND expires_at <= created_at + 300000)
)`;
const select = `SELECT cache_key, body, headers, created_at, expires_at
  FROM pll_html_templates_v1 WHERE slot = ? AND cache_key = ? LIMIT 1`;
const upsert = `INSERT INTO pll_html_templates_v1
  (slot, cache_key, body, headers, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(slot) DO UPDATE SET cache_key = excluded.cache_key, body = excluded.body,
    headers = excluded.headers, created_at = excluded.created_at, expires_at = excluded.expires_at
  WHERE excluded.cache_key <> pll_html_templates_v1.cache_key
    OR excluded.created_at >= pll_html_templates_v1.created_at`;

function validKey(key) {
  if (typeof key !== 'string' || key.length > KEY_LIMIT || /[^\x21-\x7e]/u.test(key)) return false;
  try {
    const url = new URL(key);
    if (url.href !== key || url.protocol !== 'https:' || url.username || url.password || url.port
      || url.search || url.hash) return false;
    const match = /^\/_pll-internal-cache\/[a-z0-9_-]{1,64}\/(es|en|fr|it)\/%2F[^/?#]*$/iu.exec(url.pathname);
    if (!match) return false;
    const host = (match[1].toLowerCase() === 'es' ? 'www' : match[1].toLowerCase()) + '.panamalegallab.com';
    return url.hostname === host || url.hostname === previewHost;
  } catch { return false; }
}

function slotFor(key) {
  // Addressing only, not authentication: a collision is an ordinary safe miss.
  let hash = 2166136261;
  for (let index = 0; index < key.length; index++) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619) >>> 0;
  return hash % SQLITE_TEMPLATE_SLOTS;
}

function headerRecords(value) {
  if (!Array.isArray(value) || !value.length || value.length > 128) return null;
  let chars = 0; const names = new Set();
  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || typeof pair[1] !== 'string'
      || pair[0].length > 256 || pair[1].length > SQLITE_TEMPLATE_HEADERS_LIMIT
      || !headerName.test(pair[0]) || /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/u.test(pair[1])
      || names.has(pair[0].toLowerCase()) || pair[0].toLowerCase() === 'set-cookie') return null;
    chars += pair[0].length + pair[1].length + 6;
    if (chars > SQLITE_TEMPLATE_HEADERS_LIMIT) return null;
    names.add(pair[0].toLowerCase());
  }
  const records = value.map(pair => Object.freeze([pair[0], pair[1]]));
  const json = JSON.stringify(records);
  return encoder.encode(json).byteLength <= SQLITE_TEMPLATE_HEADERS_LIMIT
    ? { records: Object.freeze(records), json } : null;
}

function freshTimes(createdAt, expiresAt, current) {
  return Number.isSafeInteger(createdAt) && createdAt >= 0 && Number.isSafeInteger(expiresAt)
    && createdAt <= current && expiresAt > current && expiresAt > createdAt && expiresAt - createdAt <= TTL_MS;
}

function ownedBytes(value) {
  if (!(value instanceof Uint8Array) && !(value instanceof ArrayBuffer)) return null;
  if (!value.byteLength || value.byteLength > SQLITE_TEMPLATE_BODY_LIMIT) return null;
  return value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(value.slice(0));
}

// Codec/bounds only. The caller verifies private certificate identity and SHA
// before serving any entry; a stored row is not itself a public attestation.
export function createSqliteTemplateStore(sql, { now = Date.now } = {}) {
  let state = 'new', reason = null;
  const disable = value => { state = 'disabled'; reason = value; };
  try { if (typeof sql?.exec !== 'function') disable('unavailable'); }
  catch { disable('unavailable'); }
  if (typeof now !== 'function') disable('invalid-clock');

  function clock() {
    try { const value = now(); return Number.isSafeInteger(value) && value >= 0 ? value : null; }
    catch { return null; }
  }

  function ready() {
    if (state === 'disabled') return false;
    if (state === 'new') {
      try { sql.exec(schema); state = 'ready'; }
      catch { disable('storage-error'); return false; }
    }
    return true;
  }

  async function get(key) {
    const current = clock();
    if (!validKey(key) || current === null || !ready()) return null;
    try {
      // SQL cursors are fully consumed synchronously, before any await boundary.
      const rows = sql.exec(select, slotFor(key), key).toArray();
      if (!Array.isArray(rows) || rows.length !== 1) return null;
      const row = rows[0];
      if (row?.cache_key !== key || !freshTimes(row.created_at, row.expires_at, current)
        || typeof row.headers !== 'string' || row.headers.length > SQLITE_TEMPLATE_HEADERS_LIMIT) return null;
      const headers = headerRecords(JSON.parse(row.headers)); if (!headers) return null;
      const bytes = ownedBytes(row.body); if (!bytes) return null;
      return Object.freeze({ bytes, headers: headers.records, createdAt: row.created_at, expiresAt: row.expires_at });
    } catch { disable('storage-error'); return null; }
  }

  async function put(key, entry) {
    const current = clock();
    if (!validKey(key) || current === null || !entry || !freshTimes(entry.createdAt, entry.expiresAt, current)) return;
    const headers = headerRecords(entry.headers); if (!headers) return;
    const bytes = ownedBytes(entry.bytes); if (!bytes || !ready()) return;
    try { sql.exec(upsert, slotFor(key), key, bytes.buffer, headers.json, entry.createdAt, entry.expiresAt); }
    catch { disable('storage-error'); }
  }

  return Object.freeze({ get, put, snapshot: () => Object.freeze({ state, reason }) });
}
