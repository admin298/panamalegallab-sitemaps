export const RENDERER_SHA256 = 'ab2390e634808742a87beddd19bce908eef3d7ac5ea5375dc709d99a7e546a07';
export const RELEASE_ID = 'pll-compatibility-recovery-20261106-v1';
const PREVIEW_DOMAIN = 'pll-seo-preview-20261102.pages.dev';
const PRODUCTION_HOSTS = new Set(['www', 'en', 'fr', 'it'].map(label => `${label}.panamalegallab.com`));
const encoder = new TextEncoder();

function isPreview(host) {
  if (host === PREVIEW_DOMAIN) return true;
  if (!host.endsWith(`.${PREVIEW_DOMAIN}`)) return false;
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(host.slice(0, -PREVIEW_DOMAIN.length - 1));
}

function unsafePath(input) {
  const raw = input.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i)?.[1] ?? '';
  if (/[\\\u0000-\u001f\u007f-\u009f]/u.test(raw) || /%(?:2f|5c|2e|25)/i.test(raw)
    || raw.split('/').some(part => part === '.' || part === '..')) return true;
  try { return /[\\\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(decodeURIComponent(raw)); }
  catch { return true; }
}

// This small guard deliberately contains no route table or renderer imports.
export function requestBoundary(request) {
  const input = request.url;
  let url;
  try { url = new URL(input); } catch { return { allowed: false, preview: false, status: 400 }; }
  const preview = isPreview(url.hostname);
  const context = { preview };
  if ((!PRODUCTION_HOSTS.has(url.hostname) && !preview) || url.port) return { ...context, allowed: false, status: 421 };
  if (encoder.encode(input).byteLength > 8192 || encoder.encode(url.pathname).byteLength > 4096)
    return { ...context, allowed: false, status: 414 };
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || unsafePath(input))
    return { ...context, allowed: false, status: 400 };
  return { ...context, allowed: true };
}

export function boundaryResponse(context, method = 'GET', status = context.status) {
  const temporary = status >= 500;
  return new Response(method === 'HEAD' ? null : temporary
    ? 'This page is temporarily unavailable. Please try again shortly.' : 'Request not available.', {
    status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Type': 'text/plain; charset=utf-8',
      ...(context.preview ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
      ...(temporary ? { 'Retry-After': '60' } : {}) },
  });
}

export const temporaryResponse = (context, method) => boundaryResponse(context, method, 503);
export function backendNotFound(method) {
  return new Response(method === 'HEAD' ? null : 'Not found.', { status: 404,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Type': 'text/plain; charset=utf-8' } });
}

export function withBackendVersion(response, env) {
  const supplied = env?.CF_VERSION_METADATA?.id;
  const version = typeof supplied === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(supplied) ? supplied : RELEASE_ID;
  const headers = new Headers(response.headers);
  headers.set('X-PLL-Backend-Version', version);
  headers.set('X-PLL-RendererSha256', RENDERER_SHA256);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
