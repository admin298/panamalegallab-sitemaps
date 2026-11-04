import { SITES } from '../vendor/logic.js';

const scopes = ['yuynLe', 'WDxLfe'].map(id => `header#atIdViewHeader nav#${id}`);
export const HEADER_NAV = scopes.join(',');
export const HEADER_ANCHOR = scopes.map(scope => `${scope} a`).join(',');
const HEADER_DESCENDANT = scopes.map(scope => `${scope} a *`).join(',');
const ROOT_LANGUAGES = Object.freeze(Object.fromEntries(Object.values(SITES).flatMap(site =>
  [[site.productionOrigin, site.language], [site.productionOrigin + '/', site.language]])));
const LABELS = Object.freeze({
  es: { title: '🌐 Idiomas', en: '🇺🇸 Inglés', fr: '🇫🇷 Francés', it: '🇮🇹 Italiano' },
  en: { title: '🌐 Languages', es: '🇪🇸 Spanish', fr: '🇫🇷 French', it: '🇮🇹 Italian' },
  fr: { title: '🌐 Langues', es: '🇪🇸 Espagnol', en: '🇺🇸 Anglais', it: '🇮🇹 Italien' },
  it: { title: '🌐 Lingue', es: '🇪🇸 Spagnolo', en: '🇺🇸 Inglese', fr: '🇫🇷 Francese' },
});
const textValue = value => value.replace(/\s+/gu, ' ').trim();
function rootLanguage(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value)) return null;
  if (Object.hasOwn(ROOT_LANGUAGES, value)) return ROOT_LANGUAGES[value];
  if (!value.startsWith('https://www.google.com/url?') || value.includes('#')) return null;
  let wrapper;
  try { wrapper = new URL(value); } catch { return null; }
  if (wrapper.origin !== 'https://www.google.com' || wrapper.pathname !== '/url'
    || wrapper.username || wrapper.password || wrapper.port || wrapper.hash) return null;
  const targets = wrapper.searchParams.getAll('q');
  if (targets.length !== 1 || !Object.hasOwn(ROOT_LANGUAGES, targets[0])) return null;
  return ROOT_LANGUAGES[targets[0]];
}
function createRootClassifier() {
  let cache = new Map();
  let characters = 0;
  return value => {
    if (cache.has(value)) return cache.get(value);
    const language = rootLanguage(value);
    if (typeof value === 'string' && value.length <= 2048 && cache.size < 32 && characters + value.length <= 32_768) {
      cache = new Map([...cache, [value, language]]);
      characters += value.length;
    }
    return language;
  };
}
function levelOf(element) {
  const level = element.getAttribute('data-level');
  return ['1', '2', '3'].includes(level) ? Number(level) : NaN;
}
function hasMedia(element) {
  const style = element.getAttribute('style') ?? '';
  return style.includes('\\') || ['src', 'srcset', 'poster', 'background', 'data', 'data-src'].some(name => element.getAttribute(name) !== null)
    || /(?:url\s*\(|(?:background(?:-image)?|mask(?:-image)?|content)\s*:)/iu.test(style);
}
function readAnchor(element, ordinal, level = levelOf(element), navType = element.getAttribute('data-navtype')) {
  return { ordinal, text: '', level,
    href: element.getAttribute('href'), dataUrl: element.getAttribute('data-url'),
    navType, type: element.getAttribute('data-type'),
    popup: element.getAttribute('aria-haspopup'), more: element.getAttribute('data-in-more-submenu'),
    valid: element.getAttribute('jsname') === 'QwLHlb' && element.getAttribute('role') === 'link'
      && (element.getAttribute('class') ?? '').split(/\s+/u).includes('aJHbb') && !hasMedia(element) };
}
function isParent(anchor, nav, locale) {
  return anchor.valid && LABELS[locale] && textValue(anchor.text) === LABELS[locale].title
    && anchor.navType === '4' && anchor.type === null && anchor.popup === 'true'
    && anchor.href === null && anchor.dataUrl === null
    && (anchor.level === 1 || (nav === 'WDxLfe' && anchor.level === 2 && anchor.more === 'true'));
}
function validChild(anchor, group, locale, classifyRoot) {
  const language = classifyRoot(anchor.href);
  return anchor.valid && anchor.level === group.level + 1 && anchor.navType === '2' && anchor.type === '2'
    && language && language === classifyRoot(anchor.dataUrl) && language !== locale
    && textValue(anchor.text) === LABELS[locale]?.[language]
    && (anchor.more === 'true') === (group.level === 2);
}
function finishGroup(state, classifyRoot) {
  const group = state.group;
  if (!group) return state;
  const languages = group.children.map(child => classifyRoot(child.href));
  if (!group.valid || group.children.length !== 3 || new Set(languages).size !== 3)
    return { ...state, group: null };
  const key = `${group.nav}:${group.level}`;
  if (state.keys.has(key) || state.keys.size >= 3) return { ...state, invalid: true, group: null };
  return { ...state, group: null, keys: new Set([...state.keys, key]), matches: [...state.matches,
    ...group.children.map(child => Object.freeze({ ordinal: child.ordinal, language: classifyRoot(child.href) }))] };
}
function closeAnchor(state, ordinal, locale, classifyRoot) {
  const anchor = state.anchor;
  if (!anchor || anchor.ordinal !== ordinal) return { ...state, invalid: true };
  const next = { ...state, anchor: null };
  if (isParent(anchor, state.nav, locale)) {
    if (state.group) return { ...next, invalid: true };
    return { ...next, group: { nav: state.nav, level: anchor.level, valid: true, children: [] } };
  }
  if (!state.group) return next;
  return { ...next, group: { ...state.group,
    valid: state.group.valid && validChild(anchor, state.group, locale, classifyRoot) && state.group.children.length < 3,
    children: state.group.children.length < 4 ? [...state.group.children, anchor] : state.group.children } };
}

export function createHeaderInspector(locale) {
  const classifyRoot = createRootClassifier();
  let state = { nav: null, anchor: null, group: null, ordinal: -1, seen: new Set(), keys: new Set(), matches: [], invalid: false };
  return {
    nav: { element(element) {
      const id = element.getAttribute('id');
      if (state.nav || !['yuynLe', 'WDxLfe'].includes(id) || element.getAttribute('role') !== 'navigation' || state.seen.has(id)) {
        state = { ...state, invalid: true }; return;
      }
      state = { ...state, nav: id, seen: new Set([...state.seen, id]) };
      element.onEndTag(() => {
        state = finishGroup(state, classifyRoot);
        state = { ...state, invalid: state.invalid || state.nav !== id || Boolean(state.anchor), nav: null };
      });
    } },
    anchor: {
      element(element) {
        if (!state.nav) return;
        if (state.anchor || state.ordinal >= 511) { state = { ...state, invalid: true }; return; }
        const level = levelOf(element);
        if (state.group && (!Number.isInteger(level) || level <= state.group.level)) {
          if (!Number.isInteger(level)) state = { ...state, group: { ...state.group, valid: false } };
          state = finishGroup(state, classifyRoot);
        }
        const ordinal = state.ordinal + 1;
        const navType = element.getAttribute('data-navtype');
        const anchor = !state.group && navType !== '4'
          ? { ordinal, valid: false, skip: true } : readAnchor(element, ordinal, level, navType);
        state = { ...state, ordinal, anchor };
        element.onEndTag(() => { state = closeAnchor(state, ordinal, locale, classifyRoot); });
      },
      text(chunk) {
        if (!state.anchor || state.anchor.skip) return;
        const text = state.anchor.text + chunk.text;
        state = { ...state, anchor: { ...state.anchor, valid: state.anchor.valid && text.length <= 128,
          text: text.length <= 128 ? text : '' } };
      },
    },
    descendant: { element(element) {
      if (state.anchor && !state.anchor.skip && (element.tagName !== 'span' || hasMedia(element)))
        state = { ...state, anchor: { ...state.anchor, valid: false } };
    } },
    context() {
      return state.invalid || state.nav || state.anchor || state.group || state.matches.length === 0
        ? null : Object.freeze([...state.matches]);
    },
  };
}

export function attachHeaderInspection(rewriter, inspector) {
  return rewriter.on(HEADER_NAV, inspector.nav).on(HEADER_ANCHOR, inspector.anchor).on(HEADER_DESCENDANT, inspector.descendant);
}

export function createHeaderLanguageRewrite(policy, context) {
  const matches = context?.headerLanguageAnchors;
  if (!policy || context?.siteLanguage !== policy.language || !Array.isArray(matches) || !matches.length || matches.length > 9
    || matches.some(match => !Number.isInteger(match.ordinal) || match.ordinal < 0 || match.ordinal >= 512 || !policy.alternatives[match.language])
    || new Set(matches.map(match => match.ordinal)).size !== matches.length) return null;
  const languages = new Map(matches.map(match => [match.ordinal, match.language]));
  const classifyRoot = createRootClassifier();
  let ordinal = -1;
  return { element(element) {
    ordinal += 1;
    const language = languages.get(ordinal);
    if (!language) return;
    const anchor = readAnchor(element, ordinal);
    if (anchor.valid && anchor.navType === '2' && anchor.type === '2'
      && classifyRoot(anchor.href) === language && classifyRoot(anchor.dataUrl) === language) {
      element.setAttribute('href', policy.alternatives[language]);
      element.setAttribute('data-url', policy.alternatives[language]);
    }
  } };
}
