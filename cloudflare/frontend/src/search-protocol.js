import { SITES, rewriteSiteUrl, arrayElementSpan } from '../vendor/logic.js';

export const SEARCH_BODY_LIMIT = 4096;
export const SEARCH_RESPONSE_LIMIT = 262144;
export const SEARCH_HTML_LIMIT = 1048576;
const XSSI = ")]}'\n\n";
const headers = Object.freeze({ 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });

export class SearchInputError extends Error {
  constructor(status = 400) { super('Invalid public search request.'); this.status = status; }
}

export function searchError(status) {
  return new Response(status >= 500 ? 'Public search is temporarily unavailable.' : 'Invalid public search request.',
    { status, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8', ...(status === 429 ? { 'Retry-After': '60' } : {}) } });
}

function formPairs(raw) {
  if (!raw) return [];
  try {
    return raw.split('&').map(part => {
      const separator = part.indexOf('=');
      if (separator < 1) throw new SearchInputError();
      return [part.slice(0, separator), part.slice(separator + 1)]
        .map(value => decodeURIComponent(value.replaceAll('+', ' ')));
    });
  } catch { throw new SearchInputError(); }
}

function queryValue(query) {
  if (typeof query !== 'string' || /[\u0000-\u001f\u007f-\u009f]/u.test(query)) throw new SearchInputError();
  const points = Array.from(query);
  if (points.length > 256 || points.some(point => point.length === 1 && /[\ud800-\udfff]/.test(point))) throw new SearchInputError();
  return query;
}

function cursorValue(value) {
  const cursor = queryValue(value);
  if (!cursor.length) throw new SearchInputError();
  return cursor;
}

function searchParameters(raw, isPage) {
  const pairs = formPairs(raw);
  const keys = pairs.map(([key]) => key);
  if (new Set(keys).size !== keys.length) throw new SearchInputError();
  const parameters = Object.fromEntries(pairs);
  const allowed = isPage ? ['query', 'scope', 'showCloudSearchTab', 'authuser', 'page_token'] : ['authuser'];
  if (keys.some(key => !allowed.includes(key)) || ('authuser' in parameters && parameters.authuser !== '0')) throw new SearchInputError();
  if (!isPage) return '';
  if (!('query' in parameters) || parameters.scope !== 'site' || parameters.showCloudSearchTab !== 'false') throw new SearchInputError();
  return new URLSearchParams({ query: queryValue(parameters.query), scope: 'site', showCloudSearchTab: 'false',
    ...('page_token' in parameters ? { page_token: cursorValue(parameters.page_token) } : {}) }).toString();
}

export function planSearchRequest(input, method) {
  const url = new URL(input);
  const site = Object.values(SITES).find(candidate =>
    url.pathname === `/_/view/search${candidate.upstreamPrefix}` || url.pathname === `/search${candidate.upstreamPrefix}`);
  if (!site) return null;
  if (method === 'POST' && url.pathname === `/_/view/search${site.upstreamPrefix}`) {
    searchParameters(url.search.slice(1), false);
    return { kind: 'search-post', site, upstream: `https://sites.google.com/_/view/search${site.upstreamPrefix}` };
  }
  if (!['GET', 'HEAD'].includes(method) || url.pathname !== `/search${site.upstreamPrefix}`) return null;
  const parameters = searchParameters(url.search.slice(1), true);
  return { kind: 'page', searchPage: true, site, path: '/_/search',
    upstream: `https://sites.google.com/search${site.upstreamPrefix}?${parameters}`,
    canonical: `${site.productionOrigin}/_/search?${parameters}`,
    previewPage: `${url.origin}${url.pathname}?${parameters}`, previewOrigin: url.origin };
}

export function isSameOriginSearch(request) {
  const expected = new URL(request.url).origin;
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite !== null && fetchSite !== 'same-origin') return false;
  const origin = request.headers.get('Origin');
  if (origin !== null) return origin === expected;
  const referer = request.headers.get('Referer');
  if (!referer) return false;
  try { const url = new URL(referer); return url.origin === expected && !url.username && !url.password; } catch { return false; }
}

export async function readBoundedText(stream, limit, lengthHeader) {
  if (lengthHeader && /^\d+$/.test(lengthHeader) && Number(lengthHeader) > limit) throw new SearchInputError(413);
  if (!stream) return '';
  const reader = stream.getReader();
  let chunks = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.byteLength;
    if (size > limit) { await reader.cancel(); throw new SearchInputError(413); }
    chunks = [...chunks, item.value];
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new SearchInputError(); }
}

