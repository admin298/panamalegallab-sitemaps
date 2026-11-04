import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { certifyHtml, renewTemplate, readTemplateCertificate, TEMPLATE_HEADER,
  TEMPLATE_TTL_MS, TEMPLATE_BODY_LIMIT } from '../src/html-template.js';

const identity = Object.freeze({ origin: 'https://www.panamalegallab.com', path: '/',
  language: 'es', siteName: 'panamalegallab', revision: 'html-cache-test-v1' });
const scriptNonce = 'ScriptNonce1234567890123456';
const styleNonce = 'StylesNonce1234567890123456';
const csp = `base-uri 'self';object-src 'none';script-src 'report-sample' 'nonce-${scriptNonce}' 'unsafe-inline' 'unsafe-eval';worker-src 'self'`;
const vary = 'Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site, accept-encoding';
const html = '<!doctype html><html><head><meta charset="utf-8">'
  + '<link rel="canonical" href="https://www.panamalegallab.com/">'
  + `<link rel="stylesheet" nonce="${styleNonce}" href="/_pll-assets/exact.css">`
  + `<style nonce='${styleNonce}'>p{color:navy}</style><script nonce="${scriptNonce}">window.original=1;</script>`
  + '</head><body><main data-domain="panamalegallab.com" data-sitename="panamalegallab">'
  + `<p>Panamá, société, società 😀</p><img src="https://example.invalid/same-photo.webp"><script nonce='${scriptNonce}'>window.second=2;</script>`
  + '</main></body></html>';
const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
  'Content-Security-Policy': csp, Vary: vary, 'X-Keep': 'exact', ETag: '"old"',
  'Content-MD5': 'old', Digest: 'sha-256=old', 'Content-Digest': 'old', 'Repr-Digest': 'old',
  'Last-Modified': 'Wed, 04 Nov 2026 00:00:00 GMT' };
const time = 1_800_000_000_000;
const record = (tag, attrs = {}, parent = null) => ({ tag, attrs, parent });
const dom = [record('html'), record('head'), record('meta', { charset: 'utf-8' }, 'head'),
  record('link', { rel: 'canonical', href: identity.origin + identity.path }, 'head'),
  record('link', { nonce: styleNonce }), record('style', { nonce: styleNonce }),
  record('script', { nonce: scriptNonce }), record('body'),
  record('main', { 'data-domain': 'panamalegallab.com', 'data-sitename': 'panamalegallab' }),
  record('script', { nonce: scriptNonce })];
const matches = (row, selector) => selector === '[nonce]' ? Object.hasOwn(row.attrs, 'nonce')
  : selector === '[data-domain][data-sitename]' ? Object.hasOwn(row.attrs, 'data-domain') && Object.hasOwn(row.attrs, 'data-sitename')
  : selector === 'head meta[charset]' ? row.tag === 'meta' && row.parent === 'head' && Object.hasOwn(row.attrs, 'charset')
  : selector === 'link[rel]' ? row.tag === 'link' && Object.hasOwn(row.attrs, 'rel')
  : selector === 'head link[rel]' ? row.tag === 'link' && row.parent === 'head' && Object.hasOwn(row.attrs, 'rel')
  : selector === 'meta[http-equiv]' ? row.tag === 'meta' && Object.hasOwn(row.attrs, 'http-equiv')
  : row.tag === selector;

// Explicit DOM event recordings isolate the certificate logic from its parser.
// The separate native integration at the end checks actual HTMLRewriter behavior.
function recorder(rows = dom) {
  return class RecordedRewriter {
    handlers = [];
    on(selector, handler) { this.handlers = [...this.handlers, { selector, handler }]; return this; }
    transform() {
      for (const row of rows) for (const { selector, handler } of this.handlers) {
        if (matches(row, selector)) handler.element({ tagName: row.tag,
          getAttribute: name => row.attrs[name] ?? null });
      }
      return new Response('');
    }
  };
}
const options = { Rewriter: recorder(), now: () => time, cryptoImpl: webcrypto };
const source = (body = html, extraHeaders = {}, status = 200) => new Response(body, { status,
  headers: { ...headers, ...extraHeaders } });
const certificateOf = response => JSON.parse(atob(response.headers.get(TEMPLATE_HEADER)));
const withCertificate = (response, certificate, body = html, extra = {}) => new Response(body, { headers: {
  ...Object.fromEntries(response.headers), ...extra, [TEMPLATE_HEADER]: btoa(JSON.stringify(certificate)),
} });
async function approved() { return certifyHtml(source(), identity, options); }

