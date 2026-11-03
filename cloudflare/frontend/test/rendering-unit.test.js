import test from 'node:test';
import assert from 'node:assert/strict';
import { SITES } from '../vendor/logic.js';
import { planDeliveryRequest } from '../src/plan.js';
import { approvedImageUrl, heroImageUrl, logoCanReserveRatio, imagePreload, isEsHome,
  HERO_LABEL, LOGO_LABEL, LOGO_RATIO, HOME_SECTION, LOGO_WIDGET } from '../src/rendering-assets.js';
import { navigationAriaDecision, rewriteNavigationAria, NATIVE_HEADER_LINK } from '../src/rendering-navigation.js';
import { createRenderingInspector, attachRenderingInspection, attachRenderingRewrite } from '../src/rendering-profile.js';

const image = 'https://sites.google.com/sitesv-images-rt/current-token=w1280';
const cdn = image.replace('https://sites.google.com/', 'https://lh7-us.googleusercontent.com/');
const plan = planDeliveryRequest(SITES.es.productionOrigin + '/');
const element = (attrs = {}) => {
  let current = { ...attrs }; let after = null;
  return { getAttribute: key => current[key] ?? null,
    setAttribute(key, value) { current = { ...current, [key]: value }; },
    removeAttribute(key) { current = Object.fromEntries(Object.entries(current).filter(([name]) => name !== key)); },
    after(value, options) { after = { value, options }; }, attrs: () => ({ ...current }), inserted: () => after };
};
const heroAttrs = { class: 'IFuOkc', jsname: 'LQX2Vd', role: 'img', 'aria-label': HERO_LABEL,
  style: `background-position: center center; background-image: url(${image}); background-size: cover;` };
const logoAttrs = { class: 'other CENy8b', role: 'img', alt: LOGO_LABEL, src: image };
const navAttrs = { class: 'aJHbb dk90Ob jgXgSe HlqNPb', jscontroller: 'yUHiM', jsaction: 'rcuQ6b:WYd;',
  jsname: 'QwLHlb', role: 'link', tabindex: '0', 'data-navtype': '1', 'data-type': '1', 'data-level': '1',
  'aria-selected': 'true', href: SITES.es.upstreamRoot + '/inicio', 'data-url': SITES.es.upstreamRoot + '/inicio' };

test('image URL boundary accepts only unchanged HTTPS Sites image resource URLs', () => {
  assert.equal(approvedImageUrl(image), cdn);
  assert.equal(approvedImageUrl(cdn), cdn);
  assert.equal(approvedImageUrl(image + '?x=1&amp;y=2'), cdn + '?x=1&y=2');
  for (const value of [null, {}, '', 'https://lh7-us.googleusercontent.com/sitesv-images-rt/',
    'https://sites.google.com/not-images/a', 'http://lh7-us.googleusercontent.com/sitesv-images-rt/a',
    'https://lh7-us.googleusercontent.com.evil.invalid/sitesv-images-rt/a',
    'https://u@lh7-us.googleusercontent.com/sitesv-images-rt/a',
    'https://lh7-us.googleusercontent.com:443/sitesv-images-rt/a', cdn + '#hash', cdn + '\\x',
    cdn + '%0a', cdn + '\n', cdn + '"', cdn + '?x=&#34;', cdn + '?x=&quot;',
    cdn + '?x=&#34foo', cdn + '?x=&amp&y=2', 'x'.repeat(4097)]) {
    assert.equal(approvedImageUrl(value), null, String(value));
  }
});

test('CSS background profile extracts one unambiguous native hero and rejects changed declarations', () => {
  assert.equal(heroImageUrl(element(heroAttrs)), cdn);
  for (const quote of ['"', "'"]) assert.equal(heroImageUrl(element({ ...heroAttrs,
    style: `background-image: url(${quote}${image}${quote})` })), cdn);
  for (const attrs of [{ class: 'other' }, { jsname: 'changed' }, { 'aria-label': 'changed' },
    { style: 'background-size: cover' }, { style: `background: url(${image})` },
    { style: `background-image:url(${image});background-image:url(${image})` },
    { style: `background-image:url(${image}),url(${image})` },
    { style: `background-image:/*x*/url(${image})` }, { style: `background-image:u\\72l(${image})` },
    { style: 'x'.repeat(8193) }]) assert.equal(heroImageUrl(element({ ...heroAttrs, ...attrs })), null);
});

