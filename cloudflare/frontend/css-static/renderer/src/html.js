import { PreviewCompatibilityError, rewriteImageReferences } from '../vendor/logic.js';
import { makeImageStyleHandler, makeScriptHandler } from '../vendor/worker.js';
import { rewriteProductionUrl } from './plan.js';
import { rewriteSiteUrl } from '../vendor/logic.js';
import { clearEquivalentQueryConfig } from './config-query.js';
import { CURRENT_VIEW_SCRIPTS } from './current-config-contract.js';
import { descriptionTag } from './readiness.js';
import { createDocumentInspector, attachDocumentInspection, createLanguageRewrite, FOOTER_GROUP } from './language-controls.js';
import { createHeaderLanguageRewrite, HEADER_ANCHOR } from './header-language-controls.js';
import { createRenderingInspector, attachRenderingInspection, attachRenderingRewrite } from './rendering-profile.js';
import { usesProductionRendering } from './production-canary.js';

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
    // CSS declarations and explicit data/mail/tel schemes cannot become an
    // approved HTTP Site URL. Ambiguous syntax still uses the URL parser.
    const nonHttpScheme = typeof original === 'string' && /^(?!https?:)[a-z][a-z0-9+.-]*:/iu.test(original);
    const rewritten = rewriteImageReferences(nonHttpScheme ? original : usesProductionRendering(plan)
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

export function createCoreDocumentRewriter(plan, Rewriter, options = {}) {
  const rewriteValue = options.rewriteValue ?? createDeliveryValueRewriter(plan);
  let configurations = 0;
  let compatibilityFailure = false;
  let scriptBuffer = '';
  let deferredError = null;
  let nativeContract = { extended: false, views: 0, matchingView: false, viewNonce: null,
    configNonce: null, inlineNonce: null, inlineTypeValid: false, configTypeValid: false };
  const validScriptType = element => element.getAttribute('type') === null
    || element.getAttribute('type')?.toLowerCase() === 'text/javascript';
  const validNonce = value => typeof value === 'string' && /^[A-Za-z0-9+/_-]{8,256}={0,2}$/u.test(value);
  const nativeView = { element(element) {
    const src = element.getAttribute('src') ?? '';
    if (!src.startsWith('https://www.gstatic.com/_/atari/_/js/') || !src.includes('/m=view')) return;
    nativeContract = { ...nativeContract, views: nativeContract.views + 1,
      matchingView: src === CURRENT_VIEW_SCRIPTS[plan.site.language] && validScriptType(element),
      viewNonce: element.getAttribute('nonce') };
  } };
  const protect = handler => options.deferErrors ? Object.fromEntries(Object.entries(handler).map(([name, callback]) => [name, (...args) => {
    if (deferredError) return;
    try { callback(...args); } catch (error) { deferredError = error; }
  }])) : handler;
  const scripts = makeScriptHandler(plan, { bootstrapMode: 'clear-google-redirect', onConfigValidated() { configurations += 1; } });
  const guardedScripts = { element(element) {
    nativeContract = { ...nativeContract, inlineNonce: element.getAttribute('nonce'),
      inlineTypeValid: validScriptType(element) };
  }, text(chunk) {
    const original = scriptBuffer + chunk.text;
    if (original.length > 512_000) throw new Error('Inline source exceeds delivery limit');
    scriptBuffer = chunk.lastInTextNode ? '' : original;
    try { scripts.text(chunk); }
    catch (error) {
      if (!(error instanceof PreviewCompatibilityError)) throw error;
      try {
        chunk.replace(clearEquivalentQueryConfig(original, plan, { onExtendedValidated() {
          nativeContract = { ...nativeContract, extended: true, configNonce: nativeContract.inlineNonce,
            configTypeValid: nativeContract.inlineTypeValid };
        } }), { html: true });
        configurations += 1;
      } catch (retryError) {
        if (!(retryError instanceof PreviewCompatibilityError)) throw retryError;
        compatibilityFailure = true;
        chunk.remove();
      }
    }
  } };
  const metadata = options.metadata ?? descriptionTag(plan.readinessPolicy, plan.documentContext);
  const language = createLanguageRewrite(plan.readinessPolicy, plan.documentContext);
  const headerLanguage = createHeaderLanguageRewrite(plan.readinessPolicy, plan.documentContext);
  const canonical = plan.canonical.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const canonicalTag = `<link rel="canonical" href="${canonical}">`;
  const rewriter = (options.rewriter ?? new Rewriter())
    .on('head', { element(element) { element.append(canonicalTag + (options.headExtra ? options.headExtra(canonicalTag) : metadata), { html: true }); } })
    .on('link[rel~="canonical"]', { element(element) { element.remove(); } })
    .on('meta[property="og:url"], meta[itemprop="url"]', { element(element) { element.setAttribute('content', plan.canonical); } })
    .on('script:not([src])', protect(guardedScripts))
    .on('script[src]', protect(nativeView))
    .on('style', protect(makeImageStyleHandler()))
    .on('meta[property="og:image"], meta[itemprop="image"], meta[itemprop="imageUrl"], meta[itemprop="thumbnailUrl"]', makeDeliveryAttributeHandler('content', plan, rewriteValue));
  if (metadata) rewriter.on('head meta[name]', options.descriptionHandler ?? { element(element) {
    if (element.getAttribute('name')?.toLowerCase() === 'description') element.remove();
  } });
  if (language) rewriter.on(FOOTER_GROUP, language.group).on(`${FOOTER_GROUP} a`, language.anchor);
  if (headerLanguage) rewriter.on(HEADER_ANCHOR, headerLanguage);
  if (options.rendering !== false) attachRenderingRewrite(rewriter, plan);
  for (const attribute of ['href', 'src', 'srcset', 'style', 'action', 'data-url']) {
    rewriter.on(`[${attribute}]`, makeDeliveryAttributeHandler(attribute, plan, rewriteValue));
  }
  rewriter.onDocument({ end() { if (configurations !== 1) compatibilityFailure = true; } });
  return { rewriter, validate() {
    if (deferredError) throw deferredError;
    const unsupportedExtended = nativeContract.extended && (nativeContract.views !== 1 || !nativeContract.matchingView
      || !nativeContract.configTypeValid || !validNonce(nativeContract.configNonce)
      || nativeContract.configNonce !== nativeContract.viewNonce);
    if (compatibilityFailure || unsupportedExtended) throw new PreviewCompatibilityError();
  } };
}

export async function rewritePageDocument(html, plan, Rewriter) {
  const { rewriter, validate } = createCoreDocumentRewriter(plan, Rewriter);
  const rewritten = await rewriter.transform(new Response(html)).text();
  validate();
  return rewritten;
}
