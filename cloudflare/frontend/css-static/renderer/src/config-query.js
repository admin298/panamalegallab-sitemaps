import { SITES, PreviewCompatibilityError, arrayElementSpan, clearGoogleRedirectConfig } from '../vendor/logic.js';
import { isCurrentConfigShape } from './current-config-contract.js';

const invalidText = value => /[\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(value);

function fixedSourceBase(base, site) {
  if (!Object.values(SITES).some(candidate => candidate.upstreamRoot === site?.upstreamRoot
    && candidate.upstreamPrefix === site?.upstreamPrefix)) return false;
  let url;
  try { url = new URL(base); } catch { return false; }
  if (url.href !== base || url.origin !== 'https://sites.google.com' || url.username || url.password
    || url.port || url.hash || url.search) return false;
  return base === site.upstreamRoot || base.startsWith(`${site.upstreamRoot}/`)
    || base === `https://sites.google.com/search${site.upstreamPrefix}`;
}

function decodeComponent(value) {
  const decoded = decodeURIComponent(value.replaceAll('+', ' '));
  if (invalidText(decoded)) throw new URIError('Invalid query text.');
  return decoded;
}

function orderedPairs(query) {
  if (!query) return [];
  return query.split('&').map(field => {
    if (!field) throw new URIError('Empty query segment.');
    const equals = field.indexOf('=');
    return [decodeComponent(equals < 0 ? field : field.slice(0, equals)),
      decodeComponent(equals < 0 ? '' : field.slice(equals + 1))];
  });
}

export function equivalentSourceQuery(actual, expected, site) {
  if (typeof actual !== 'string' || typeof expected !== 'string'
    || actual.includes('#') || expected.includes('#') || invalidText(actual) || invalidText(expected)) return false;
  const actualStart = actual.indexOf('?');
  const expectedStart = expected.indexOf('?');
  const actualBase = actualStart < 0 ? actual : actual.slice(0, actualStart);
  const expectedBase = expectedStart < 0 ? expected : expected.slice(0, expectedStart);
  if (actualBase !== expectedBase || !fixedSourceBase(expectedBase, site)) return false;
  try {
    const actualPairs = orderedPairs(actualStart < 0 ? '' : actual.slice(actualStart + 1));
    const expectedPairs = orderedPairs(expectedStart < 0 ? '' : expected.slice(expectedStart + 1));
    return actualPairs.length === expectedPairs.length && actualPairs.every(([key, value], index) =>
      key === expectedPairs[index][0] && value === expectedPairs[index][1]);
  } catch { return false; }
}

function reviewedExtendedRedirectSpan(remainder, actual) {
  try {
    // Four native-language captures on 2026-11-06 retain the previous field
    // positions and append field519=0. Other extensions remain unsupported.
    const last = arrayElementSpan(remainder, 518);
    const json = remainder.slice(0, last.end + 1), suffix = remainder.slice(last.end + 1);
    if (!/^\s*;/.test(suffix) || /\b_at_config\s*=/.test(suffix)) return null;
    const config = JSON.parse(json);
    if (!isCurrentConfigShape(config, actual)) return null;
    return arrayElementSpan(json, 316);
  } catch { return null; }
}

export function clearEquivalentQueryConfig(text, plan, { onExtendedValidated } = {}) {
  const assignment = /^\s*_at_config\s*=\s*/.exec(text);
  if (!assignment) throw new PreviewCompatibilityError();
  const remainder = text.slice(assignment[0].length);
  let actual;
  try {
    const span = arrayElementSpan(remainder, 316);
    actual = JSON.parse(remainder.slice(span.start, span.end));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof PreviewCompatibilityError) throw new PreviewCompatibilityError();
    throw error;
  }
  if (!equivalentSourceQuery(actual, plan.upstream, plan.site)) throw new PreviewCompatibilityError();
  const extended = reviewedExtendedRedirectSpan(remainder, actual);
  if (extended) {
    const token = remainder.slice(extended.start, extended.end);
    const leading = /^\s*/.exec(token)[0], trailing = /\s*$/.exec(token)[0];
    onExtendedValidated?.();
    return assignment[0] + remainder.slice(0, extended.start) + leading + 'null' + trailing
      + remainder.slice(extended.end);
  }
  return clearGoogleRedirectConfig(text, actual);
}