test('certification preserves the exact document and records its two nonce families', async () => {
  const response = await approved();
  const cert = readTemplateCertificate(response, identity, time);
  assert.ok(cert); assert.equal(cert.v, 2); assert.equal(cert.createdAt, time);
  assert.equal(Object.hasOwn(cert, 'chars'), false);
  assert.equal(cert.expiresAt, time + TEMPLATE_TTL_MS); assert.equal(cert.spans.length, 4);
  assert.deepEqual(cert.nonces, [scriptNonce, styleNonce]);
  assert.equal(cert.vary, vary); assert.equal(cert.csp, csp);
  assert.equal(await response.text(), html);
});

test('each cached delivery renews both nonce families without changing any other body byte', async () => {
  const response = await approved();
  const first = await renewTemplate(response.clone(), identity, { now: () => time + 1, cryptoImpl: webcrypto });
  const second = await renewTemplate(response.clone(), identity, { now: () => time + 2, cryptoImpl: webcrypto });
  assert.ok(first); assert.ok(second);
  const value = await first.text();
  const nextScript = first.headers.get('Content-Security-Policy').match(/'nonce-([^']+)'/)[1];
  const nextStyle = value.match(/<style nonce='([^']+)'/)[1];
  assert.notEqual(nextScript, nextStyle); assert.equal(nextScript.length, 32);
  assert.ok(!value.includes(scriptNonce) && !value.includes(styleNonce));
  assert.equal(value.replaceAll(nextScript, scriptNonce).replaceAll(nextStyle, styleNonce), html);
  assert.notEqual(second.headers.get('Content-Security-Policy'), first.headers.get('Content-Security-Policy'));
  assert.equal(first.headers.get('Cache-Control'), 'no-store'); assert.equal(first.headers.get('X-Keep'), 'exact');
  assert.equal(first.headers.get('Vary'), vary); assert.equal(first.headers.has(TEMPLATE_HEADER), false);
  for (const name of ['ETag', 'Content-Length', 'Content-MD5', 'Digest', 'Content-Digest', 'Repr-Digest', 'Last-Modified'])
    assert.equal(first.headers.has(name), false, name);
});

test('an internal cache policy does not leak to visitors, and original Vary is restored', async () => {
  const response = await approved(); const internal = new Headers(response.headers);
  internal.set('Cache-Control', 'public, max-age=299'); internal.delete('Vary');
  const renewed = await renewTemplate(new Response(html, { headers: internal }), identity,
    { now: () => time + 1, cryptoImpl: webcrypto });
  assert.ok(renewed); assert.equal(renewed.headers.get('Vary'), vary);
  assert.equal(renewed.headers.get('Cache-Control'), 'no-store');
});

test('identities cannot cross hosts, paths, language, site identity or release', async () => {
  const response = await approved();
  for (const changed of [{ origin: 'https://en.panamalegallab.com' }, { path: '/different' },
    { language: 'fr' }, { siteName: 'other' }, { revision: 'next-release' }]) {
    assert.equal(readTemplateCertificate(response, { ...identity, ...changed }, time), null);
    assert.equal(await renewTemplate(response.clone(), { ...identity, ...changed }, options), null);
  }
  assert.equal(await certifyHtml(source(), { ...identity, origin: 'https://evil.invalid' }, options)
    .then(r => r.headers.has(TEMPLATE_HEADER)), false);
});

test('time bounds are absolute, exclusive at expiry, and not extended by a cache read', async () => {
  const response = await approved();
  for (const now of [time - 1, time + TEMPLATE_TTL_MS, NaN])
    assert.equal(readTemplateCertificate(response, identity, now), null);
  const cert = certificateOf(response);
  assert.equal(readTemplateCertificate(withCertificate(response, { ...cert, expiresAt: cert.expiresAt + 1 }), identity, time), null);
  assert.equal(await renewTemplate(response.clone(), identity, { now: () => time + TEMPLATE_TTL_MS, cryptoImpl: webcrypto }), null);
});

