import { PreviewCompatibilityError, rewriteImageReferences } from '../vendor/logic.js';
import { makeImageStyleHandler, makeScriptHandler } from '../vendor/worker.js';
import { rewriteProductionUrl } from './plan.js';
import { rewriteSiteUrl } from '../vendor/logic.js';
import { clearEquivalentQueryConfig } from './config-query.js';
import { descriptionTag } from './readiness.js';
import { createDocumentInspector, attachDocumentInspection, createLanguageRewrite, FOOTER_GROUP } from './language-controls.js';
import { createHeaderLanguageRewrite, HEADER_ANCHOR } from './header-language-controls.js';
import { createRenderingInspector, attachRenderingInspection, attachRenderingRewrite } from './rendering-profile.js';

export function isExpectedSiteMarker(domain, name, site) {
  return domain === 'panamalegallab.com' && name === site.upstreamPrefix.split('/').at(-1);
}

export async function identifyPublicSite(html, site, Rewriter, { collectReadiness = false, renderPlan, onDocumentContext } = {}) {
  let identified = false;
  const inspector = collectReadiness ? createDocumentInspector(site.language) : null;
  const rendering = renderPlan?.kind === 'page' && !renderPlan.searchPage ? createRenderingInspector(renderPlan) : null;
  const rewriter = new Rewriter().on('[data-domain][data-sitename]', { element(element) {
    if (isExpectedSiteMarker(element.getAttribute('data-domain'), element.getAttribute('data-sitename'), site)) identified = true;
  } });
  if (inspector) attachDocumentInspection(rewriter, inspector);
  if (rendering) attachRenderingInspection(rewriter, rendering);
  await rewriter.transform(new Response(html)).text();
  if (inspector || rendering) onDocumentContext?.(Object.freeze({ ...inspector?.context(), rendering: rendering?.context() ?? null }));
  return identified;
}

// Request-local memoization avoids repeatedly parsing identical navigation/CSS
// values. Both limits bound memory even when public source attributes are unique.
export function createDeliveryValueRewriter(plan) {
  const cache = new Map();
  let characters = 0;
  return original => {
    if (cache.has(original)) return cache.get(original);
    const rewritten = rewriteImageReferences(plan.mode === 'production'
      ? rewriteProductionUrl(original) : rewriteSiteUrl(original, plan.previewOrigin));
    const size = (original?.length ?? 0) + (rewritten?.length ?? 0);
    if (cache.size < 512 && characters + size <= 65_536) {
      cache.set(original, rewritten);
      characters += size;
    }
    return rewritten;
  };
}

export function makeDeliveryAttributeHandler(name, plan, rewriteValue = createDeliveryValueRewriter(plan)) {
  return { element(element) {
    const original = element.getAttribute(name);
    const rewritten = rewriteValue(original);
    if (rewritten !== original) element.setAttribute(name, rewritten);
  } };
}

export async function rewritePageDocument(html, plan, Rewriter) {
  const rewriteValue = createDeliveryValueRewriter(plan);
  let configurations = 0;
  let compatibilityFailure = false;
  let scriptBuffer = '';
  const scripts = makeScriptHandler(plan, { bootstrapMode: 'clear-google-redirect', onConfigValidated() { configurations += 1; } });
  const guardedScripts = { text(chunk) {
    const original = scriptBuffer + chunk.text;
    if (original.length > 512_000) throw new Error('Inline source exceeds delivery limit');
    scriptBuffer = chunk.lastInTextNode ? '' : original;
    try { scripts.text(chunk); }
    catch (error) {
      if (!(error instanceof PreviewCompatibilityError)) throw error;
      try {
        chunk.replace(clearEquivalentQueryConfig(original, plan), { html: true });
        configurations += 1;
      } catch (retryError) {
        if (!(retryError instanceof PreviewCompatibilityError)) throw retryError;
        compatibilityFailure = true;
        chunk.remove();
      }
    }
  } };
  const metadata = descriptionTag(plan.readinessPolicy, plan.documentContext);
  const language = createLanguageRewrite(plan.readinessPolicy, plan.documentContext);
  const headerLanguage = createHeaderLanguageRewrite(plan.readinessPolicy, plan.documentContext);
  const canonical = plan.canonical.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const rewriter = new Rewriter()
    .on('head', { element(element) { element.append(`<link rel="canonical" href="${canonical}">${metadata}`, { html: true }); } })
    .on('link[rel~="canonical"]', { element(element) { element.remove(); } })
    .on('meta[property="og:url"], meta[itemprop="url"]', { element(element) { element.setAttribute('content', plan.canonical); } })
    .on('script:not([src])', guardedScripts)
    .on('style', makeImageStyleHandler())
    .on('meta[property="og:image"], meta[itemprop="image"], meta[itemprop="imageUrl"], meta[itemprop="thumbnailUrl"]', makeDeliveryAttributeHandler('content', plan, rewriteValue));
  if (metadata) rewriter.on('head meta[name]', { element(element) {
    if (element.getAttribute('name')?.toLowerCase() === 'description') element.remove();
  } });
  if (language) rewriter.on(FOOTER_GROUP, language.group).on(`${FOOTER_GROUP} a`, language.anchor);
  if (headerLanguage) rewriter.on(HEADER_ANCHOR, headerLanguage);
  attachRenderingRewrite(rewriter, plan);
  for (const attribute of ['href', 'src', 'srcset', 'style', 'action', 'data-url']) {
    rewriter.on(`[${attribute}]`, makeDeliveryAttributeHandler(attribute, plan, rewriteValue));
  }
  rewriter.onDocument({ end() { if (configurations !== 1) compatibilityFailure = true; } });
  const rewritten = await rewriter.transform(new Response(html)).text();
  if (compatibilityFailure) throw new PreviewCompatibilityError();
  return rewritten;
}
