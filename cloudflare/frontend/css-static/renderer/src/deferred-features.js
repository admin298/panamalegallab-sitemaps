import { FOOTER_GROUP, createLanguageRewrite } from './language-controls.js';
import { HEADER_ANCHOR, createHeaderLanguageRewrite } from './header-language-controls.js';
import { NATIVE_HEADER_LINK, rewriteNavigationAria } from './rendering-navigation.js';
import { HOME_SECTION, LOGO_WIDGET, LOGO_RATIO, HERO_PRIORITY, imagePreload, logoCanReserveRatio, isEsHome } from './rendering-assets.js';
import { descriptionTag } from './readiness.js';
import { makeDeliveryAttributeHandler } from './html.js';

const MEDIA = ['style', 'src', 'srcset', 'poster', 'background', 'data', 'data-src'];
const HEADER = ['class', 'jsname', 'role', 'data-navtype', 'data-type', 'data-level', 'href', 'data-url',
  'aria-haspopup', 'data-in-more-submenu', ...MEDIA];
const ARIA = ['class', 'jscontroller', 'jsaction', 'jsname', 'role', 'data-navtype', 'data-type', 'data-level',
  'href', 'data-url', 'aria-selected', 'aria-current'];
const LOGO = ['class', 'role', 'alt', 'src', 'srcset', 'width', 'height', 'style'];
const snapshot = (element, names) => Object.freeze(Object.fromEntries(names.map(name => [name, element.getAttribute(name)])));

function scalarElement(original = {}) {
  let attributes = { ...original };
  let changes = [];
  return { getAttribute: name => attributes[name] ?? null,
    setAttribute(name, value) { attributes = { ...attributes, [name]: value }; changes = [...changes, [name, value]]; },
    removeAttribute(name) { attributes = { ...attributes, [name]: null }; changes = [...changes, [name, null]]; },
    onEndTag() {}, changes: () => changes };
}

export function createDeferredFeatures(plan, staged, rewriteValue) {
  let headerOrdinal = -1;
  let footerOrdinal = -1;
  let activeFooter = -1;
  let footerAnchors = 0;
  const policy = plan.readinessPolicy;
  function mark(element, data) { element.before(staged.tag(element.tagName, data), { html: true }); }
  return {
    coreOptions: {
      metadata: policy?.description ? 'deferred-description' : '',
      headExtra: canonical => policy?.description ? staged.insert({ type: 'description', preceding: canonical }) : '',
      descriptionHandler: { element(element) {
        if (policy?.description && element.getAttribute('name')?.toLowerCase() === 'description') mark(element, { type: 'author-description' });
      } },
      rendering: false,
    },
    attach(rewriter) {
      if (policy) {
        rewriter.on(HEADER_ANCHOR, { element(element) {
          headerOrdinal += 1;
          if (headerOrdinal < 512 && element.getAttribute('data-navtype') === '2' && element.getAttribute('data-type') === '2') {
            mark(element, { type: 'header', ordinal: headerOrdinal, attributes: snapshot(element, HEADER) });
          }
        } }).on(FOOTER_GROUP, { element(element) {
          footerOrdinal += 1; activeFooter = footerOrdinal; footerAnchors = 0;
        } }).on(`${FOOTER_GROUP} a`, { element(element) {
          footerAnchors += 1;
          if (activeFooter >= 0 && activeFooter < 16 && footerAnchors <= 8) {
            mark(element, { type: 'footer', ordinal: activeFooter, attributes: snapshot(element, ['href']) });
          }
        } });
      }
      if (plan.kind === 'page' && !plan.searchPage) rewriter.on(NATIVE_HEADER_LINK, { element(element) {
        if (['true', 'false'].includes(element.getAttribute('aria-selected'))
          && element.getAttribute('data-navtype') === '1' && element.getAttribute('data-type') === '1') {
          mark(element, { type: 'aria', attributes: snapshot(element, ARIA) });
        }
      } });
      if (isEsHome(plan)) rewriter.on(`${HOME_SECTION} ${LOGO_WIDGET} img`, { element(element) {
        mark(element, { type: 'logo', attributes: snapshot(element, LOGO) });
      } });
      if (HERO_PRIORITY && isEsHome(plan)) rewriter.on('head meta[charset]', { element(element) {
        element.after(staged.insert({ type: 'hero' }), { html: true });
      } });
      return rewriter;
    },
    resolver(context) {
      const metadata = descriptionTag(policy, context);
      const header = createHeaderLanguageRewrite(policy, context);
      const footer = createLanguageRewrite(policy, context);
      let headerPosition = -1;
      let footerPosition = -1;
      return record => {
        if (record.type === 'description') return metadata;
        if (record.type === 'hero') return context?.rendering?.heroUrl ? imagePreload(context.rendering.heroUrl) : '';
        if (record.type === 'author-description') return metadata ? { remove: true } : [];
        const element = scalarElement(record.attributes);
        if (record.type === 'header' && header) {
          while (headerPosition < record.ordinal) {
            headerPosition += 1;
            header.element(headerPosition === record.ordinal ? element : scalarElement());
          }
        } else if (record.type === 'footer' && footer) {
          while (footerPosition < record.ordinal) { footerPosition += 1; footer.group.element(scalarElement()); }
          footer.anchor.element(element);
        } else if (record.type === 'aria' && context?.rendering?.navigation) rewriteNavigationAria(element, plan);
        else if (record.type === 'logo' && context?.rendering?.logo && logoCanReserveRatio(element)) {
          const style = element.getAttribute('style') ?? '';
          element.setAttribute('style', `${style}${style && !style.trimEnd().endsWith(';') ? ';' : ''}${style ? ' ' : ''}${LOGO_RATIO}`);
          makeDeliveryAttributeHandler('style', plan, rewriteValue).element(element);
        }
        return element.changes();
      };
    },
  };
}