test('private, variant, encoded, non-HTML and non-success responses are never certified', async () => {
  for (const patch of [{ 'Set-Cookie': 'private=1' }, { 'Cache-Control': 'private, no-store' },
    { Vary: 'Cookie' }, { Vary: '*' }, { 'Content-Encoding': 'gzip' },
    { 'Content-Security-Policy-Report-Only': csp }, { 'Content-Type': 'text/plain' },
    { 'Content-Type': 'text/html; charset=windows-1252' }]) {
    const response = source(html, patch); assert.equal(await certifyHtml(response, identity, options), response);
  }
  for (const status of [201, 302, 404, 503]) {
    const response = source(html, {}, status); assert.equal(await certifyHtml(response, identity, options), response);
  }
  const empty = new Response(null, { headers }); assert.equal(await certifyHtml(empty, identity, options), empty);
});

test('CSP policy shapes outside the proven contract retain native delivery', async () => {
  for (const policy of ['', csp + ', ' + csp, csp + '; default-src https:', csp + '; style-src https:',
    csp + '; script-src-elem https:', csp + '; script-src https:',
    csp.replace(scriptNonce, 'DifferentNonce12345678'), csp.replace(`'nonce-${scriptNonce}'`, "'self'")]) {
    const response = source(html, { 'Content-Security-Policy': policy });
    assert.equal(await certifyHtml(response, identity, options), response);
  }
});

test('DOM structure and identity failures cannot produce certificates', async () => {
  const variants = [dom.filter(r => r.tag !== 'head'), [...dom, record('base', { href: '/' })],
    [...dom, record('meta', { 'http-equiv': 'Content-Security-Policy' })],
    dom.map(r => r.tag === 'main' ? record('main', { ...r.attrs, 'data-sitename': 'other' }) : r),
    [...dom, record('script')], [...dom, record('img', { nonce: scriptNonce })],
    dom.map(r => r.tag === 'meta' ? record('meta', { charset: 'latin1' }, 'head') : r),
    [...dom, record('script', { nonce: 'ThirdNonce12345678901234' })]];
  for (const rows of variants) {
    const response = source(); assert.equal(await certifyHtml(response, identity, { ...options, Rewriter: recorder(rows) }), response);
  }
});

test('nonces in text, comments, bootstrap literals and duplicate attributes fail closed', async () => {
  for (const changed of [html.replace('</body>', scriptNonce + '</body>'),
    html.replace('</head>', `<!--<script nonce="${scriptNonce}"></script>--></head>`),
    html.replace('window.original=1;', `window.original="${scriptNonce}";`),
    html.replace(`nonce="${scriptNonce}"`, `nonce="${scriptNonce}" nonce="${scriptNonce}"`),
    html.replace(`nonce="${scriptNonce}"`, `nonce=${scriptNonce}`),
    html.replace('window.original=1;', 'window.original="<head>";'),
    html.replace('</body>', '<div class="unterminated></body>')]) {
    const response = source(changed); assert.equal(await certifyHtml(response, identity, options), response);
  }
});

test('a changed cached body or CSP is rejected rather than authorizing unknown content', async () => {
  const response = await approved(); const cert = certificateOf(response);
  assert.equal(await renewTemplate(withCertificate(response, cert, html.replace('original=1', 'original=9')), identity, options), null);
  assert.equal(await renewTemplate(withCertificate(response, cert, html, { 'Content-Security-Policy': csp + '; frame-src https:' }), identity, options), null);
  assert.equal(await renewTemplate(withCertificate(response, cert, html, { 'Set-Cookie': 'private=1' }), identity, options), null);
  assert.equal(await renewTemplate(withCertificate(response, cert, html, { 'Content-Security-Policy-Report-Only': csp }), identity, options), null);
});

test('malformed, excessive and structurally invalid certificates cannot be used', async () => {
  const response = await approved(); const cert = certificateOf(response);
  for (const encoded of ['not base64!', btoa('{'), 'x'.repeat(20_000)]) {
    const changed = new Response(html, { headers: { ...headers, [TEMPLATE_HEADER]: encoded } });
    assert.equal(readTemplateCertificate(changed, identity, time), null);
  }
  for (const patch of [{ v: 1 }, { sha256: 'bad' }, { bytes: TEMPLATE_BODY_LIMIT + 1 },
    { nonces: [scriptNonce, scriptNonce] }, { spans: [] },
    { spans: [{ start: -1, end: 3, family: 0 }] },
    { spans: cert.spans.map((r, i) => i ? r : { ...r, start: r.start + 1 }) },
    { identity: { ...cert.identity, extra: true } }, { vary: 'Authorization' }]) {
    assert.equal(readTemplateCertificate(withCertificate(response, { ...cert, ...patch }), identity, time), null);
  }
  const missing = source(); assert.equal(readTemplateCertificate(missing, identity, time), null);
});

