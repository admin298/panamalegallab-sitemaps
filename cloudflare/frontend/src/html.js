import { PreviewCompatibilityError, rewriteImageReferences } from '../vendor/logic.js';
import { makeImageStyleHandler, makeScriptHandler } from '../vendor/worker.js';
import { rewriteProductionUrl } from './plan.js';
import { rewriteSiteUrl } from '../vendor/logic.js';
import { clearEquivalentQueryConfig } from './config-query.js';

export function isExpectedSiteMarker(domain, name, site) {
  return domain === 'panamalegallab.com' && name === site.upstreamPrefix.split('/').at(-1);
}

export async function identifyPublicSite(html, site, Rewriter) {
  let identified = false;
  const response = new Rewriter().on('[data-domain][data-sitename]', { element(element) {
    if (isExpectedSiteMarker(element.getAttribute('data-domain'), element.getAttribute('data-sitename'), site)) identified = true;
  } }).transform(new Response(html));
  await response.text();
  return identified;
}

export function makeDeliveryAttributeHandler(name, plan) {
  return { element(element) {
    const original = element.getAttribute(name);
    const rewritten = rewriteImageReferences(plan.mode === 'production'
      ? rewriteProductionUrl(original) : rewriteSiteUrl(original, plan.previewOrigin));
    if (rewritten !== original) element.setAttribute(name, rewritten);
  } };
}

export async function rewritePageDocument(html, plan, Rewriter) {
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
  const canonical = plan.canonical.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const rewriter = new Rewriter()
    .on('head', { element(element) { element.append(`<link rel="canonical" href="${canonical}">`, { html: true }); } })
    .on('link[rel~="canonical"]', { element(element) { element.remove(); } })
    .on('meta[property="og:url"], meta[itemprop="url"]', { element(element) { element.setAttribute('content', plan.canonical); } })
    .on('script:not([src])', guardedScripts)
    .on('style', makeImageStyleHandler())
    .on('meta[property="og:image"], meta[itemprop="image"], meta[itemprop="imageUrl"], meta[itemprop="thumbnailUrl"]', makeDeliveryAttributeHandler('content', plan));
  for (const attribute of ['href', 'src', 'srcset', 'style', 'action', 'data-url']) {
    rewriter.on(`[${attribute}]`, makeDeliveryAttributeHandler(attribute, plan));
  }
  rewriter.onDocument({ end() { if (configurations !== 1) compatibilityFailure = true; } });
  const rewritten = await rewriter.transform(new Response(html)).text();
  if (compatibilityFailure) throw new PreviewCompatibilityError();
  return rewritten;
}
