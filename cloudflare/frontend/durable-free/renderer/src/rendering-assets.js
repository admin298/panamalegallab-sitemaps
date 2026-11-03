import { rewriteImageReferences } from '../vendor/logic.js';

// Measured ES home profile, not dimensions inferred from a signed image URL.
export const HOME_SECTION = 'section[id="h.INITIAL_GRID.85u6di9ec7a5"]';
export const LOGO_WIDGET = '[id="h.4a7e47a7ec29bfb_69"]';
export const HERO_LABEL = 'Servicios legales y corporativos en Panamá en un centro financiero internacional';
export const LOGO_LABEL = 'Logo de Panamá Legal Lab con símbolo gráfico y nombre de la marca en naranja y blanco.';
export const LOGO_RATIO = 'aspect-ratio: auto 1168 / 854;';
export const HERO_PRIORITY = typeof __PLL_HERO_PRIORITY__ === 'undefined' ? true : __PLL_HERO_PRIORITY__;
const CDN_PREFIX = 'https://lh7-us.googleusercontent.com/sitesv-images-rt/';
const unsafe = /[\s\\\u0000-\u001f\u007f-\u009f"'<>`]|%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/iu;

export function approvedImageUrl(value) {
  if (typeof value !== 'string' || value.length > 4096 || unsafe.test(value)) return null;
  const rewritten = rewriteImageReferences(value.replaceAll('&amp;', '&'));
  if (/&#|&(?:amp|quot|lt|gt|apos)|&[a-z][a-z0-9]*;/iu.test(rewritten)) return null;
  if (!rewritten.startsWith(CDN_PREFIX) || rewritten.length === CDN_PREFIX.length) return null;
  let url;
  try { url = new URL(rewritten); } catch { return null; }
  return url.origin === 'https://lh7-us.googleusercontent.com' && !url.username && !url.password
    && !url.port && !url.hash && url.pathname.startsWith('/sitesv-images-rt/') ? rewritten : null;
}

export function heroImageUrl(element) {
  if (element.getAttribute('aria-label') !== HERO_LABEL || element.getAttribute('jsname') !== 'LQX2Vd'
    || !(element.getAttribute('class') ?? '').split(/\s+/u).includes('IFuOkc')) return null;
  const style = element.getAttribute('style') ?? '';
  if (style.length > 8192 || /[\\\u0000-\u001f]|\/\*/u.test(style)) return null;
  if ((style.match(/(?:^|;)\s*background(?:-image)?\s*:/giu) ?? []).length !== 1) return null;
  const match = style.match(/(?:^|;)\s*background-image\s*:\s*url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s"'()]+))\s*\)\s*(?:;|$)/iu);
  return match ? approvedImageUrl(match[1] ?? match[2] ?? match[3]) : null;
}

export function logoCanReserveRatio(element) {
  if (element.getAttribute('role') !== 'img' || element.getAttribute('alt') !== LOGO_LABEL
    || !(element.getAttribute('class') ?? '').split(/\s+/u).includes('CENy8b')
    || !approvedImageUrl(element.getAttribute('src')) || element.getAttribute('srcset') !== null
    || element.getAttribute('width') !== null || element.getAttribute('height') !== null) return false;
  const style = element.getAttribute('style') ?? '';
  return style.length <= 2048 && !/[\\\u0000-\u001f]|\/\*/u.test(style)
    && !/(?:^|;)\s*(?:aspect-ratio|(?:min-|max-)?(?:width|height)|object-(?:fit|position))\s*:/iu.test(style);
}

export function imagePreload(url) {
  const escaped = url.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return `<link rel="preload" as="image" fetchpriority="high" href="${escaped}">`;
}

export function isEsHome(plan) {
  return plan.kind === 'page' && !plan.searchPage && plan.site?.language === 'es'
    && plan.canonical === `${plan.site.productionOrigin}/` && ['/', '/inicio'].includes(plan.path);
}
