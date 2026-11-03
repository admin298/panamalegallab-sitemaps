import rawData from '../data/readiness.json' with { type: 'json' };
import { isProductionCanary } from './production-canary.js';

const descriptions = Object.freeze(Object.fromEntries(Object.entries(rawData.descriptions)
  .map(([url, row]) => [url, Object.freeze({ ...row })])));
const links = Object.freeze(Object.fromEntries(Object.entries(rawData.languageLinks)
  .map(([url, row]) => [url, Object.freeze({ ...row, alternatives: Object.freeze({ ...row.alternatives }) })])));
const DATA = Object.freeze({ descriptions, languageLinks: links });

const HOME_ALIASES = Object.freeze({ es: '/inicio', en: '/home', fr: '/accueil', it: '/inizio' });

export function selectReadinessPolicy(plan, data = DATA) {
  const productionPolicy = plan.mode === 'production' && plan.indexable === true || isProductionCanary(plan);
  if (plan.kind !== 'page' || !productionPolicy || plan.searchPage
    || (plan.canonical !== `${plan.site?.productionOrigin}${plan.path}`
      && !(plan.canonical === `${plan.site?.productionOrigin}/` && plan.path === HOME_ALIASES[plan.site.language]))) return null;
  const row = data.languageLinks[plan.canonical];
  if (!row || row.language !== plan.site.language) return null;
  const description = data.descriptions[plan.canonical];
  if (description && description.language !== row.language) return null;
  return Object.freeze({ language: row.language, alternatives: row.alternatives,
    description: description?.text ?? null });
}

export function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll("'", '&#39;');
}

export function descriptionTag(policy, context) {
  return policy?.description && context?.siteLanguage === policy.language
    ? `<meta name="description" content="${escapeAttribute(policy.description)}">` : '';
}