test('oversized and invalid UTF-8 bodies, streaming errors and missing parser retain source', async () => {
  for (const body of ['x'.repeat(TEMPLATE_BODY_LIMIT + 1), new Uint8Array([0xff]),
    new ReadableStream({ start(controller) { controller.error(new Error('private')); } })]) {
    const response = source(body); assert.equal(await certifyHtml(response, identity, options), response);
  }
  const response = source(); assert.equal(await certifyHtml(response, identity, { ...options, Rewriter: null }), response);
});

test('cryptographic failures and repeated nonce outputs fail closed', async () => {
  const response = await approved();
  const badHash = { ...webcrypto, subtle: { digest: async () => { throw Error('hash failed'); } } };
  const original = source(); assert.equal(await certifyHtml(original, identity, { ...options, cryptoImpl: badHash }), original);
  const repeated = { subtle: webcrypto.subtle, getRandomValues: values => values.fill(7) };
  assert.equal(await renewTemplate(response.clone(), identity, { ...options, cryptoImpl: repeated }), null);
});

test('inspection deadline cannot delay delivery indefinitely', async () => {
  class Stalled { on() { return this; } transform() { return new Response(new ReadableStream({ start() {} })); } }
  const response = source(); const begin = Date.now();
  assert.equal(await certifyHtml(response, identity, { ...options, Rewriter: Stalled }), response);
  assert.ok(Date.now() - begin < 2_500);
});

test('the exact single head canonical is required; wrong, duplicate and body canonicals bypass', async () => {
  const canonical = dom.find(row => row.attrs.rel === 'canonical');
  const variants = [dom.filter(row => row !== canonical), [...dom, canonical],
    dom.map(row => row === canonical ? record('link', { ...row.attrs, href: 'https://en.panamalegallab.com/' }, 'head') : row),
    dom.map(row => row === canonical ? { ...row, parent: 'body' } : row)];
  for (const rows of variants) {
    const response = source();
    assert.equal(await certifyHtml(response, identity, { ...options, Rewriter: recorder(rows) }), response);
  }
});

test('a stalled cached stream is canceled within the renewal deadline', async () => {
  const approvedResponse = await approved(); let canceled = false;
  const response = new Response(new ReadableStream({ start() {}, cancel() { canceled = true; } }),
    { headers: approvedResponse.headers });
  const begin = Date.now();
  assert.equal(await renewTemplate(response, identity, options), null);
  assert.ok(Date.now() - begin < 2_500); assert.equal(canceled, true);
});

test('tiny and empty stream chunks cannot cause unbounded accumulation', async () => {
  for (const value of [new Uint8Array(), new Uint8Array([120])]) {
    let pulls = 0;
    const response = source(new ReadableStream({ pull(controller) { pulls++; controller.enqueue(value); } }, { highWaterMark: 0 }));
    assert.equal(await certifyHtml(response, identity, options), response);
    assert.ok(pulls <= 2050); await response.body.cancel();
  }
});

test('expiry during digest work rejects the cached document', async () => {
  const response = await approved(); let clock = time;
  const expiringCrypto = { subtle: { async digest(...args) {
    const result = await webcrypto.subtle.digest(...args); clock += TEMPLATE_TTL_MS; return result;
  } }, getRandomValues: values => webcrypto.getRandomValues(values) };
  assert.equal(await renewTemplate(response, identity, { now: () => clock, cryptoImpl: expiringCrypto }), null);
});

const approvedReportOnly = [
  "require-trusted-types-for 'script';report-uri https://csp.withgoogle.com/csp/6b8ce7c01e3dacd3d2c7a8cd322ff979/mr",
  "script-src 'unsafe-inline';report-uri https://csp.withgoogle.com/csp/script-inclusions/6b8ce7c01e3dacd3d2c7a8cd322ff979",
];
test('the two pinned nonce-free report-only policies are certified and preserved exactly', async () => {
  for (const reportOnly of approvedReportOnly) {
    const response = await certifyHtml(source(html, { 'Content-Security-Policy-Report-Only': reportOnly }), identity, options);
    assert.ok(response.headers.has(TEMPLATE_HEADER));
    assert.equal(certificateOf(response).reportOnly, reportOnly);
    const renewed = await renewTemplate(response, identity, options);
    assert.ok(renewed); assert.equal(renewed.headers.get('Content-Security-Policy-Report-Only'), reportOnly);
    assert.notEqual(renewed.headers.get('Content-Security-Policy'), csp);
  }
});

