export const TEMPLATE_HEADER = 'X-PLL-HTML-Template';
export const TEMPLATE_TTL_MS = 300_000;
export const TEMPLATE_BODY_LIMIT = 1_048_576;
const HEADER_LIMIT = 16_384;
const DEADLINE_MS = 1_000;
const MAX_NONCES = 256;
const encoder = new TextEncoder();
const noncePattern = /^[A-Za-z0-9+/_-]{16,256}={0,2}$/u;
const htmlType = /^text\/html\s*;\s*charset\s*=\s*(?:"utf-8"|utf-8)\s*$/iu;
const identityKeys = ['origin', 'path', 'language', 'siteName', 'revision'];
const languages = Object.freeze({ es: 'www', en: 'en', fr: 'fr', it: 'it' });
const allowedVary = new Set(['sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'accept-encoding']);
const validators = ['Content-Length', 'Content-Encoding', 'ETag', 'Content-MD5', 'Digest',
  'Content-Digest', 'Repr-Digest', 'Last-Modified', 'Age'];
const rawText = new Set(['script', 'style', 'title', 'textarea', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript']);
const reportOnlyPolicies = new Set([
  "require-trusted-types-for 'script';report-uri https://csp.withgoogle.com/csp/6b8ce7c01e3dacd3d2c7a8cd322ff979/mr",
  "script-src 'unsafe-inline';report-uri https://csp.withgoogle.com/csp/script-inclusions/6b8ce7c01e3dacd3d2c7a8cd322ff979",
]);
const validReportOnly = value => value === null || reportOnlyPolicies.has(value);

function validIdentity(value) {
  if (!value || Object.keys(value).length !== identityKeys.length
    || !identityKeys.every(key => typeof value[key] === 'string')) return false;
  const { origin, path, language, siteName, revision } = value;
  if (!Object.hasOwn(languages, language) || origin !== `https://${languages[language]}.panamalegallab.com`
    || siteName !== (language === 'es' ? 'panamalegallab' : `panamlegallab-${language}`)
    || !/^[a-zA-Z0-9_-]{1,80}$/u.test(revision) || path.length > 4096
    || !/^\/[\x21-\x7e]*$/u.test(path) || /[?#\\]/u.test(path)) return false;
  try { return new URL(origin + path).pathname === path; } catch { return false; }
}
const sameIdentity = (left, right) => validIdentity(left) && validIdentity(right)
  && identityKeys.every(key => left[key] === right[key]);
const validVary = value => typeof value === 'string' && value.length < 1024
  && (!value || value.split(',').every(name => allowedVary.has(name.trim().toLowerCase())));

function policyNonce(csp) {
  if (typeof csp !== 'string' || !csp || csp.length > 8192 || /[,\u0000-\u001f\u007f]/u.test(csp)) return null;
  const directives = new Map();
  for (const raw of csp.split(';')) {
    const parts = raw.trim().split(/\s+/u), name = parts.shift()?.toLowerCase();
    if (!name) continue;
    if (!/^[a-z][a-z-]*$/u.test(name) || directives.has(name)) return null;
    directives.set(name, parts);
  }
  if (['default-src', 'style-src', 'style-src-elem', 'style-src-attr', 'script-src-elem', 'script-src-attr']
    .some(name => directives.has(name))) return null;
  const sources = [...csp.matchAll(/'nonce-([^']+)'/gu)];
  if (sources.length !== 1 || !noncePattern.test(sources[0][1])
    || !directives.get('script-src')?.includes(sources[0][0])) return null;
  return sources[0][1];
}

function supportedResponse(response, internal = false) {
  return response?.status === 200 && response.body && htmlType.test(response.headers.get('Content-Type') ?? '')
    && !['Set-Cookie', 'Content-Encoding'].some(name => response.headers.has(name))
    && validReportOnly(response.headers.get('Content-Security-Policy-Report-Only'))
    && !/\bprivate\b/iu.test(response.headers.get('Cache-Control') ?? '')
    && (internal || validVary(response.headers.get('Vary') ?? ''));
}

function inspector(identity) {
  let state = { html: 0, head: 0, body: 0, charset: 0, marker: 0, canonical: 0, headCanonical: 0, safe: true, records: [] };
  const count = name => ({ element() { state = { ...state, [name]: state[name] + 1 }; } });
  const handlers = {
    ...Object.fromEntries(['html', 'head', 'body'].map(name => [name, count(name)])),
    base: { element() { state = { ...state, safe: false }; } },
    'head meta[charset]': { element(el) { state = { ...state, charset: state.charset + 1,
      safe: state.safe && /^utf-?8$/iu.test(el.getAttribute('charset') ?? '') }; } },
    'meta[http-equiv]': { element(el) { if (/^content-security-policy(?:-report-only)?$/iu.test(el.getAttribute('http-equiv')?.trim() ?? ''))
      state = { ...state, safe: false }; } },
    '[data-domain][data-sitename]': { element(el) { state = { ...state, marker: state.marker + 1,
      safe: state.safe && el.getAttribute('data-domain') === 'panamalegallab.com'
        && el.getAttribute('data-sitename') === identity.siteName }; } },
    'link[rel]': { element(el) { if (el.getAttribute('rel')?.trim().toLowerCase() === 'canonical')
      state = { ...state, canonical: state.canonical + 1, safe: state.safe
        && el.getAttribute('href') === identity.origin + identity.path }; } },
    'head link[rel]': { element(el) { if (el.getAttribute('rel')?.trim().toLowerCase() === 'canonical')
      state = { ...state, headCanonical: state.headCanonical + 1 }; } },
    script: { element(el) { if (el.getAttribute('nonce') === null) state = { ...state, safe: false }; } },
    '[nonce]': { element(el) {
      const tag = el.tagName.toLowerCase(), value = el.getAttribute('nonce');
      state = { ...state, safe: state.safe && ['script', 'style', 'link'].includes(tag)
        && noncePattern.test(value ?? '') && state.records.length < MAX_NONCES,
      records: state.records.length < MAX_NONCES ? [...state.records, { tag, value }] : state.records };
    } },
  };
  return { handlers, result: () => state.safe && ['html', 'head', 'body', 'charset', 'marker', 'canonical', 'headCanonical']
    .every(name => state[name] === 1) ? state.records : null };
}

// This classifier never emits HTML. Native parsing separately attests these
// attributes; the classifier supplies exact source offsets without serializing.
function attributeSpans(html) {
  const lower = html.replace(/[A-Z]/gu, letter => letter.toLowerCase());
  let cursor = 0, records = [], tags = 0;
  while (cursor < html.length) {
    const start = html.indexOf('<', cursor); if (start < 0) break;
    if (html.startsWith('<!--', start)) {
      const end = html.indexOf('-->', start + 4); if (end < 0) return null;
      cursor = end + 3; continue;
    }
    if (/^<\//u.test(html.slice(start, start + 2)) || /^<!doctype\s/iu.test(html.slice(start, start + 16))) {
      const end = html.indexOf('>', start + 2); if (end < 0) return null;
      cursor = end + 1; continue;
    }
    const opening = /^<([a-z][a-z0-9:-]*)(?=[\s/>])/iu.exec(html.slice(start, start + 128));
    if (!opening || ++tags > 16_384) return null;
    const tag = opening[1].toLowerCase(); let at = start + opening[0].length;
    const seen = new Set(); let closed = false;
    while (at < html.length) {
      const whitespace = /^\s*/u.exec(html.slice(at))[0].length; at += whitespace;
      if (html[at] === '>') { at++; closed = true; break; }
      if (html.slice(at, at + 2) === '/>') { at += 2; closed = true; break; }
      const attribute = /^[^\s"'<>/=]+/u.exec(html.slice(at, at + 512));
      if (!attribute) return null;
      const name = attribute[0].toLowerCase(); if (seen.has(name)) return null; seen.add(name);
      at += attribute[0].length; at += /^\s*/u.exec(html.slice(at))[0].length;
      if (html[at] !== '=') { if (name === 'nonce') return null; continue; }
      at++; at += /^\s*/u.exec(html.slice(at))[0].length;
      const quote = html[at], quoted = quote === '"' || quote === "'";
      const valueStart = at + (quoted ? 1 : 0);
      const valueEnd = quoted ? html.indexOf(quote, valueStart)
        : valueStart + /^[^\s>]+/u.exec(html.slice(valueStart))?.[0]?.length;
      if (!Number.isInteger(valueEnd) || valueEnd < valueStart) return null;
      if (name === 'nonce') {
        if (!quoted || !['script', 'style', 'link'].includes(tag) || records.length >= MAX_NONCES) return null;
        records = [...records, { tag, value: html.slice(valueStart, valueEnd), start: valueStart, end: valueEnd }];
      }
      at = valueEnd + (quoted ? 1 : 0);
    }
    if (!closed) return null;
    cursor = at;
    if (rawText.has(tag)) {
      const end = lower.indexOf('</' + tag, at); if (end < 0) return null;
      const closing = new RegExp('^</' + tag + '\\s*>', 'iu').exec(html.slice(end, end + 256));
      if (!closing) return null; cursor = end + closing[0].length;
    }
  }
  return records;
}

function nonceSpans(html, records, scriptNonce) {
  for (const name of ['html', 'head', 'body']) {
    if ([...html.matchAll(new RegExp('<' + name + '(?=[\\s>])', 'giu'))].length !== 1
      || [...html.matchAll(new RegExp('</' + name + '\\s*>', 'giu'))].length !== 1) return null;
  }
  const spans = attributeSpans(html);
  if (!spans || spans.length !== records.length || !spans.every((row, i) => row.tag === records[i].tag && row.value === records[i].value)) return null;
  const styles = [...new Set(records.filter(row => row.tag !== 'script').map(row => row.value))];
  if (styles.length !== 1 || styles[0] === scriptNonce || !noncePattern.test(styles[0])
    || !records.some(row => row.tag === 'script') || records.some(row => row.tag === 'script' && row.value !== scriptNonce)) return null;
  const nonces = [scriptNonce, styles[0]];
  for (const nonce of nonces) {
    const expected = spans.filter(row => row.value === nonce).map(row => row.start);
    let index = 0;
    for (let at = html.indexOf(nonce); at !== -1; at = html.indexOf(nonce, at + nonce.length)) {
      if (expected[index++] !== at) return null;
    }
    if (index !== expected.length) return null;
  }
  return { nonces, spans: spans.map(({ start, end, value }) => ({ start, end, family: value === scriptNonce ? 0 : 1 })) };
}

const digest = async (bytes, cryptoImpl) => [...new Uint8Array(await cryptoImpl.subtle.digest('SHA-256', bytes))]
  .map(value => value.toString(16).padStart(2, '0')).join('');
function cancel(reader) { try { reader?.cancel().catch(() => {}); } catch { /* Already closed. */ } }
async function readBytes(reader) {
  const buffer = new Uint8Array(TEMPLATE_BODY_LIMIT);
  let size = 0, chunks = 0, empty = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    if (++chunks > 2048 || (!value.byteLength && ++empty > 8)
      || size + value.byteLength > TEMPLATE_BODY_LIMIT) return null;
    buffer.set(value, size); size += value.byteLength;
  }
  return buffer.slice(0, size);
}
function decode(bytes) {
  // Fatal UTF-8 rejects noncanonical encodings; ignoreBOM preserves U+FEFF.
  // Valid UTF-8 uniquely re-encodes, so no per-byte JavaScript roundtrip is needed.
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}

function matchesNonce(bytes, span, nonce) {
  if (span.start < 1 || span.end >= bytes.length || span.end - span.start !== nonce.length) return false;
  const quote = bytes[span.start - 1];
  if ((quote !== 34 && quote !== 39) || bytes[span.end] !== quote) return false;
  for (let index = 0; index < nonce.length; index++) if (bytes[span.start + index] !== nonce[index]) return false;
  return true;
}

function byteSpans(html, selected, bytes) {
  const encodedNonces = selected.nonces.map(value => encoder.encode(value));
  let chars = 0, offset = 0, spans = [];
  for (const span of selected.spans) {
    // Segments are disjoint and end at ASCII attributes, never inside a UTF-16 pair.
    offset += encoder.encode(html.slice(chars, span.start)).length;
    const nonce = encoder.encode(html.slice(span.start, span.end));
    const next = { start: offset, end: offset + nonce.length, family: span.family };
    if (!matchesNonce(bytes, next, encodedNonces[next.family])) return null;
    spans = [...spans, next]; offset = next.end; chars = span.end;
  }
  return offset + encoder.encode(html.slice(chars)).length === bytes.length ? spans : null;
}

function replaceNonceBytes(bytes, cert, replacements) {
  const originals = cert.nonces.map(value => encoder.encode(value));
  if (!cert.spans.every(span => matchesNonce(bytes, span, originals[span.family]))) return null;
  const next = replacements.map(value => encoder.encode(value));
  const size = cert.bytes + cert.spans.reduce((delta, span) => delta
    + next[span.family].length - originals[span.family].length, 0);
  if (!Number.isSafeInteger(size) || size < 1 || size > TEMPLATE_BODY_LIMIT + MAX_NONCES * (32 - 16)) return null;
  const output = new Uint8Array(size); let from = 0, to = 0;
  for (const span of cert.spans) {
    const unchanged = bytes.subarray(from, span.start);
    output.set(unchanged, to); to += unchanged.length;
    output.set(next[span.family], to); to += next[span.family].length; from = span.end;
  }
  output.set(bytes.subarray(from), to);
  return output;
}

export function readTemplateCertificate(response, identity, now = Date.now()) {
  try {
    const header = response.headers.get(TEMPLATE_HEADER);
    if (!supportedResponse(response, true) || !header || header.length > HEADER_LIMIT
      || !/^[A-Za-z0-9+/]+={0,2}$/u.test(header) || !Number.isSafeInteger(now)) return null;
    const decoded = atob(header); if (btoa(decoded) !== header) return null;
    const cert = JSON.parse(decoded);
    if (!cert || Object.keys(cert).sort().join(',') !== 'bytes,createdAt,csp,expiresAt,identity,nonces,reportOnly,sha256,spans,v,vary'
      || cert.v !== 2 || !sameIdentity(cert.identity, identity) || !Number.isSafeInteger(cert.createdAt)
      || cert.createdAt < 0 || cert.expiresAt !== cert.createdAt + TEMPLATE_TTL_MS
      || now < cert.createdAt || now >= cert.expiresAt || !/^[a-f0-9]{64}$/u.test(cert.sha256)
      || !Number.isSafeInteger(cert.bytes) || cert.bytes < 1 || cert.bytes > TEMPLATE_BODY_LIMIT
      || !validVary(cert.vary) || cert.csp !== response.headers.get('Content-Security-Policy')
      || cert.reportOnly !== response.headers.get('Content-Security-Policy-Report-Only')
      || !Array.isArray(cert.nonces) || cert.nonces.length !== 2 || !cert.nonces.every(value => noncePattern.test(value))
      || cert.nonces[0] === cert.nonces[1] || policyNonce(cert.csp) !== cert.nonces[0]
      || !Array.isArray(cert.spans) || !cert.spans.length || cert.spans.length > MAX_NONCES) return null;
    let end = -1;
    for (const span of cert.spans) {
      if (!span || Object.keys(span).sort().join(',') !== 'end,family,start'
        || ![0, 1].includes(span.family) || !Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.end)
        || span.start <= end || span.start < 0 || span.end > cert.bytes
        || span.end - span.start !== cert.nonces[span.family].length) return null;
      end = span.end;
    }
    return cert.spans.some(row => row.family === 0) && cert.spans.some(row => row.family === 1) ? cert : null;
  } catch { return null; }
}

export async function certifyHtml(response, identity, options = {}) {
  let sourceReader, parserReader, timer, aborted = false;
  try {
    if (!supportedResponse(response) || !validIdentity(identity) || response.headers.has(TEMPLATE_HEADER)) return response;
    const nonce = policyNonce(response.headers.get('Content-Security-Policy'));
    const Rewriter = options.Rewriter ?? globalThis.HTMLRewriter;
    const now = options.now ?? Date.now, createdAt = now(), cryptoImpl = options.cryptoImpl ?? globalThis.crypto;
    if (!nonce || typeof Rewriter !== 'function' || !Number.isSafeInteger(createdAt) || createdAt < 0) return response;
    const timeout = new Promise(resolve => { timer = setTimeout(() => { aborted = true; resolve(null); }, DEADLINE_MS); });
    sourceReader = response.clone().body.getReader();
    const inspect = (async () => {
      const bytes = await readBytes(sourceReader); if (!bytes || aborted) return null;
      const html = decode(bytes); if (html === null) return null;
      const check = inspector(identity); let rewriter = new Rewriter();
      for (const [selector, handler] of Object.entries(check.handlers)) rewriter = rewriter.on(selector, handler);
      parserReader = rewriter.transform(new Response(bytes)).body.getReader();
      let finished = false;
      for (let count = 0; count < 4096; count++) {
        if ((await parserReader.read()).done) { finished = true; break; }
        if (aborted) return null;
      }
      if (!finished) return null;
      const records = check.result(); if (!records || aborted) return null;
      const selected = nonceSpans(html, records, nonce); if (!selected) return null;
      const spans = byteSpans(html, selected, bytes); if (!spans) return null;
      const sha256 = await digest(bytes, cryptoImpl); if (aborted) return null;
      const cert = { v: 2, identity: { ...identity }, createdAt, expiresAt: createdAt + TEMPLATE_TTL_MS,
        bytes: bytes.length, sha256, csp: response.headers.get('Content-Security-Policy'),
        reportOnly: response.headers.get('Content-Security-Policy-Report-Only'),
        vary: response.headers.get('Vary') ?? '', nonces: selected.nonces, spans };
      const encoded = btoa(JSON.stringify(cert));
      return encoded.length <= HEADER_LIMIT ? encoded : null;
    })();
    const encoded = await Promise.race([inspect, timeout]); if (!encoded) return response;
    const headers = new Headers(response.headers); headers.set(TEMPLATE_HEADER, encoded);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch { return response; }
  finally { aborted = true; clearTimeout(timer); cancel(sourceReader); cancel(parserReader); }
}

function freshNonce(cryptoImpl) {
  const bytes = cryptoImpl.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function renewTemplate(response, identity, options = {}) {
  let reader, timer, aborted = false;
  try {
    const now = options.now ?? Date.now, cryptoImpl = options.cryptoImpl ?? globalThis.crypto;
    const cert = readTemplateCertificate(response, identity, now()); if (!cert) return null;
    const timeout = new Promise(resolve => { timer = setTimeout(() => {
      aborted = true; cancel(reader); resolve(null);
    }, DEADLINE_MS); });
    const deliver = (async () => {
      reader = response.body.getReader(); const bytes = await readBytes(reader);
      if (!bytes || aborted || bytes.length !== cert.bytes || await digest(bytes, cryptoImpl) !== cert.sha256) return null;
      if (now() >= cert.expiresAt || aborted) return null;
      const nonces = [freshNonce(cryptoImpl), freshNonce(cryptoImpl)];
      if (nonces[0] === nonces[1] || nonces.some(value => cert.nonces.includes(value))) return null;
      const result = replaceNonceBytes(bytes, cert, nonces); if (!result) return null;
      const headers = new Headers(response.headers);
      for (const name of [...validators, TEMPLATE_HEADER]) headers.delete(name);
      headers.set('Content-Security-Policy', cert.csp.replace(`'nonce-${cert.nonces[0]}'`, `'nonce-${nonces[0]}'`));
      headers.set('Cache-Control', 'no-store');
      if (cert.vary) headers.set('Vary', cert.vary); else headers.delete('Vary');
      return new Response(result, { status: 200, headers });
    })();
    return await Promise.race([deliver, timeout]);
  } catch { return null; }
  finally { aborted = true; clearTimeout(timer); cancel(reader); }
}