test('logo ratio respects author geometry and retains harmless existing styles', () => {
  assert.equal(logoCanReserveRatio(element(logoAttrs)), true);
  assert.equal(logoCanReserveRatio(element({ ...logoAttrs, style: 'opacity: 1;' })), true);
  for (const attrs of [{ role: 'presentation' }, { alt: 'changed' }, { class: 'other' }, { src: null },
    { srcset: image + ' 1x' }, { width: '1168' }, { height: '854' }, { style: 'aspect-ratio:1/1' },
    { style: 'height:auto' }, { style: 'max-width:50%' }, { style: 'min-height:1px' },
    { style: 'object-fit:cover' }, { style: 'opacity:/*x*/1' }, { style: 'he\\69ght:auto' },
    { style: 'x'.repeat(2049) }]) assert.equal(logoCanReserveRatio(element({ ...logoAttrs, ...attrs })), false);
  assert.equal(imagePreload(cdn + '?a=1&b=2'), `<link rel="preload" as="image" fetchpriority="high" href="${cdn}?a=1&amp;b=2">`);
});

test('ES source path and preferred canonical identify home in production and preview, including aliases', () => {
  for (const url of [SITES.es.productionOrigin + '/', SITES.es.productionOrigin + '/inicio',
    'https://speed-test.pll-seo-preview-20261102.pages.dev/es/',
    'https://speed-test.pll-seo-preview-20261102.pages.dev/es/inicio']) assert.equal(isEsHome(planDeliveryRequest(url)), true);
  for (const url of [SITES.es.productionOrigin + '/contacto', SITES.en.productionOrigin + '/',
    'https://speed-test.pll-seo-preview-20261102.pages.dev/']) assert.equal(isEsHome(planDeliveryRequest(url)), false);
  assert.equal(isEsHome({ ...plan, searchPage: true }), false);
  assert.equal(isEsHome({ ...plan, canonical: SITES.es.productionOrigin + '/inicio' }), false);
});

test('native navigation replaces only invalid selected semantics and preserves author aria-current', () => {
  const current = element(navAttrs);
  assert.deepEqual(navigationAriaDecision(current, plan), { current: true });
  rewriteNavigationAria(current, plan);
  assert.equal(current.getAttribute('aria-selected'), null);
  assert.equal(current.getAttribute('aria-current'), 'page');
  const preserved = Object.fromEntries(Object.entries(current.attrs()).filter(([key]) => key !== 'aria-current'));
  assert.deepEqual(preserved, Object.fromEntries(Object.entries(navAttrs).filter(([key]) => key !== 'aria-selected')));
  for (const attrs of [{ 'aria-selected': 'false' }, { 'aria-current': 'step' },
    { href: SITES.es.upstreamRoot + '/contacto', 'data-url': SITES.es.upstreamRoot + '/contacto' }]) {
    const link = element({ ...navAttrs, ...attrs });
    assert.deepEqual(navigationAriaDecision(link, plan), { current: false });
    rewriteNavigationAria(link, plan);
    assert.equal(link.getAttribute('aria-selected'), null);
    assert.equal(link.getAttribute('aria-current'), attrs['aria-current'] ?? null);
  }
  const mobile = element({ ...navAttrs, class: 'aJHbb hDrhEe HlqNPb', jscontroller: null, jsaction: null });
  assert.deepEqual(navigationAriaDecision(mobile, plan), { current: true });
});

test('changed controllers, roles, navigation metadata, destinations and selection values are left intact', () => {
  const bad = [{ class: 'other' }, { jscontroller: 'other' }, { jsaction: 'click:other' },
    { jsname: 'other' }, { role: 'option' }, { role: 'tab' }, { 'data-navtype': '2' }, { 'data-type': '2' },
    { 'data-level': '4' }, { 'aria-selected': null }, { 'aria-selected': 'other' },
    { href: null }, { href: '/missing-path' }, { href: 'https://evil.invalid/' },
    { href: SITES.es.upstreamRoot + '/inicio?x=1' }, { href: SITES.es.upstreamRoot + '/inicio#x' },
    { href: SITES.es.upstreamRoot + '/inicio%0a' }, { href: SITES.es.upstreamRoot + '/inicio\\x' },
    { href: SITES.es.upstreamRoot + '/inicio' + 'a'.repeat(4096) },
    { 'data-url': SITES.es.upstreamRoot + '/contacto' }];
  for (const attrs of bad) {
    const input = element({ ...navAttrs, ...attrs }); const before = input.attrs();
    assert.equal(navigationAriaDecision(input, plan), null);
    rewriteNavigationAria(input, plan); assert.deepEqual(input.attrs(), before);
  }
});

