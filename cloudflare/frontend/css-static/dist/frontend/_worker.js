// src/boundary.js
var PREVIEW_DOMAIN = "pll-seo-preview-20261102.pages.dev";
var PRODUCTION_HOSTS = new Set(["www", "en", "fr", "it"].map((label) => `${label}.panamalegallab.com`));
var encoder = new TextEncoder();
function isPreview(host) {
  if (host === PREVIEW_DOMAIN) return true;
  if (!host.endsWith(`.${PREVIEW_DOMAIN}`)) return false;
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(host.slice(0, -PREVIEW_DOMAIN.length - 1));
}
function unsafePath(input) {
  const raw = input.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i)?.[1] ?? "";
  if (/[\\\u0000-\u001f\u007f-\u009f]/u.test(raw) || /%(?:2f|5c|2e|25)/i.test(raw) || raw.split("/").some((part) => part === "." || part === "..")) return true;
  try {
    return /[\\\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(decodeURIComponent(raw));
  } catch {
    return true;
  }
}
function requestBoundary(request) {
  const input = request.url;
  let url;
  try {
    url = new URL(input);
  } catch {
    return { allowed: false, preview: false, status: 400 };
  }
  const preview = isPreview(url.hostname);
  const context = { preview };
  if (!PRODUCTION_HOSTS.has(url.hostname) && !preview || url.port) return { ...context, allowed: false, status: 421 };
  if (encoder.encode(input).byteLength > 8192 || encoder.encode(url.pathname).byteLength > 4096)
    return { ...context, allowed: false, status: 414 };
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || unsafePath(input))
    return { ...context, allowed: false, status: 400 };
  return { ...context, allowed: true };
}
function boundaryResponse(context, method = "GET", status = context.status) {
  const temporary = status >= 500;
  return new Response(method === "HEAD" ? null : temporary ? "This page is temporarily unavailable. Please try again shortly." : "Request not available.", {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Type": "text/plain; charset=utf-8",
      ...context.preview ? { "X-Robots-Tag": "noindex, nofollow" } : {},
      ...temporary ? { "Retry-After": "60" } : {}
    }
  });
}
var temporaryResponse = (context, method) => boundaryResponse(context, method, 503);

// src/mobile-signal.js
function normalizedMobileSignal(request) {
  const hint = request.headers.get("Sec-CH-UA-Mobile");
  if (hint === "?1" || hint === "?0") return hint === "?1" ? "1" : "0";
  const agent = request.headers.get("User-Agent") ?? "";
  return agent.length <= 512 && /Mobile|iPhone|iPod/iu.test(agent) ? "1" : "0";
}

// src/frontend.js
var OBJECT_NAME = "pll-renderer-v1";
var FORWARDED_HEADERS = Object.freeze([
  "Origin",
  "Referer",
  "Sec-Fetch-Site",
  "Content-Type",
  "Content-Length",
  "Content-Encoding",
  "CF-Connecting-IP"
]);
async function handleThinRequest(request, env) {
  const boundary = requestBoundary(request);
  if (!boundary.allowed) return boundaryResponse(boundary, request.method);
  try {
    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
      if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    }
    headers.set("X-PLL-Mobile", normalizedMobileSignal(request));
    const forwarded = new Request(request.url, {
      method: request.method,
      headers,
      redirect: "manual",
      ...!["GET", "HEAD"].includes(request.method) ? { body: request.body, duplex: "half" } : {}
    });
    const namespace = env.PLL_RENDERER;
    const stub = namespace.get(namespace.idFromName(OBJECT_NAME));
    return await stub.fetch(forwarded);
  } catch {
    return temporaryResponse(boundary, request.method);
  }
}
var frontend_default = { fetch: handleThinRequest };
export {
  frontend_default as default
};