function validatedSearchMessage(text) {
  if (new TextEncoder().encode(text).byteLength > SEARCH_BODY_LIMIT) throw new SearchInputError(413);
  const pairs = formPairs(text);
  if (pairs.length !== 1 || pairs[0][0] !== 'f.req') throw new SearchInputError();
  let parsed;
  try { parsed = JSON.parse(pairs[0][1]); } catch { throw new SearchInputError(); }
  if (!Array.isArray(parsed) || ![2, 4].includes(parsed.length) || parsed[0] !== 'at:ss:req') throw new SearchInputError();
  const query = queryValue(parsed[1]);
  if (parsed.length === 2) return Object.freeze(['at:ss:req', query]);
  if (parsed[2] !== null) throw new SearchInputError();
  const cursor = cursorValue(parsed[3]);
  return Object.freeze(['at:ss:req', query, null, cursor]);
}

export function validateSearchBody(text) { return validatedSearchMessage(text)[1]; }

function nestedArraySpan(json, path) {
  let start = 0;
  let current = json;
  let span;
  for (const index of path) {
    span = arrayElementSpan(current, index);
    const raw = current.slice(span.start, span.end);
    const leading = raw.match(/^\s*/)[0].length;
    start += span.start + leading;
    current = raw.trim();
  }
  return { start, end: start + current.length };
}

export function rewriteSearchResponse(text, previewOrigin, rewriteUrl = rewriteSiteUrl) {
  if (!text.startsWith(XSSI)) throw new SearchInputError(502);
  const framed = text.slice(XSSI.length);
  const leading = framed.match(/^[ \t\r\n]*/)[0];
  const trailing = framed.match(/[ \t\r\n]*$/)[0];
  const json = framed.slice(leading.length, trailing.length ? -trailing.length : undefined);
  let data;
  try { data = JSON.parse(json); } catch { throw new SearchInputError(502); }
  if (!Array.isArray(data) || data.length !== 1 || !Array.isArray(data[0]) || data[0].length !== 15
    || data[0][0] !== 'at:ss:res' || (data[0][1] !== null && !Array.isArray(data[0][1]))
    || (Array.isArray(data[0][1]) && data[0][1].length > 10)) throw new SearchInputError(502);
  const patches = (data[0][1] ?? []).map((row, index) => {
    if (!Array.isArray(row) || row.length !== 4 || typeof row[0] !== 'string' || !Array.isArray(row[1])
      || !Array.isArray(row[2]) || typeof row[3] !== 'string') throw new SearchInputError(502);
    const rewritten = /[\s<>]/u.test(row[0]) ? row[0] : rewriteUrl(row[0], previewOrigin);
    if (rewritten === row[0]) return null;
    const span = nestedArraySpan(json, [0, 1, index, 0]);
    return { ...span, value: JSON.stringify(rewritten).replaceAll('<', '\\u003c') };
  }).filter(Boolean);
  const rewritten = patches.reduceRight((value, patch) => value.slice(0, patch.start) + patch.value + value.slice(patch.end), json);
  return XSSI + leading + rewritten + trailing;
}

export async function relaySearchPost(request, plan, { fetchImpl, quota, now, rewriteUrl = rewriteSiteUrl }) {
  if (!isSameOriginSearch(request)) return searchError(403);
  const type = request.headers.get('Content-Type') ?? '';
  if (!/^application\/x-www-form-urlencoded(?:\s*;\s*charset\s*=\s*UTF-8)?\s*$/i.test(type)
    || request.headers.has('Content-Encoding')) return searchError(415);
  if (!quota(now())) return searchError(429);
  let encodedBody;
  try {
    const message = validatedSearchMessage(await readBoundedText(request.body, SEARCH_BODY_LIMIT, request.headers.get('Content-Length')));
    encodedBody = new URLSearchParams({ 'f.req': JSON.stringify(message) }).toString();
    if (new TextEncoder().encode(encodedBody).byteLength > SEARCH_BODY_LIMIT) throw new SearchInputError(413);
  }
  catch (error) { return searchError(error instanceof SearchInputError ? error.status : 400); }
  try {
    const upstream = await fetchImpl(plan.upstream, { method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json',
        'Accept-Language': plan.site.language, 'User-Agent': 'PLL-Isolated-SEO-Preview/1.0' },
      body: encodedBody,
      signal: AbortSignal.timeout(10_000) });
    if (upstream.status !== 200 || !/^application\/json(?:\s*;\s*charset\s*=\s*utf-8)?\s*$/i.test(upstream.headers.get('Content-Type') ?? '')) return searchError(502);
    const text = await readBoundedText(upstream.body, SEARCH_RESPONSE_LIMIT, upstream.headers.get('Content-Length'));
    const rewritten = rewriteSearchResponse(text, new URL(request.url).origin, rewriteUrl);
    return new Response(rewritten, { status: 200, headers: { ...headers, 'Content-Type': upstream.headers.get('Content-Type') } });
  } catch { return searchError(502); }
}
