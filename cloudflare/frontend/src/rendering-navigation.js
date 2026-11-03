import { rewriteProductionUrl } from './plan.js';

export const NATIVE_HEADER_LINK = 'header#atIdViewHeader a';
const HOME = Object.freeze({ es: 'inicio', en: 'home', fr: 'accueil', it: 'inizio' });

function ownPage(value, site) {
  if (typeof value !== 'string' || value.length > 4096 || /[\s\\\u0000-\u001f\u007f]|%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/iu.test(value)) return null;
  let url;
  try { url = new URL(rewriteProductionUrl(value)); } catch { return null; }
  if (url.origin !== site.productionOrigin || url.username || url.password || url.port || url.search || url.hash) return null;
  return `${site.productionOrigin}${url.pathname === `/${HOME[site.language]}` ? '/' : url.pathname}`;
}

export function navigationAriaDecision(element, plan) {
  const classes = (element.getAttribute('class') ?? '').split(/\s+/u);
  const controller = element.getAttribute('jscontroller');
  const nativeController = controller === 'yUHiM' && element.getAttribute('jsaction') === 'rcuQ6b:WYd;';
  const nativeMobile = controller === null && element.getAttribute('jsaction') === null && classes.includes('hDrhEe');
  const selected = element.getAttribute('aria-selected');
  if ((!nativeController && !nativeMobile) || !classes.includes('aJHbb')
    || element.getAttribute('role') !== 'link' || element.getAttribute('jsname') !== 'QwLHlb'
    || element.getAttribute('data-navtype') !== '1' || element.getAttribute('data-type') !== '1'
    || !['1', '2', '3'].includes(element.getAttribute('data-level')) || !['true', 'false'].includes(selected)) return null;
  const href = ownPage(element.getAttribute('href'), plan.site);
  const dataUrl = ownPage(element.getAttribute('data-url'), plan.site);
  if (!href || href !== dataUrl) return null;
  return Object.freeze({ current: selected === 'true' && href === plan.canonical
    && element.getAttribute('aria-current') === null });
}

export function rewriteNavigationAria(element, plan) {
  const decision = navigationAriaDecision(element, plan);
  if (!decision) return;
  element.removeAttribute('aria-selected');
  if (decision.current) element.setAttribute('aria-current', 'page');
}
