import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeaderInspector, createHeaderLanguageRewrite } from '../src/header-language-controls.js';

const roots = { en: 'https://en.panamalegallab.com/', fr: 'https://fr.panamalegallab.com/', it: 'https://it.panamalegallab.com/' };
const labels = { en: '🇺🇸 Inglés', fr: '🇫🇷 Francés', it: '🇮🇹 Italiano' };
const policy = { language: 'es', alternatives: { en: roots.en + 'company', fr: roots.fr + 'company', it: roots.it + 'company' } };
function element(attributes = {}, tagName = 'a') {
  const end = [];
  return { tagName, attributes, getAttribute: name => attributes[name] ?? null,
    setAttribute(name, value) { attributes[name] = value; }, onEndTag(callback) { end.push(callback); },
    close() { for (const callback of end) callback({}); } };
}
const base = { jsname: 'QwLHlb', role: 'link', class: 'aJHbb hDrhEe', 'data-level': '1' };
const wrapped = value => 'https://www.google.com/url?q=' + encodeURIComponent(value) + '&sa=D';
function menu(inspector, { parent = {}, child = {}, texts = {}, media = null, extra = false, incomplete = false, wrapHref = false, mixed = false } = {}) {
  const title = element({ ...base, 'data-navtype': '4', 'aria-haspopup': 'true', ...parent });
  inspector.anchor.element(title);
  inspector.anchor.text({ text: texts.parent ?? '🌐 Idiomas' });
  title.close();
  for (const language of Object.keys(roots).slice(0, incomplete ? 2 : 3)) {
    const link = element({ ...base, 'data-level': '2', 'data-navtype': '2', 'data-type': '2',
      href: wrapHref ? wrapped(roots[language]) : roots[language],
      'data-url': wrapHref && !mixed ? wrapped(roots[language]) : roots[language], ...child });
    inspector.anchor.element(link);
    inspector.anchor.text({ text: texts[language] ?? labels[language] });
    if (media) inspector.descendant.element(element(media.attributes ?? {}, media.tagName));
    link.close();
  }
  if (extra) {
    const link = element({ ...base, 'data-level': '2', href: roots.fr });
    inspector.anchor.element(link); inspector.anchor.text({ text: 'Extra link' }); link.close();
  }
}
function inspect(options = {}) {
  const inspector = createHeaderInspector(options.locale ?? 'es');
  const nav = element({ id: options.navId ?? 'yuynLe', role: options.navRole ?? 'navigation' }, 'nav');
  inspector.nav.element(nav); menu(inspector, options); nav.close();
  return inspector.context();
}

test('recognized native header menu yields immutable exact anchor destinations and keeps ordinary links', () => {
  const matches = inspect();
  assert.equal(matches.length, 3);
  assert.ok(Object.isFrozen(matches));
  assert.ok(matches.every(Object.isFrozen));
  const rewrite = createHeaderLanguageRewrite(policy, { siteLanguage: 'es', headerLanguageAnchors: matches });
  const heading = element({ ...base, 'data-navtype': '4' }); rewrite.element(heading);
  for (const language of Object.keys(roots)) {
    const link = element({ ...base, 'data-level': '2', 'data-navtype': '2', 'data-type': '2', href: roots[language], 'data-url': roots[language] });
    rewrite.element(link);
    assert.equal(link.attributes.href, policy.alternatives[language]);
    assert.equal(link.attributes['data-url'], policy.alternatives[language]);
  }
  const ordinary = element({ href: roots.fr, 'data-url': roots.fr }); rewrite.element(ordinary);
  assert.equal(ordinary.attributes.href, roots.fr);
});

test('malformed header menus fail closed rather than rewriting ordinary or ambiguous roots', () => {
  for (const options of [
    { locale: 'unknown' }, { navId: 'other' }, { navRole: 'banner' },
    { parent: { href: roots.en } }, { parent: { 'data-url': roots.en } },
    { parent: { 'data-level': '3' } }, { parent: { 'aria-haspopup': 'false' } },
    { parent: { 'data-navtype': '2' } }, { texts: { parent: 'Other languages' } },
    { child: { 'data-url': roots.fr } }, { child: { href: roots.en + '?x=1' } },
    { child: { href: 'https://evil.example/', 'data-url': 'https://evil.example/' } },
    { child: { 'data-level': '3' } }, { child: { 'data-level': 'invalid' } },
    { child: { 'data-type': '1' } }, { child: { role: 'button' } }, { child: { class: 'other' } },
    { texts: { en: 'Home' } }, { texts: { en: 'x'.repeat(129) } },
    { media: { tagName: 'img' } }, { media: { tagName: 'span', attributes: { style: 'background-image:url(https://example.invalid/a)' } } },
    { media: { tagName: 'span', attributes: { style: String.raw`b\61 ckground-image:none` } } },
    { extra: true }, { incomplete: true },
  ]) assert.equal(inspect(options), null, JSON.stringify(options));
});

