import { SITES, planRequest, rewriteSiteUrl, rewriteBootstrapConfig, rewriteImageReferences,
  rewriteKnownImagePreloader, clearGoogleRedirectConfig, PreviewCompatibilityError, createQuota } from './logic.js';
import { SearchInputError, planSearchRequest, relaySearchPost, searchError, readBoundedText, SEARCH_HTML_LIMIT } from './search.js';

const PREVIEW_HEADERS = Object.freeze({
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
});

function previewResponse(body, status = 200, extraHeaders = {}, method = 'GET') {
  return new Response(method === 'HEAD' ? null : body, {
    status, headers: { ...PREVIEW_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extraHeaders },
  });
}

export function makeAttributeHandler(name, previewOrigin) {
  return { element(element) {
    const original = element.getAttribute(name);
    const rewritten = rewriteImageReferences(rewriteSiteUrl(original, previewOrigin));
    if (rewritten !== original) element.setAttribute(name, rewritten);
  } };
}

export function makeImageStyleHandler() {
  let buffer = '';
  return { text(chunk) {
    const content = buffer + chunk.text;
    if (content.length > 512_000) throw new Error('Inline style exceeds preview limit');
    buffer = chunk.lastInTextNode ? '' : content;
    if (!chunk.lastInTextNode) { chunk.remove(); return; }
    chunk.replace(rewriteImageReferences(content), { html: true });
  } };
}

export function makeScriptHandler(plan, { bootstrapMode = 'rewrite-url', onConfigValidated } = {}) {
  let buffer = '';
  return { text(chunk) {
    const content = buffer + chunk.text;
    if (content.length > 512_000) throw new Error('Inline source exceeds preview limit');
    buffer = chunk.lastInTextNode ? '' : content;
    if (!chunk.lastInTextNode) { chunk.remove(); return; }
    const script = rewriteKnownImagePreloader(content);
    if (bootstrapMode === 'clear-google-redirect') {
      const rewritten = clearGoogleRedirectConfig(script, plan.upstream);
      if (/^\s*_at_config\s*=/.test(script)) onConfigValidated?.();
      chunk.replace(rewritten, { html: true });
    } else chunk.replace(rewriteBootstrapConfig(script, plan.upstream, plan.previewPage), { html: true });
  } };
}

export function rewriteHtml(response, plan, Rewriter, { bootstrapMode = 'rewrite-url' } = {}) {
  let configurations = 0;
  const canonical = plan.canonical.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const rewriter = new Rewriter()
    .on('head', { element(element) { element.append(`<link rel="canonical" href="${canonical}">`, { html: true }); } })
    .on('link[rel~="canonical"]', { element(element) { element.remove(); } })
    .on('meta[property="og:url"], meta[itemprop="url"]', { element(element) { element.setAttribute('content', plan.canonical); } })
    .on('script:not([src])', makeScriptHandler(plan, { bootstrapMode, onConfigValidated() { configurations += 1; } }))
    .on('style', makeImageStyleHandler())
    .on('meta[property="og:image"], meta[itemprop="image"], meta[itemprop="imageUrl"], meta[itemprop="thumbnailUrl"]', makeAttributeHandler('content', plan.previewOrigin));
  for (const attribute of ['href', 'src', 'srcset', 'style', 'action', 'data-url']) {
    rewriter.on(`[${attribute}]`, makeAttributeHandler(attribute, plan.previewOrigin));
  }
  if (bootstrapMode === 'clear-google-redirect') {
    rewriter.onDocument({ end() {
      if (configurations !== 1) throw new PreviewCompatibilityError();
    } });
  }
  return rewriter.transform(response);
}

function safeUpstreamHeaders(upstream) {
  const omitted = ['set-cookie', 'content-length', 'content-encoding', 'alt-svc', 'reporting-endpoints',
    ...Object.keys(PREVIEW_HEADERS).map(name => name.toLowerCase())];
  return new Headers([
    ...Array.from(upstream.headers).filter(([name]) => !omitted.includes(name.toLowerCase())),
    ...Object.entries(PREVIEW_HEADERS),
  ]);
}

