import { relaySearchPost } from './search-protocol.js';
import { rewriteProductionUrl } from './plan.js';

export async function relayDeliverySearch(request, plan, options) {
  const response = await relaySearchPost(request, plan,
    { ...options, ...(plan.mode === 'production' ? { rewriteUrl: value => rewriteProductionUrl(value) } : {}) });
  if (plan.mode !== 'production' || response.status < 500) return response;
  return new Response('Public search is temporarily unavailable.', { status: 503, headers: response.headers });
}
