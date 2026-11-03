import { SITES } from '../vendor/logic.js';

export const FOOTER_GROUP = 'footer[jsname="yePe5c"] small.zfr3Q';
const ROOT_LANGUAGES = Object.freeze(Object.fromEntries(Object.values(SITES).flatMap(site =>
  [[site.productionOrigin, site.language], [site.productionOrigin + '/', site.language]])));
// Exact visible labels observed in saved real public ES/EN/FR/IT footer fixtures.
const LABELS = Object.freeze({
  es: Object.freeze({"es": "ES Espa\u00f1ol", "en": "EN Ingl\u00e9s", "fr": "FR Franc\u00e9s", "it": "IT Italiano"}),
  en: Object.freeze({"es": "ES Spanish", "en": "EN English", "fr": "FR French", "it": "IT Italian"}),
  fr: Object.freeze({"es": "ES Espagnol", "en": "EN Anglais", "fr": "FR Fran\u00e7ais", "it": "IT Italien"}),
  it: Object.freeze({"es": "ES Spagnolo", "en": "EN Inglese", "fr": "FR Francese", "it": "IT Italiano"}),
});
const textValue = value => value.replace(/\s+/gu, ' ').trim();
function hasMediaAttributes(element) {
  const style = element.getAttribute('style') ?? '';
  return style.includes('\\') || ['src', 'srcset', 'poster', 'background', 'data', 'data-src'].some(name => element.getAttribute(name) !== null)
    || /(?:url\s*\(|(?:background(?:-image)?|mask(?:-image)?|content)\s*:)/iu.test(style);
}
const rootLanguage = href => Object.hasOwn(ROOT_LANGUAGES, href) ? ROOT_LANGUAGES[href] : null;

function recognizedGroup(group, locale) {
  if (!group.valid || !LABELS[locale]) return false;
  const visible = group.anchors.filter(anchor => textValue(anchor.text));
  return visible.length === 4 && Object.keys(SITES).every(language =>
    visible.filter(anchor => anchor.language === language
      && textValue(anchor.text) === LABELS[locale][language]).length === 1)
    && group.anchors.every(anchor => anchor.valid && anchor.language && anchor.text.length > 0);
}

export function createDocumentInspector(locale) {
  let documentLanguage = null;
  let htmlCount = 0;
  let ordinal = -1;
  let active = null;
  let anchor = null;
  let matches = [];
  let invalid = false;
  const closeAnchor = groupOrdinal => {
    if (!anchor || !active || anchor.group !== groupOrdinal || active.ordinal !== groupOrdinal) {
      invalid = true; return;
    }
    active = { ...active, anchors: [...active.anchors, anchor] };
    anchor = null;
  };
  return {
    html: { element(element) { htmlCount += 1; documentLanguage = element.getAttribute('lang'); } },
    group: { element(element) {
      ordinal += 1;
      if (active || ordinal >= 16) { invalid = true; return; }
      const id = ordinal;
      active = { ordinal: id, valid: true, anchors: [] };
      element.onEndTag(() => {
        if (!active || active.ordinal !== id || anchor) { invalid = true; active = null; anchor = null; return; }
        if (recognizedGroup(active, locale)) matches = [...matches, id];
        active = null;
      });
    } },
    anchor: {
      element(element) {
        if (!active) return;
        if (anchor || active.anchors.length >= 8) { invalid = true; active = { ...active, valid: false }; return; }
        const id = active.ordinal;
        anchor = { group: id, language: rootLanguage(element.getAttribute('href')), text: '',
          valid: !hasMediaAttributes(element)
            && (element.getAttribute('class') ?? '').split(/\s+/u).includes('XqQF9c') };
        element.onEndTag(() => closeAnchor(id));
      },
      text(chunk) {
        if (!anchor || !anchor.valid) return;
        if (anchor.text.length + chunk.text.length > 256) anchor = { ...anchor, valid: false, text: '' };
        else anchor = { ...anchor, text: anchor.text + chunk.text };
      },
    },
    descendant: { element(element) {
      if (active && (!['a', 'span'].includes(element.tagName) || hasMediaAttributes(element))) {
        active = { ...active, valid: false };
      }
    } },
    context() {
      return Object.freeze({ authorLanguage: htmlCount === 1 ? documentLanguage : null,
        siteLanguage: htmlCount === 1 ? locale : null,
        languageGroup: !invalid && !active && !anchor && htmlCount === 1
          && matches.length === 1 ? matches[0] : null });
    },
  };
}

export function attachDocumentInspection(rewriter, inspector) {
  return rewriter.on('html', inspector.html).on(FOOTER_GROUP, inspector.group)
    .on(`${FOOTER_GROUP} a`, inspector.anchor).on(`${FOOTER_GROUP} *`, inspector.descendant);
}

export function createLanguageRewrite(policy, context) {
  if (!policy || context?.siteLanguage !== policy.language || !Number.isInteger(context.languageGroup)) return null;
  let ordinal = -1;
  let active = false;
  return {
    group: { element(element) {
      ordinal += 1;
      active = ordinal === context.languageGroup;
      element.onEndTag(() => { active = false; });
    } },
    anchor: { element(element) {
      if (!active) return;
      const language = rootLanguage(element.getAttribute('href'));
      if (language && language !== policy.language && policy.alternatives[language]) {
        element.setAttribute('href', policy.alternatives[language]);
      }
    } },
  };
}
