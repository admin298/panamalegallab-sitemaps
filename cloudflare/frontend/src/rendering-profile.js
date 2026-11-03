import { HOME_SECTION, LOGO_WIDGET, LOGO_RATIO, HERO_PRIORITY,
  approvedImageUrl, heroImageUrl, logoCanReserveRatio, imagePreload, isEsHome } from './rendering-assets.js';
import { NATIVE_HEADER_LINK, rewriteNavigationAria } from './rendering-navigation.js';

const HERO = `${HOME_SECTION} div[role="img"]`;
const LOGO_IMAGE = `${HOME_SECTION} ${LOGO_WIDGET} img`;
const nativePreloader = /\bnew\s+(?:window\.)?Image\s*\(|\b(?:headerBgImgLoaded|headerBgImgExists|bgImgLoaded)\b/u;

// Collected alongside the existing source-identification pass. No extra parser,
// image fetch, client script, or production-only SEO policy is introduced.
export function createRenderingInspector(plan) {
  let state = { html: 0, head: 0, header: 0, markers: 0, validSite: true,
    section: 0, widget: 0, heroes: 0, heroUrl: null, images: 0, logo: false,
    charset: 0, earlyCharset: false, priorScript: '', unsafePriorScript: false, preloads: [], preloadOverflow: false };
  const counter = name => ({ element() { state = { ...state, [name]: state[name] + 1 }; } });
  return {
    html: counter('html'), head: counter('head'), header: counter('header'),
    section: counter('section'), widget: counter('widget'),
    marker: { element(element) {
      state = { ...state, markers: state.markers + 1, validSite: state.validSite
        && element.getAttribute('data-domain') === 'panamalegallab.com'
        && element.getAttribute('data-sitename') === plan.site.upstreamPrefix.split('/').at(-1) };
    } },
    charset: { element(element) {
      state = { ...state, charset: state.charset + 1,
        earlyCharset: !state.unsafePriorScript && !nativePreloader.test(state.priorScript)
          && /^utf-?8$/iu.test(element.getAttribute('charset') ?? ''), priorScript: '' };
    } },
    // Current Google Sites has its non-image ppConfig bootstrap before charset.
    // Preserve that ordering. A native image preloader, an external script or an
    // oversized unknown prefix before charset makes a new later hint a no-op.
    script: {
      element(element) {
        if (state.charset === 0 && element.getAttribute('src') !== null) state = { ...state, unsafePriorScript: true };
      },
      text(chunk) {
        if (state.charset !== 0 || state.unsafePriorScript) return;
        const prefix = state.priorScript + chunk.text;
        state = prefix.length > 32_768 ? { ...state, unsafePriorScript: true, priorScript: '' }
          : { ...state, priorScript: prefix };
      },
    },
    hero: { element(element) { state = { ...state, heroes: state.heroes + 1, heroUrl: heroImageUrl(element) }; } },
    image: { element(element) { state = { ...state, images: state.images + 1, logo: logoCanReserveRatio(element) }; } },
    preload: { element(element) {
      if (!(element.getAttribute('rel') ?? '').toLowerCase().split(/\s+/u).includes('preload')
        || element.getAttribute('as')?.toLowerCase() !== 'image') return;
      if (state.preloads.length >= 32) { state = { ...state, preloadOverflow: true }; return; }
      state = { ...state, preloads: [...state.preloads, approvedImageUrl(element.getAttribute('href'))] };
    } },
    context() {
      const document = state.html === 1 && state.head === 1 && state.markers === 1 && state.validSite;
      const home = document && isEsHome(plan) && state.section === 1;
      return Object.freeze({ navigation: document && state.header === 1,
        logo: home && state.widget === 1 && state.images === 1 && state.logo,
        heroUrl: HERO_PRIORITY && home && state.heroes === 1 && state.heroUrl
          && state.charset === 1 && state.earlyCharset && !state.preloadOverflow
          && !state.preloads.includes(state.heroUrl) ? state.heroUrl : null });
    },
  };
}

export function attachRenderingInspection(rewriter, inspector) {
  return rewriter.on('html', inspector.html).on('head', inspector.head)
    .on('header#atIdViewHeader', inspector.header).on('[data-domain][data-sitename]', inspector.marker)
    .on(HOME_SECTION, inspector.section).on(LOGO_WIDGET, inspector.widget)
    .on('head meta[charset]', inspector.charset).on('head script', inspector.script)
    .on(HERO, inspector.hero).on(LOGO_IMAGE, inspector.image)
    .on('head link', inspector.preload);
}

export function attachRenderingRewrite(rewriter, plan) {
  const context = plan.documentContext?.rendering;
  if (!context) return rewriter;
  if (context.navigation) rewriter.on(NATIVE_HEADER_LINK, { element(element) { rewriteNavigationAria(element, plan); } });
  if (context.logo) rewriter.on(LOGO_IMAGE, { element(element) {
    if (!logoCanReserveRatio(element)) return;
    const style = element.getAttribute('style') ?? '';
    element.setAttribute('style', `${style}${style && !style.trimEnd().endsWith(';') ? ';' : ''}${style ? ' ' : ''}${LOGO_RATIO}`);
  } });
  if (context.heroUrl) rewriter.on('head meta[charset]', { element(element) {
    element.after(imagePreload(context.heroUrl), { html: true });
  } });
  return rewriter;
}
