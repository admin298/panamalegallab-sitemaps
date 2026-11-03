import { SITES, PreviewCompatibilityError, rewriteSiteUrl } from '../vendor/logic.js';
import { readBoundedText } from './search-protocol.js';
import { planDeliveryRequest, rewriteProductionUrl } from './plan.js';
import { identifyPublicSite, rewritePageDocument } from './html.js';
import { createClientQuota } from './quota.js';
import { relayDeliverySearch } from './search.js';
import { selectReadinessPolicy } from './readiness.js';

export const PAGE_BODY_LIMIT = 1_048_576;

export function deliveryHeaders(plan, extra = {}) {
  const noindex = plan.mode === 'preview' || (plan.mode === 'production' && plan.indexable === false);
  return { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    ...(noindex ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}), ...extra };
}

function respond(plan, body, status = 200, headers = {}, method = 'GET') {
  return new Response(method === 'HEAD' ? null : body, { status,
    headers: deliveryHeaders(plan, { 'Content-Type': 'text/plain; charset=utf-8', ...headers }) });
}

export function errorResponse(plan, status, method = 'GET') {
  if (status === 404 && plan.site) return respond(plan,
    `<!doctype html><html><title>Page not found</title><h1>404</h1><p>Page not found.</p><a href="${plan.site.productionOrigin}/">Panama Legal Lab</a></html>`,
    404, { 'Content-Type': 'text/html; charset=utf-8' }, method);
  const temporary = status >= 500 || status === 429;
  return respond(plan, temporary ? 'This page is temporarily unavailable. Please try again shortly.' : 'Request not available.',
    status, { ...(temporary ? { 'Retry-After': '60' } : {}), ...(status === 405 ? { Allow: 'GET, HEAD' } : {}) }, method);
}

export function publicResponseHeaders(upstream, plan) {
  const omitted = ['set-cookie', 'content-length', 'content-encoding', 'alt-svc', 'reporting-endpoints',
    'cache-control', 'x-content-type-options'];
  return new Headers([...Array.from(upstream.headers).filter(([name]) => !omitted.includes(name.toLowerCase())),
    ...Object.entries(deliveryHeaders(plan))]);
}

function utilityResponse(request, plan) {
  if (plan.kind === 'error') return errorResponse(plan, plan.status, request.method);
  if (plan.kind === 'redirect') return respond(plan, null, plan.status, { Location: plan.location }, request.method);
  if (plan.kind === 'robots') return respond(plan, 'User-agent: *\nDisallow:\n'
    + (plan.mode === 'production' ? '\nSitemap: https://sitemaps.panamalegallab.com/sitemap-index.xml\n' : ''), 200, {}, request.method);
  if (plan.kind !== 'index') return null;
  const links = Object.keys(SITES).map(language => `<li><a href="/${language}/">${language.toUpperCase()}</a></li>`).join('');
  return respond(plan, `<!doctype html><html lang="es"><title>Panama Legal Lab — preview</title><h1>Vista previa</h1><ul>${links}</ul></html>`,
    200, { 'Content-Type': 'text/html; charset=utf-8' }, request.method);
}

export function approvedSourceRedirect(location, plan, requestUrl) {
  if (typeof location !== 'string' || !location.trim() || /[\\\u0000-\u001f\u007f-\u009f]/u.test(location)) return null;
  let parsed;
  try { parsed = new URL(location, plan.upstream); } catch { return null; }
  if (parsed.origin !== 'https://sites.google.com' || parsed.username || parsed.password || parsed.port
    || !(parsed.pathname === plan.site.upstreamPrefix || parsed.pathname.startsWith(`${plan.site.upstreamPrefix}/`))) return null;
  const rewritten = plan.mode === 'production' ? rewriteProductionUrl(parsed.href) : rewriteSiteUrl(parsed.href, plan.previewOrigin);
  const target = new URL(rewritten, requestUrl).href;
  const next = planDeliveryRequest(target);
  if (target === requestUrl || !['page', 'redirect'].includes(next.kind) || next.site?.language !== plan.site.language) return null;
  return target;
}

async function adaptPublicHtml(upstream, plan, options) {
  const html = await readBoundedText(upstream.body, PAGE_BODY_LIMIT, upstream.headers.get('Content-Length'));
  const Rewriter = options.Rewriter ?? HTMLRewriter;
  const readinessPolicy = selectReadinessPolicy(plan);
  let documentContext = null;
  const identified = await options.identifySite(html, plan.site, Rewriter, { collectReadiness: Boolean(readinessPolicy), renderPlan: plan,
    onDocumentContext(context) { documentContext = context; } });
  if (identified !== true) return errorResponse(plan, 503);
  try {
    const rewritten = await options.rewriteDocument(html, { ...plan, readinessPolicy, documentContext }, Rewriter);
    return new Response(rewritten, { status: 200, headers: publicResponseHeaders(upstream, plan) });
  } catch (error) {
    if (error instanceof PreviewCompatibilityError && plan.mode === 'production' && !plan.searchPage) {
      return respond(plan, null, 302, { Location: plan.upstream, 'X-PLL-Delivery': 'google-source-fallback' });
    }
    return errorResponse(plan, plan.mode === 'preview' ? 502 : 503);
  }
}

async function fetchPublicPage(request, plan, options) {
  let upstream;
  const { fetchImpl } = options;
  try {
    upstream = await fetchImpl(plan.upstream, { method: 'GET', redirect: 'manual',
      headers: { Accept: 'text/html', 'Accept-Language': plan.site.language, 'User-Agent': 'PLL-Isolated-SEO-Preview/1.0' },
      signal: AbortSignal.timeout(20_000) });
    if (upstream.status === 404) return errorResponse(plan, 404, request.method);
    if (upstream.status >= 300 && upstream.status < 400) {
      if (![301, 302, 303, 307, 308].includes(upstream.status)) return errorResponse(plan, 503, request.method);
      const target = approvedSourceRedirect(upstream.headers.get('Location'), plan, request.url);
      return target ? respond(plan, null, upstream.status, { Location: target }, request.method) : errorResponse(plan, 503, request.method);
    }
    if (upstream.status !== 200 || !/^text\/html(?:;|$)/i.test(upstream.headers.get('Content-Type') ?? '')) return errorResponse(plan, 503, request.method);
    const response = await adaptPublicHtml(upstream, plan, options);
    return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
  } catch { return errorResponse(plan, 503, request.method); }
}

export function createDeliveryHandler({ fetchImpl = fetch, Rewriter, now = Date.now,
  pageQuota = createClientQuota({ limit: 600 }), searchQuota = createClientQuota({ limit: 60 }),
  identifySite = identifyPublicSite, rewriteDocument = rewritePageDocument } = {}) {
  const options = { fetchImpl, Rewriter, identifySite, rewriteDocument };
  return async request => {
    const plan = planDeliveryRequest(request.url, request.method);
    const utility = utilityResponse(request, plan);
    if (utility) return utility;
    if (plan.kind === 'search-post') return relayDeliverySearch(request, plan,
      { fetchImpl, quota: time => searchQuota(request, time), now });
    const quota = plan.searchPage ? searchQuota : pageQuota;
    if (!quota(request, now())) return errorResponse(plan, 429, request.method);
    return fetchPublicPage(request, plan, options);
  };
}

const handler = createDeliveryHandler();
export default { fetch: handler };
