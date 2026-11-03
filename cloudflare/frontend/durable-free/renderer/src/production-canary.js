// One isolated branch alias exercises production rendering while the request
// planner and response headers keep the normal preview isolation boundaries.
const CANARY_ORIGIN = 'https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';

export function isProductionCanary(plan) {
  return plan.mode === 'preview' && plan.indexable === false && plan.previewOrigin === CANARY_ORIGIN;
}

export function usesProductionRendering(plan) {
  return plan.mode === 'production' || isProductionCanary(plan);
}
