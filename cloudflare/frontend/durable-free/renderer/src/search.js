import { relaySearchPost } from './search-protocol.js';
import { rewriteProductionUrl } from './plan.js';
import { usesProductionRendering } from './production-canary.js';

export async function relayDeliverySearch(request, plan, options) {
  const response = await relaySearchPost(request, plan,
    { ...options, ...(usesProductionRendering(plan) ? { rewriteUrl: value => rewriteProductionUrl(value) } : {}) });
  if (!usesProductionRendering(plan) || response.status < 500) return response;
  return new Response('Public search is temporarily unavailable.', { status: 503, headers: response.headers });
}