function inspect(overrides = {}) {
  const inspector = createRenderingInspector(plan);
  for (const name of ['html', 'head', 'header', 'section', 'widget']) {
    for (let n = 0; n < (overrides[name] ?? 1); n += 1) inspector[name].element(element());
  }
  for (let n = 0; n < (overrides.markers ?? 1); n += 1) inspector.marker.element(element({
    'data-domain': overrides.domain ?? 'panamalegallab.com', 'data-sitename': overrides.siteName ?? 'panamalegallab' }));
  if (overrides.scriptFirst) {
    inspector.script.element(element({ src: overrides.priorExternal ?? null }));
    inspector.script.text({ text: overrides.priorScript ?? 'new Image().src = "native";' });
  }
  for (let n = 0; n < (overrides.charset ?? 1); n += 1) inspector.charset.element(element({ charset: overrides.encoding ?? 'utf-8' }));
  inspector.script.element(element({ src: 'https://example.invalid/native-after-charset.js' }));
  inspector.script.text({ text: 'new Image().src = "native-after-charset";' });
  for (let n = 0; n < (overrides.heroes ?? 1); n += 1) inspector.hero.element(element({ ...heroAttrs, ...overrides.hero }));
  for (let n = 0; n < (overrides.images ?? 1); n += 1) inspector.image.element(element({ ...logoAttrs, ...overrides.logo }));
  inspector.preload.element(element({ rel: 'stylesheet', href: 'https://example.invalid/style.css' }));
  inspector.preload.element(element({ rel: 'preload', as: 'font', href: 'https://example.invalid/font.woff2' }));
  for (const url of overrides.preloads ?? []) inspector.preload.element(element({ rel: 'PRELOAD', as: 'IMAGE', href: url }));
  return inspector;
}

test('first-pass rendering context rejects duplicate documents, identities, widgets, images and ambiguous hints', () => {
  assert.deepEqual(inspect().context(), { navigation: true, logo: true, heroUrl: cdn });
  for (const attrs of [{ html: 2 }, { head: 2 }, { markers: 0 }, { markers: 2 }, { domain: 'evil.invalid' }, { siteName: 'changed' }]) {
    assert.deepEqual(inspect(attrs).context(), { navigation: false, logo: false, heroUrl: null });
  }
  assert.equal(inspect({ header: 2 }).context().navigation, false);
  assert.equal(inspect({ scriptFirst: true, priorScript: 'window.ppConfig={kept:true};' }).context().heroUrl, cdn);
  for (const attrs of [{ section: 2 }, { heroes: 2 }, { heroes: 0 }, { charset: 0 }, { charset: 2 },
    { encoding: 'latin1' }, { scriptFirst: true }, { preloads: [image] }, { preloads: [cdn] },
    { scriptFirst: true, priorExternal: 'https://example.invalid/unknown.js' },
    { scriptFirst: true, priorScript: 'a'.repeat(32_769) },
    { scriptFirst: true, priorScript: 'globals.headerBgImgLoaded = true;' },
    { preloads: Array(33).fill('https://example.invalid/a') }]) assert.equal(inspect(attrs).context().heroUrl, null);
  for (const attrs of [{ section: 0 }, { widget: 2 }, { images: 0 }, { images: 2 }, { logo: { alt: 'changed' } }]) {
    assert.equal(inspect(attrs).context().logo, false);
  }
});

const fakeRewriter = () => {
  let handlers = [];
  return { on(selector, handler) { handlers = [...handlers, { selector, handler }]; return this; },
    handlers: () => [...handlers], get: selector => handlers.find(item => item.selector === selector)?.handler };
};

test('second-pass handlers preserve original attributes and add only validated rendering changes', () => {
  const rewriter = fakeRewriter(); const inspector = inspect();
  assert.equal(attachRenderingInspection(rewriter, inspector), rewriter);
  assert.equal(rewriter.handlers().length, 11);
  const output = fakeRewriter(); const renderPlan = { ...plan, documentContext: { rendering: inspector.context() } };
  assert.equal(attachRenderingRewrite(output, renderPlan), output);
  const charset = element({ charset: 'utf-8' }); output.get('head meta[charset]').element(charset);
  assert.deepEqual(charset.inserted(), { value: imagePreload(cdn), options: { html: true } });
  const link = element(navAttrs); output.get(NATIVE_HEADER_LINK).element(link);
  assert.equal(link.getAttribute('aria-current'), 'page');
  for (const style of [null, 'opacity:1', 'opacity:1;']) {
    const logo = element({ ...logoAttrs, style });
    output.get(`${HOME_SECTION} ${LOGO_WIDGET} img`).element(logo);
    assert.equal(logo.getAttribute('style'), `${style ?? ''}${style === 'opacity:1' ? ';' : ''}${style ? ' ' : ''}${LOGO_RATIO}`);
  }
  const changed = element({ ...logoAttrs, width: '1168' });
  output.get(`${HOME_SECTION} ${LOGO_WIDGET} img`).element(changed); assert.equal(changed.getAttribute('style'), null);
  assert.equal(attachRenderingRewrite(fakeRewriter(), plan).handlers().length, 0);
  assert.equal(attachRenderingRewrite(fakeRewriter(), { ...plan, documentContext: { rendering: {} } }).handlers().length, 0);
});
