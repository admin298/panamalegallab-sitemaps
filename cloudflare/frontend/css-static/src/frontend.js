import { requestBoundary, boundaryResponse, temporaryResponse } from './boundary.js';

export const OBJECT_NAME = 'pll-renderer-v1';
const FORWARDED_HEADERS = Object.freeze(['Origin', 'Referer', 'Sec-Fetch-Site', 'Content-Type',
  'Content-Length', 'Content-Encoding', 'CF-Connecting-IP']);

export async function handleThinRequest(request, env) {
  const boundary = requestBoundary(request);
  if (!boundary.allowed) return boundaryResponse(boundary, request.method);
  try {
    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
      if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    }
    const forwarded = new Request(request.url, { method: request.method, headers, redirect: 'manual',
      ...(!['GET', 'HEAD'].includes(request.method) ? { body: request.body, duplex: 'half' } : {}) });
    const namespace = env.PLL_RENDERER;
    // Failed Durable Object stubs cannot be reused; obtain one on every request.
    const stub = namespace.get(namespace.idFromName(OBJECT_NAME));
    return await stub.fetch(forwarded);
  } catch { return temporaryResponse(boundary, request.method); }
}

export default { fetch: handleThinRequest };