export function createHandler({ fetchImpl = fetch, Rewriter, now = Date.now, quota = createQuota(),
  searchQuota = createQuota(60), bootstrapMode = 'rewrite-url' } = {}) {
  return async request => {
    let plan = planRequest(request.url);
    if (plan.kind === 'forbidden-host') {
      return new Response('This preview has no production binding.', { status: 421, headers: { 'Cache-Control': 'no-store' } });
    }
    if (plan.kind === 'error' && plan.status !== 404) return previewResponse('Invalid preview request.', plan.status, {}, request.method);
    let searchPlan;
    try { searchPlan = planSearchRequest(request.url, request.method); }
    catch (error) { return searchError(error instanceof SearchInputError ? error.status : 400); }
    if (searchPlan?.kind === 'search-post') return relaySearchPost(request, searchPlan, { fetchImpl, quota: searchQuota, now });
    if (searchPlan) plan = searchPlan;
    if (!['GET', 'HEAD'].includes(request.method)) return previewResponse('Method not allowed.', 405, { Allow: 'GET, HEAD' });
    if (plan.kind === 'error') return previewResponse('Preview page not found.', plan.status, {}, request.method);
    if (plan.kind === 'redirect') return previewResponse(null, 301, { Location: plan.location }, request.method);
    if (plan.kind === 'robots') return previewResponse('User-agent: *\nDisallow:\n', 200, {}, request.method);
    if (plan.kind === 'index') {
      const links = Object.keys(SITES).map(language => `<li><a href="/${language}/">${language.toUpperCase()}</a></li>`).join('');
      return previewResponse(`<!doctype html><html lang="es"><meta name="robots" content="noindex,nofollow"><title>Panamá Legal Lab — vista previa</title><h1>Vista previa</h1><ul>${links}</ul></html>`, 200, { 'Content-Type': 'text/html; charset=utf-8' }, request.method);
    }
    if (plan.searchPage && !searchQuota(now())) return searchError(429);
    if (!quota(now())) return previewResponse('Preview request limit reached. Try again shortly.', 429, { 'Retry-After': '60' }, request.method);
    let upstream;
    try {
      upstream = await fetchImpl(plan.upstream, {
        method: request.method, redirect: 'manual',
        headers: { Accept: 'text/html', 'Accept-Language': plan.site.language, 'User-Agent': 'PLL-Isolated-SEO-Preview/1.0' },
        signal: AbortSignal.timeout(20_000),
      });
    } catch { return previewResponse('The public source is temporarily unavailable.', 502, {}, request.method); }
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('Location');
      const rewritten = rewriteSiteUrl(location, plan.previewOrigin);
      if (!rewritten || rewritten === location) return previewResponse('The public source returned an unexpected redirect.', 502, {}, request.method);
      return previewResponse(null, upstream.status, { Location: rewritten }, request.method);
    }
    const headers = safeUpstreamHeaders(upstream);
    let body = request.method === 'HEAD' ? null : upstream.body;
    if (plan.searchPage && body) {
      try { body = await readBoundedText(body, SEARCH_HTML_LIMIT, upstream.headers.get('Content-Length')); }
      catch { return searchError(502); }
    }
    const response = new Response(body, { status: upstream.status, statusText: upstream.statusText, headers });
    if (request.method === 'HEAD' || !headers.get('Content-Type')?.toLowerCase().includes('text/html')) return response;
    if (bootstrapMode !== 'clear-google-redirect') return rewriteHtml(response, plan, Rewriter ?? HTMLRewriter);
    if (upstream.status !== 200) return response;
    try {
      const rewritten = rewriteHtml(response, plan, Rewriter ?? HTMLRewriter, { bootstrapMode });
      const html = await rewritten.text();
      return new Response(html, { status: response.status, statusText: response.statusText, headers });
    } catch {
      return previewResponse('Preview compatibility validation failed: unsupported Google Sites configuration.', 502, {}, request.method);
    }
  };
}

const handler = createHandler();
export default { fetch: handler };
