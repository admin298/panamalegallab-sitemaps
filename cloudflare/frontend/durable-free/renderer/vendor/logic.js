import { KNOWN_PATHS, REDIRECTS } from './routes-data.js';

export const SITES = Object.freeze(Object.fromEntries([
  ['es', 'panamalegallab', 'www'],
  ['en', 'panamlegallab-en', 'en'],
  ['fr', 'panamlegallab-fr', 'fr'],
  ['it', 'panamlegallab-it', 'it'],
].map(([language, slug, host]) => [language, Object.freeze({
  language,
  upstreamRoot: `https://sites.google.com/panamalegallab.com/${slug}`,
  upstreamPrefix: `/panamalegallab.com/${slug}`,
  productionHost: `${host}.panamalegallab.com`,
  productionOrigin: `https://${host}.panamalegallab.com`,
})])));

export const normalizePath = path => path.replace(/%[0-9a-f]{2}/gi, code => code.toUpperCase());

export function rewriteImageReferences(value) {
  if (!value) return value;
  return value.replaceAll('https://sites.google.com/sitesv-images-rt/',
    'https://lh7-us.googleusercontent.com/sitesv-images-rt/');
}

export function rewriteKnownImagePreloader(text) {
  const source = String.raw`https:\/\/sites.google.com\/sitesv-images-rt\/`;
  const cdn = String.raw`https:\/\/lh7-us.googleusercontent.com\/sitesv-images-rt\/`;
  if (!text.trimStart().startsWith("const imageUrl = '" + source)
    || !text.includes('function bgImgLoaded()') || !text.includes('globals.headerBgImgLoaded')) return text;
  return text.replace(source, cdn);
}

function unsafePath(input) {
  const rawPath = input.match(/^https?:\/\/[^/?#]*(\/[^?#]*)?/i)?.[1] ?? '';
  if (/[\\\u0000-\u001f\u007f]/.test(rawPath) || /%(?:2f|5c|2e|25)/i.test(rawPath)) return true;
  if (rawPath.split('/').some(part => part === '.' || part === '..')) return true;
  try { decodeURIComponent(rawPath); return false; } catch { return true; }
}

export function planRequest(input) {
  let url;
  try { url = new URL(input); } catch { return { kind: 'error', status: 400 }; }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const preview = ['.workers.dev', '.pages.dev'].some(suffix => url.hostname.endsWith(suffix));
  if (!(preview || local)) return { kind: 'forbidden-host', status: 421 };
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || unsafePath(input)) {
    return { kind: 'error', status: 400 };
  }
  if (!local && url.protocol !== 'https:') return { kind: 'error', status: 400 };
  if (url.pathname === '/') return { kind: 'index' };
  if (url.pathname === '/robots.txt') return { kind: 'robots' };
  const match = url.pathname.match(/^\/(es|en|fr|it)(\/.*)?$/);
  if (!match) return { kind: 'error', status: 404 };
  const site = SITES[match[1]];
  const path = normalizePath(match[2] ?? '/');
  const target = REDIRECTS[`${site.productionOrigin}${path}`];
  if (target) return { kind: 'redirect', status: 301, location: `${target}${url.search}` };
  if (!KNOWN_PATHS[site.language].includes(path)) return { kind: 'error', status: 404 };
  return {
    kind: 'page', site, path,
    upstream: `${site.upstreamRoot}${path}${url.search}`,
    canonical: `${site.productionOrigin}${path}`,
    previewPage: `${url.origin}/${site.language}${path}${url.search}`,
    previewOrigin: url.origin,
  };
}

function approvedPreviewPath(parsed) {
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.port || parsed.username || parsed.password) return null;
  const site = Object.values(SITES).find(candidate => {
    if (parsed.hostname === candidate.productionHost) return true;
    return parsed.origin === 'https://sites.google.com'
      && (parsed.pathname === candidate.upstreamPrefix || parsed.pathname.startsWith(`${candidate.upstreamPrefix}/`));
  });
  if (!site) return null;
  const prefix = parsed.hostname === site.productionHost ? '' : site.upstreamPrefix;
  const path = parsed.pathname.slice(prefix.length) || '/';
  return `/${site.language}${path}${parsed.search}${parsed.hash}`;
}