test('report-only variants and cached policy mismatches retain normal delivery', async () => {
  for (const reportOnly of [approvedReportOnly[0] + ';object-src none', approvedReportOnly[1] + ', ' + approvedReportOnly[1],
    approvedReportOnly[0].replace('6b8ce7c01e3dacd3d2c7a8cd322ff979', '00000000000000000000000000000000'),
    approvedReportOnly[0].replace('https://csp.withgoogle.com', 'https://other.invalid'),
    approvedReportOnly[0].replace("'script'", "'nonce-Anything1234567890'"),
    approvedReportOnly[0].replace(';report-uri', '; report-uri')]) {
    const response = source(html, { 'Content-Security-Policy-Report-Only': reportOnly });
    assert.equal(await certifyHtml(response, identity, options), response);
  }
  const response = await certifyHtml(source(html, { 'Content-Security-Policy-Report-Only': approvedReportOnly[0] }), identity, options);
  const cert = certificateOf(response);
  assert.equal(await renewTemplate(withCertificate(response, cert, html,
    { 'Content-Security-Policy-Report-Only': approvedReportOnly[1] }), identity, options), null);
  assert.equal(readTemplateCertificate(withCertificate(response, { ...cert, reportOnly: approvedReportOnly[1] }), identity, time), null);
});

test('HIT does not execute a JavaScript callback per body byte', { concurrency: false }, async () => {
  const response = await approved(); const every = Uint8Array.prototype.every;
  let byteCallbacks = 0, renewed;
  try {
    Uint8Array.prototype.every = function (callback, receiver) {
      return every.call(this, (value, index, bytes) => {
        byteCallbacks++; return callback.call(receiver, value, index, bytes);
      });
    };
    renewed = await renewTemplate(response, identity, options);
  } finally { Uint8Array.prototype.every = every; }
  assert.ok(renewed); assert.equal(byteCallbacks, 0, 'no callback for each cached HTML byte');
});

const insertCommentBytes = bytes => Buffer.concat([
  Buffer.from(html.slice(0, -'</body></html>'.length) + '<!--'), Buffer.from(bytes), Buffer.from('--></body></html>'),
]);
test('all 256 isolated byte values retain strict UTF-8 acceptance and exact valid bytes', async () => {
  for (let value = 0; value < 256; value++) {
    const bytes = insertCommentBytes([value]), response = source(bytes);
    const certified = await certifyHtml(response, identity, options);
    if (value >= 128) { assert.equal(certified, response, `invalid isolated byte ${value}`); continue; }
    assert.ok(certified.headers.has(TEMPLATE_HEADER), `valid ASCII byte ${value}`);
    const renewed = await renewTemplate(certified, identity, options); assert.ok(renewed);
    const output = await renewed.text(), nextScript = renewed.headers.get('Content-Security-Policy').match(/'nonce-([^']+)'/)[1];
    const nextStyle = output.match(/<style nonce='([^']+)'/)[1];
    assert.ok(Buffer.from(output.replaceAll(nextScript, scriptNonce).replaceAll(nextStyle, styleNonce)).equals(bytes));
  }
});

test('BOM, scalar boundaries, combining text and line endings retain their exact UTF-8 bytes', async () => {
  for (const text of ['\ufeff' + html, html.replace('Panamá', '\u0000\r\n\u007f\u0080\u07ff\u0800\ud7ff\ue000\uffff'),
    html.replace('Panamá', 'e\u0301 é \u2028 \u2029 \ufeff 😀 ' + String.fromCodePoint(0x10ffff))]) {
    const bytes = Buffer.from(text), certified = await certifyHtml(source(bytes), identity, options);
    assert.ok(certified.headers.has(TEMPLATE_HEADER));
    assert.ok(Buffer.from(await certified.clone().arrayBuffer()).equals(bytes));
    const renewed = await renewTemplate(certified, identity, options); assert.ok(renewed);
    const output = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await renewed.arrayBuffer());
    const nextScript = renewed.headers.get('Content-Security-Policy').match(/'nonce-([^']+)'/)[1];
    const nextStyle = output.match(/<style nonce='([^']+)'/)[1];
    assert.ok(Buffer.from(output.replaceAll(nextScript, scriptNonce).replaceAll(nextStyle, styleNonce)).equals(bytes));
  }
});

