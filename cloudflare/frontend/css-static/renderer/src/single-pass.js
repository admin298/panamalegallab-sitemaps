import { isExpectedSiteMarker, createCoreDocumentRewriter, createDeliveryValueRewriter } from './html.js';
import { createDocumentInspector, attachDocumentInspection } from './language-controls.js';
import { createRenderingInspector, attachRenderingInspection } from './rendering-profile.js';
import { createDeferredMarkers } from './deferred-markers.js';
import { createDeferredFeatures } from './deferred-features.js';

// Inspect original tokens and apply context-independent core edits in one
// traversal. The output remains private until EOF and the transactional commit.
export async function rewriteValidatedDocument(html, plan, Rewriter) {
  let identified = false;
  const inspector = plan.readinessPolicy ? createDocumentInspector(plan.site.language) : null;
  const rendering = plan.kind === 'page' && !plan.searchPage ? createRenderingInspector(plan) : null;
  const staged = createDeferredMarkers(html);
  const rewriteValue = createDeliveryValueRewriter(plan);
  const features = createDeferredFeatures(plan, staged, rewriteValue);
  const rewriter = new Rewriter().on('[data-domain][data-sitename]', { element(element) {
    if (isExpectedSiteMarker(element.getAttribute('data-domain'), element.getAttribute('data-sitename'), plan.site)) identified = true;
  } });
  if (inspector) attachDocumentInspection(rewriter, inspector);
  if (rendering) attachRenderingInspection(rewriter, rendering);
  features.attach(rewriter);
  const core = createCoreDocumentRewriter(plan, Rewriter,
    { ...features.coreOptions, rewriter, rewriteValue, deferErrors: true });
  const serialized = await rewriter.transform(new Response(html)).text();
  if (!identified) return { identified: false };
  try {
    core.validate();
    const context = Object.freeze({ ...inspector?.context(), rendering: rendering?.context() ?? null });
    return { identified: true, html: staged.commit(serialized, features.resolver(context)) };
  } catch (error) { return { identified: true, error }; }
}
