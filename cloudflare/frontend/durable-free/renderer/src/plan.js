import { SITES } from '../vendor/logic.js';
import { KNOWN_PATHS, REDIRECTS } from '../vendor/routes-data.js';
import { planSearchRequest } from '../vendor/search.js';

const HOME_ALIASES = Object.freeze({ es: 'inicio', en: 'home', fr: 'accueil', it: 'inizio' });
const PREVIEW_DOMAIN = 'pll-seo-preview-20261102.pages.dev';
const encoder = new TextEncoder();
const normalizePath = path => path.replace(/%[0-9a-f]{2}/gi, value => value.toUpperCase());

function error(context, status) { return { ...context, kind: 'error', status }; }

function previewHost(host, root) {
  if (host === root) return true;
  if (!host.endsWith(`.${root}`)) return false;
  const label = host.slice(0, -root.length - 1);
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label);
}

function unsafeInput(input) {
  const rawPath = input.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i)?.[1] ?? '';
  if (/[\\\u0000-\u001f\u007f-\u009f]/u.test(rawPath)
    || /%(?:2f|5c|2e|25)/i.test(rawPath)
    || rawPath.split('/').some(part => part === '.' || part === '..')) return true;
  try {
    const decoded = decodeURIComponent(rawPath);
    return /[\\\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(decoded);
  } catch { return true; }
}

function contextFor(url, options) {
  const sites = options.sites ?? SITES;
  const site = Object.values(sites).find(candidate => candidate.productionHost === url.hostname);
  const isPreview = previewHost(url.hostname, options.previewDomain ?? PREVIEW_DOMAIN);
  if (!site && !isPreview) return null;
  return { mode: site ? 'production' : 'preview', site,
    previewOrigin: url.origin, indexable: Boolean(site) };
}

function searchPlan(url, method, context) {
  const native = context.site && url.pathname === '/_/search';
  const path = native ? `/search${context.site.upstreamPrefix}` : url.pathname;
  let result;
  try { result = planSearchRequest(`${url.origin}${path}${url.search}`, method); }
  catch { return error({ ...context, indexable: false }, 400); }
  if (!result) return null;
  if (context.mode === 'production' && result.site.language !== context.site.language) return error({ ...context, indexable: false }, 404);
  return { ...result, ...context, site: result.site, indexable: false,
    previewPage: native ? `${url.origin}/_/search${new URL(result.upstream).search}` : result.previewPage };
}

function contentPlan(url, context, options) {
  const match = context.mode === 'preview' ? url.pathname.match(/^\/(es|en|fr|it)(\/.*)?$/) : null;
  if (context.mode === 'preview' && !match) return error(context, 404);
  const site = context.site ?? (options.sites ?? SITES)[match[1]];
  const path = normalizePath(context.mode === 'preview' ? match[2] ?? '/' : url.pathname);
  if (path === '/_' || path.startsWith('/_/') || path === '/search' || path.startsWith('/search/')) return error(context, 404);
  const target = (options.redirects ?? REDIRECTS)[`${site.productionOrigin}${path}`];
  if (target) return { ...context, site, kind: 'redirect', status: 301, location: `${target}${url.search}` };
  if (context.mode === 'preview' && !(options.knownPaths ?? KNOWN_PATHS)[site.language].includes(path)) return error(context, 404);
  const preferredPath = path === `/${site.homeAlias ?? HOME_ALIASES[site.language]}` ? '/' : path;
  return { ...context, site, kind: 'page', path, upstream: `${site.upstreamRoot}${path}${url.search}`,
    canonical: `${site.productionOrigin}${preferredPath}`, previewPage: `${url.origin}${url.pathname}${url.search}` };
}

function httpPlan(url, method, context, options) {
  if (context.mode === 'preview' || !['GET', 'HEAD'].includes(method)) return error(context, 400);
  const target = (options.redirects ?? REDIRECTS)[`${context.site.productionOrigin}${normalizePath(url.pathname)}`];
  return { ...context, kind: 'redirect', status: 301, location: `${target ?? `${context.site.productionOrigin}${url.pathname}`}${url.search}` };
}

export function planDeliveryRequest(input, method = 'GET', options = {}) {
  let url;
  try { url = new URL(input); } catch { return { kind: 'error', status: 400, indexable: false }; }
  const context = contextFor(url, options);
  if (!context || url.port) return { kind: 'error', status: 421, indexable: false };
  if (encoder.encode(input).byteLength > 8192 || encoder.encode(url.pathname).byteLength > 4096) return error(context, 414);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || unsafeInput(input)) return error(context, 400);
  if (url.protocol === 'http:') return httpPlan(url, method, context, options);
  const search = searchPlan(url, method, context);
  if (search) return search;
  if (!['GET', 'HEAD'].includes(method)) return error(context, 405);
  if (url.pathname === '/robots.txt') return { ...context, kind: 'robots' };
  if (url.pathname === '/sitemap.xml') return { ...context, kind: 'redirect', status: 301, location: 'https://sitemaps.panamalegallab.com/sitemap-index.xml' };
  if (context.mode === 'preview' && url.pathname === '/') return { ...context, kind: 'index' };
  return contentPlan(url, context, options);
}

function productionTarget(url, sites) {
  if (!['http:', 'https:'].includes(url.protocol) || url.port || url.username || url.password) return null;
  const site = Object.values(sites).find(candidate => url.hostname === candidate.productionHost
    || (url.origin === 'https://sites.google.com'
      && (url.pathname === candidate.upstreamPrefix || url.pathname.startsWith(`${candidate.upstreamPrefix}/`))));
  if (!site) return null;
  const path = url.hostname === site.productionHost ? url.pathname : url.pathname.slice(site.upstreamPrefix.length) || '/';
  return `${site.productionOrigin}${path}${url.search}${url.hash}`;
}

export function rewriteProductionUrl(value, sites = SITES) {
  if (!value || value.startsWith('#')) return value;
  let url;
  try { url = new URL(value, 'https://sites.google.com'); } catch { return value; }
  const direct = productionTarget(url, sites);
  if (direct) return direct;
  if (url.origin !== 'https://www.google.com' || url.pathname !== '/url' || url.username || url.password || url.port) return value;
  const targets = url.searchParams.getAll('q');
  if (targets.length !== 1) return value;
  try { return productionTarget(new URL(targets[0]), sites) ?? value; } catch { return value; }
}