test('the certifier rejects invalid UTF-8 and a changed cached body fails its attested digest', async () => {
  const approvedResponse = await approved(), originalCert = certificateOf(approvedResponse);
  for (const invalid of [[0xc0, 0xaf], [0xc1, 0xbf], [0xed, 0xa0, 0x80], [0xed, 0xbf, 0xbf],
    [0xf4, 0x90, 0x80, 0x80], [0xf8, 0x80, 0x80, 0x80, 0x80], [0xc2], [0xe2, 0x82], [0xf0, 0x90, 0x8d]]) {
    const bytes = insertCommentBytes(invalid), response = source(bytes);
    assert.equal(await certifyHtml(response, identity, options), response);
    // Only the private certifier creates the certificate. HIT does not re-parse
    // its validated UTF-8: changing cached bytes must fail the original digest.
    const changed = { ...originalCert, bytes: bytes.length };
    assert.equal(await renewTemplate(withCertificate(approvedResponse, changed, bytes), identity, options), null);
  }
});

test('v2 certifies byte offsets after Unicode and HIT never decodes or encodes the whole body', { concurrency: false }, async () => {
  const text = '\ufeff' + html.replace('<meta charset="utf-8">', '<meta charset="utf-8"><title>😀 é e\u0301</title>');
  const bytes = Buffer.from(text), response = await certifyHtml(source(bytes), identity, options);
  const cert = certificateOf(response);
  assert.equal(cert.v, 2); assert.equal(Object.hasOwn(cert, 'chars'), false);
  for (const span of cert.spans) {
    assert.equal(bytes.subarray(span.start, span.end).toString('ascii'), cert.nonces[span.family]);
    assert.ok([34, 39].includes(bytes[span.start - 1])); assert.equal(bytes[span.end], bytes[span.start - 1]);
  }
  const decode = TextDecoder.prototype.decode, encode = TextEncoder.prototype.encode;
  let decoded = 0, largestEncodedString = 0, renewed;
  try {
    TextDecoder.prototype.decode = function (...args) { decoded++; return decode.apply(this, args); };
    TextEncoder.prototype.encode = function (value = '') {
      largestEncodedString = Math.max(largestEncodedString, value.length); return encode.call(this, value);
    };
    renewed = await renewTemplate(response, identity, options);
  } finally { TextDecoder.prototype.decode = decode; TextEncoder.prototype.encode = encode; }
  assert.ok(renewed); assert.equal(decoded, 0, 'no complete body decoding on HIT');
  assert.ok(largestEncodedString <= 256, 'only bounded ASCII nonce strings may be encoded on HIT');
  const output = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await renewed.arrayBuffer());
  const nextScript = renewed.headers.get('Content-Security-Policy').match(/'nonce-([^']+)'/)[1];
  const nextStyle = output.match(/<style nonce='([^']+)'/)[1];
  assert.ok(Buffer.from(output.replaceAll(nextScript, scriptNonce).replaceAll(nextStyle, styleNonce)).equals(bytes));
});