export function rewriteSiteUrl(value, previewOrigin) {
  if (!value || value.startsWith('#')) return value;
  let parsed;
  try { parsed = new URL(value, 'https://sites.google.com'); } catch { return value; }
  const direct = approvedPreviewPath(parsed);
  if (direct) return direct;
  if (parsed.origin !== 'https://www.google.com' || parsed.pathname !== '/url'
    || parsed.username || parsed.password) return value;
  const targets = parsed.searchParams.getAll('q');
  if (targets.length !== 1) return value;
  try { return approvedPreviewPath(new URL(targets[0])) ?? value; } catch { return value; }
}

export function rewriteBootstrapConfig(text, upstreamPage, previewPage) {
  if (!text.trimStart().startsWith('_at_config =')) return text;
  const replacement = JSON.stringify(previewPage).replaceAll('<', '\\u003c');
  return text.replace(/"(?:\\.|[^"\\])*"/g, token => {
    try { return JSON.parse(token) === upstreamPage ? replacement : token; } catch { return token; }
  });
}

export class PreviewCompatibilityError extends Error {
  constructor(message = 'Unsupported Google Sites configuration.') {
    super(message);
    this.name = 'PreviewCompatibilityError';
  }
}

export function arrayElementSpan(json, wantedIndex) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  let index = 0;
  let start = 1;
  for (let offset = 0; offset < json.length; offset += 1) {
    const char = json[offset];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === '[' || char === '{') { depth += 1; continue; }
    if (char === ']' || char === '}') {
      if (depth === 1 && index === wantedIndex) return { start, end: offset };
      depth -= 1;
      continue;
    }
    if (char === ',' && depth === 1) {
      if (index === wantedIndex) return { start, end: offset };
      index += 1;
      start = offset + 1;
    }
  }
  throw new PreviewCompatibilityError();
}

function leadingArrayEnd(source) {
  if (source[0] !== '[') throw new PreviewCompatibilityError();
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let offset = 0; offset < source.length; offset += 1) {
    const char = source[offset];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === '[' || char === '{') depth += 1;
    if (char === ']' || char === '}') {
      depth -= 1;
      if (depth === 0) return offset + 1;
    }
  }
  throw new PreviewCompatibilityError();
}

export function clearGoogleRedirectConfig(text, upstreamPage) {
  if (!/^\s*_at_config\s*=/.test(text)) return text;
  const assignment = /^(\s*_at_config\s*=\s*)/.exec(text);
  if (!assignment) throw new PreviewCompatibilityError();
  const remainder = text.slice(assignment[1].length);
  const end = leadingArrayEnd(remainder);
  const json = remainder.slice(0, end);
  const suffix = remainder.slice(end);
  if (!/^\s*;/.test(suffix) || /\b_at_config\s*=/.test(suffix)) throw new PreviewCompatibilityError();
  let config;
  try { config = JSON.parse(json); } catch { throw new PreviewCompatibilityError(); }
  if (!Array.isArray(config) || config.length !== 518 || config[212] !== 0 || config[316] !== upstreamPage) {
    throw new PreviewCompatibilityError();
  }
  const span = arrayElementSpan(json, 316);
  const token = json.slice(span.start, span.end);
  const leading = token.match(/^\s*/)[0];
  const trailing = token.match(/\s*$/)[0];
  return assignment[1] + json.slice(0, span.start) + leading + 'null' + trailing
    + json.slice(span.end) + suffix;
}

export function createQuota(limit = 600, duration = 60_000) {
  let state = Object.freeze({ window: -1, count: 0 });
  return now => {
    const window = Math.floor(now / duration);
    const count = state.window === window ? state.count + 1 : 1;
    state = Object.freeze({ window, count });
    return count <= limit;
  };
}