test('header boundaries reject unfinished, nested and duplicate navigation groups', () => {
  const unfinished = createHeaderInspector('es'); unfinished.nav.element(element({ id: 'yuynLe', role: 'navigation' }));
  menu(unfinished); assert.equal(unfinished.context(), null);
  const nested = createHeaderInspector('es'), first = element({ id: 'yuynLe', role: 'navigation' }), second = element({ id: 'WDxLfe', role: 'navigation' });
  nested.nav.element(first); nested.nav.element(second); second.close(); first.close(); assert.equal(nested.context(), null);
  const duplicate = createHeaderInspector('es'); const nav = element({ id: 'yuynLe', role: 'navigation' });
  duplicate.nav.element(nav); menu(duplicate); menu(duplicate); nav.close(); assert.equal(duplicate.context(), null);
  const unclosed = createHeaderInspector('es'); const container = element({ id: 'yuynLe', role: 'navigation' });
  unclosed.nav.element(container); unclosed.anchor.element(element(base)); container.close(); assert.equal(unclosed.context(), null);
  const overlapping = createHeaderInspector('es'); const outer = element({ id: 'yuynLe', role: 'navigation' });
  overlapping.nav.element(outer); overlapping.anchor.element(element(base)); overlapping.anchor.element(element(base)); outer.close(); assert.equal(overlapping.context(), null);
  const empty = createHeaderInspector('es'); assert.equal(empty.context(), null);
});

test('rewrite requires the reviewed production policy and rechecks native URL identity', () => {
  const matches = inspect();
  for (const context of [null, { siteLanguage: 'en', headerLanguageAnchors: matches }, { siteLanguage: 'es' }, { siteLanguage: 'es', headerLanguageAnchors: [{ ordinal: -1, language: 'en' }] }])
    assert.equal(createHeaderLanguageRewrite(policy, context), null);
  assert.equal(createHeaderLanguageRewrite(null, { siteLanguage: 'es', headerLanguageAnchors: matches }), null);
  const rewrite = createHeaderLanguageRewrite(policy, { siteLanguage: 'es', headerLanguageAnchors: matches });
  rewrite.element(element(base));
  const mismatched = element({ ...base, 'data-level': '2', 'data-navtype': '2', 'data-type': '2', href: roots.en, 'data-url': roots.fr });
  rewrite.element(mismatched); assert.equal(mismatched.attributes.href, roots.en);
});

test('native Google wrappers and direct equivalent roots select the same reviewed service', () => {
  for (const mixed of [false, true]) {
    const matches = inspect({ wrapHref: true, mixed });
    assert.equal(matches.length, 3);
    const rewrite = createHeaderLanguageRewrite(policy, { siteLanguage: 'es', headerLanguageAnchors: matches });
    rewrite.element(element(base));
    for (const language of Object.keys(roots)) {
      const link = element({ ...base, 'data-level': '2', 'data-navtype': '2', 'data-type': '2',
        href: wrapped(roots[language]), 'data-url': mixed ? roots[language] : wrapped(roots[language]) });
      rewrite.element(link);
      assert.equal(link.attributes.href, policy.alternatives[language]);
      assert.equal(link.attributes['data-url'], policy.alternatives[language]);
    }
  }
});

test('ambiguous, non-root and unsafe Google wrappers never become language controls', () => {
  const invalid = [
    'https://www.google.com/url', 'https://www.google.com/url?sa=D',
    wrapped(roots.en) + '&q=' + encodeURIComponent(roots.fr),
    wrapped('https://evil.example/'), wrapped('javascript:alert(1)'),
    wrapped(roots.en + '?'), wrapped(roots.en + '?x=1'), wrapped(roots.en + '#'), wrapped(roots.en + '#x'),
    wrapped(roots.en + 'home'), wrapped('https://sites.google.com/panamalegallab.com/panamlegallab-fr/other-page'),
    'https://www.google.com.evil/url?q=' + encodeURIComponent(roots.en),
    'https://user:password@www.google.com/url?q=' + encodeURIComponent(roots.en),
    'https://www.google.com:8443/url?q=' + encodeURIComponent(roots.en),
    wrapped(roots.en) + '#', wrapped(roots.en) + '#x',
    'https://www.google.com/url?q=' + encodeURIComponent(roots.en) + '&sa=\nD',
    'https://www.google.com/url?q=' + encodeURIComponent(roots.en) + '&extra=' + 'x'.repeat(2048),
    wrapped(wrapped(roots.en)), roots.en + '?', roots.en + '#',
  ];
  for (const value of invalid) assert.equal(inspect({ child: { href: value, 'data-url': value } }), null, value);
});