test('native workerd preserves BOM and Unicode bytes while rejecting invalid UTF-8', async () => {
  const { build } = await import('esbuild'); const { Miniflare } = await import('miniflare');
  const { fileURLToPath } = await import('node:url');
  const bundle = await build({ stdin: { contents: `
    import {certifyHtml,renewTemplate,TEMPLATE_HEADER} from './src/html-template.js';
    export default {async fetch(request){
      const value=await request.json();
      const original=new Response(new Uint8Array(value.bytes),{headers:value.headers});
      const certified=await certifyHtml(original,value.identity,{now:()=>${time}});
      if(!certified.headers.has(TEMPLATE_HEADER))return Response.json({certified:false});
      const renewed=await renewTemplate(certified,value.identity,{now:()=>${time + 1}});
      return Response.json({certified:true,renewed:Boolean(renewed),
        bytes:renewed?Array.from(new Uint8Array(await renewed.arrayBuffer())):null,
        csp:renewed?.headers.get('Content-Security-Policy')});
    }};`, resolveDir: fileURLToPath(new URL('../', import.meta.url)), sourcefile: 'template-utf8-native.js' },
  bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  const runtime = new Miniflare({ modules: true, script: bundle.outputFiles[0].text,
    compatibilityDate: '2026-07-30', outboundService: () => { throw Error('External network is forbidden'); } });
  try {
    const good = [Buffer.from('\ufeff' + html), insertCommentBytes(Buffer.from('\u0000\r\n e\u0301 \ufeff 😀 ' + String.fromCodePoint(0x10ffff)))];
    const bad = [[0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xe2, 0x82]].map(insertCommentBytes);
    for (const [bytes, valid] of [...good.map(bytes => [bytes, true]), ...bad.map(bytes => [bytes, false])]) {
      const response = await runtime.dispatchFetch('https://local.invalid/', { method: 'POST',
        body: JSON.stringify({ bytes: [...bytes], headers, identity }), headers: { 'Content-Type': 'application/json' } });
      const result = await response.json(); assert.equal(result.certified, valid);
      if (!valid) continue;
      assert.equal(result.renewed, true);
      const output = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(new Uint8Array(result.bytes));
      const nextScript = result.csp.match(/'nonce-([^']+)'/)[1], nextStyle = output.match(/<style nonce='([^']+)'/)[1];
      assert.ok(Buffer.from(output.replaceAll(nextScript, scriptNonce).replaceAll(nextStyle, styleNonce)).equals(bytes));
    }
  } finally { await runtime.dispose(); }
});

test('byte-splice growth and shrinkage match an independent whole-buffer reference at nonce length boundaries', async () => {
  for (const length of [16, 22, 32, 256]) {
    const old = ['S'.repeat(length), 'T'.repeat(length)];
    const text = '\ufeff' + html.replaceAll(scriptNonce, old[0]).replaceAll(styleNonce, old[1])
      .replaceAll('nonce=', 'data-prefix="😀 \ufeff e\u0301 é" nonce=');
    const bytes = Buffer.from(text);
    const rows = dom.map(row => row.attrs.nonce ? { ...row, attrs: { ...row.attrs,
      nonce: row.attrs.nonce === scriptNonce ? old[0] : old[1] } } : row);
    const response = await certifyHtml(source(bytes, { 'Content-Security-Policy': csp.replace(scriptNonce, old[0]) }),
      identity, { ...options, Rewriter: recorder(rows) });
    const cert = readTemplateCertificate(response, identity, time); assert.ok(cert, `nonce length ${length}`);
    assert.equal(cert.spans.length, 4);
    let previousEnd = -1;
    for (const span of cert.spans) {
      assert.ok(span.start > previousEnd && span.start > 0 && span.end < bytes.length);
      assert.equal(span.end - span.start, length);
      assert.ok(bytes.subarray(span.start, span.end).equals(Buffer.from(old[span.family])));
      assert.ok([34, 39].includes(bytes[span.start - 1])); assert.equal(bytes[span.end], bytes[span.start - 1]);
      previousEnd = span.end;
    }
    let randomCalls = 0;
    const deterministicCrypto = { subtle: webcrypto.subtle,
      getRandomValues: values => values.fill(++randomCalls) };
    const renewed = await renewTemplate(response.clone(), identity, { ...options, cryptoImpl: deterministicCrypto });
    assert.ok(renewed);
    const actual = Buffer.from(await renewed.arrayBuffer());
    const output = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(actual);
    const next = [renewed.headers.get('Content-Security-Policy').match(/'nonce-([^']+)'/)[1],
      output.match(/<style\b[^>]*\bnonce='([^']+)'/u)[1]];
    assert.equal(next[0].length, 32); assert.equal(next[1].length, 32);
    const reference = Buffer.from(text.replaceAll(old[0], next[0]).replaceAll(old[1], next[1]));
    assert.ok(actual.equals(reference), `exact whole-buffer reference for length ${length}`);
    assert.equal(actual.length, bytes.length + 4 * (32 - length));
    assert.ok(actual.length <= TEMPLATE_BODY_LIMIT + 256 * (32 - 16));
    const first = cert.spans[0], outside = { ...cert, spans: [
      { ...first, start: bytes.length + 1, end: bytes.length + 1 + length }, ...cert.spans.slice(1),
    ] };
    assert.equal(await renewTemplate(withCertificate(response, outside, bytes), identity, options), null);
  }
});
