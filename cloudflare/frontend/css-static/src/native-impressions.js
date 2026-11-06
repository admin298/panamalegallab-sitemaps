import { arrayElementSpan, SITES } from '../renderer/vendor/logic.js';
import { elementAttributes } from './html-spans.js';
import { CURRENT_VIEW_SCRIPTS, isCurrentConfigShape } from '../renderer/src/current-config-contract.js';

// Retain the reviewed 2026-11-05 bundles and pair the 2026-11-06 bundles from
// the shared contract with their519schema. Field357 selects only the native
// Google Sites impression service; GA4/bootstrap endpoints remain unchanged.
export const IMPRESSION_VIEW_SCRIPTS = Object.freeze({
  es: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.es.qy5mfCdpnEs.O/am=AAAAGAAE/d=1/rs=AGEqA5myW6a9fBZOxA6oOP-YGbdeAZqtvw/m=view',
  en: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.en_US.CY2eaMNW2S0.O/am=AAAAGAAE/d=1/rs=AGEqA5kb6BcqE8ZiALmvuVdjL4tgdVXDVw/m=view',
  fr: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.fr.n7p6j6I-UBA.O/am=AAAAGAAE/d=1/rs=AGEqA5mTu1u34PhOtTHK1HLqd4to_aHlsQ/m=view',
  it: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.it.L62eI84RIxw.O/am=AAAAGAAE/d=1/rs=AGEqA5lO7vpeB4msuV03jy7XAwfq28rwfA/m=view',
});
export const CURRENT_IMPRESSION_VIEW_SCRIPTS = CURRENT_VIEW_SCRIPTS;
const PREVIEW = 'https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const noncePattern = /^[A-Za-z0-9+/_-]{8,256}={0,2}$/u;
const normalizedMode = mode => ['preview', 'all'].includes(mode) ? mode : 'off';

export function impressionCacheRevision(mode) {
  return 'pll-html-memory-v1-impressions-v1-' + normalizedMode(mode);
}

export function impressionPolicyEnabled(request, mode, plan) {
  if (request.method !== 'GET' || normalizedMode(mode) === 'off' || plan?.kind !== 'page' || plan.searchPage) return false;
  if (plan.mode === 'production') return mode === 'all';
  if (plan.mode !== 'preview' || plan.previewOrigin !== PREVIEW) return false;
  const values = new URL(request.url).searchParams.getAll('_pll_native_impressions');
  return values.length === 0 || (values.length === 1 && values[0] === 'candidate');
}

export function impressionConfigEdit(script, version = 'legacy518') {
  if (typeof script !== 'string' || script.length > 512_000) return null;
  const length = version === 'legacy518' ? 518 : version === 'current519' ? 519 : 0;
  if (!length) return null;
  const assignment = /^(\s*_at_config\s*=\s*)/u.exec(script);
  if (!assignment) return null;
  try {
    const remainder = script.slice(assignment[1].length);
    if (remainder[0] !== '[') return null;
    const last = arrayElementSpan(remainder, length - 1), json = remainder.slice(0, last.end + 1);
    const suffix = remainder.slice(last.end + 1);
    if (!/^\s*;/u.test(suffix) || /\b_at_config\s*=/u.test(suffix)) return null;
    const config = JSON.parse(json);
    const shape = version === 'current519' ? isCurrentConfigShape(config, null)
      : Array.isArray(config) && config.length === 518 && config[212] === 0 && config[316] === null;
    if (!shape
      || ![null, false, true].includes(config[356])) return null;
    const span = arrayElementSpan(json, 356), token = json.slice(span.start, span.end);
    const leading = /^\s*/u.exec(token)[0].length, trailing = /\s*$/u.exec(token)[0].length;
    return Object.freeze({ start: assignment[1].length + span.start + leading,
      end: assignment[1].length + span.end - trailing, replacement: 'true', changed: config[356] !== true });
  } catch { return null; }
}

export function impressionDocumentEdit(html, site, nonce, spans) {
  const expected = SITES[site?.language];
  if (!expected || site.upstreamPrefix !== expected.upstreamPrefix || site.productionHost !== expected.productionHost
    || !noncePattern.test(nonce) || !Array.isArray(spans)) return null;
  let viewCount = 0, configCount = 0, selectedVersion = null, configuration = null;
  for (const span of spans) {
    if (span.kind !== 'script') continue;
    const attrs = elementAttributes(html.slice(span.start, span.openEnd), 'script');
    if (!attrs) return null;
    const src = attrs.get('src')?.value;
    if (src !== undefined) {
      if (src.startsWith('https://www.gstatic.com/_/atari/_/js/') && src.includes('/m=view')) {
        if (attrs.get('nonce')?.value !== nonce) return null;
        if (src === IMPRESSION_VIEW_SCRIPTS[site.language]) selectedVersion = 'legacy518';
        else if (src === CURRENT_IMPRESSION_VIEW_SCRIPTS[site.language]) selectedVersion = 'current519';
        else return null;
        viewCount += 1;
      }
      continue;
    }
    const script = html.slice(span.openEnd, span.contentEnd);
    if (!/^\s*_at_config\s*=/u.test(script)) continue;
    if (attrs.get('nonce')?.value !== nonce || (attrs.has('type') && attrs.get('type').value.toLowerCase() !== 'text/javascript')) return null;
    configCount += 1;
    configuration = Object.freeze({ script, start: span.openEnd });
  }
  if (viewCount !== 1 || configCount !== 1) return null;
  const edit = impressionConfigEdit(configuration.script, selectedVersion);
  return edit ? Object.freeze({ ...edit, start: configuration.start + edit.start, end: configuration.start + edit.end }) : null;
}
