import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';
import data from '../data/readiness.json' with { type: 'json' };
import { SITES } from '../vendor/logic.js';

const fixtures = Object.fromEntries(Object.keys(SITES).map(language => {
  const html = readFileSync(new URL(`./fixtures/header-language-${language}.html`, import.meta.url), 'utf8');
  return [language, html.slice(html.indexOf('<header'), html.indexOf('</header>') + 9)];
}));
const company = Object.keys(data.languageLinks).filter(url => /\/(?:crear-empresa-en-panama|start-business-in-panama|creer-entreprise-au-panama|creazione-impresa-a-panama)$/.test(url));
const headerPart = html => html.slice(html.indexOf('<header'), html.indexOf('</header>') + 9);
const count = (text, value) => text.split(value).length - 1;
// The saved native fixtures select Contact in precisely three copies. The
// rendering candidate removes that unsupported link state independently of the
// language-menu rewrite. Keep the comparison exact for every other byte.
function expectedFixtureAria(html, url) {
  const site = Object.values(SITES).find(site => url.startsWith(site.productionOrigin + '/'));
  const contact = { es: 'contacto', en: 'contact-us', fr: 'contactez-nous', it: 'contatto' };
  const target = site.productionOrigin + '/' + contact[site.language];
  let changes = 0;
  const expected = html.replace(/<a\b[^>]*aria-selected="true"[^>]*>/gu, tag => {
    assert.ok(tag.includes('jsname="QwLHlb" role="link" tabindex="0" data-navtype="1"'));
    assert.ok(tag.includes(`href="${target}" data-url="${target}" data-type="1"`));
    changes += 1;
    const rewritten = tag.replace(' aria-selected="true"', '');
    return url === target ? rewritten.replace(/>$/u, ' aria-current="page">') : rewritten;
  });
  assert.equal(changes, 3, 'only the three known selected native fixture links may change');
  return expected;
}
function baselineWorker() {
  const bytes = readFileSync(new URL('../pages-upload-readiness-6fad6dd734ef.zip', import.meta.url));
  assert.equal(bytes.readUInt32LE(0), 0x04034b50);
  const start = 30 + bytes.readUInt16LE(26) + bytes.readUInt16LE(28);
  const code = inflateRawSync(bytes.subarray(start, start + bytes.readUInt32LE(18))).toString();
  assert.equal(createHash('sha256').update(code).digest('hex'), 'b5e12bf5f471d7e595c82dae36732d9cfb38f105aa6b632b2ac5b4dcad84318d');
  return code;
}

function envelope(site, upstream, header) {
  const config = Array.from({ length: 518 }, () => null);
  config[212] = 0;
  config[316] = upstream;
  return `<!doctype html><html lang="${site.language}"><head><title>Kept title</title><script nonce="header-native">_at_config = ${JSON.stringify(config)};</script></head><body><div data-domain="panamalegallab.com" data-sitename="${site.upstreamPrefix.split('/').at(-1)}"></div>${header}<h1>Kept heading</h1><iframe src="https://script.google.com/macros/s/unchanged/exec?lang=${site.language}"></iframe></body></html>`;
}

async function runtime(check, transformHeader = value => value) {
  const options = { modules: true, compatibilityDate: '2026-07-30',
    outboundService(request) {
      const site = Object.values(SITES).find(value => request.url.startsWith(value.upstreamRoot + '/'));
      assert.ok(site);
      return new Response(envelope(site, request.url, transformHeader(fixtures[site.language], site)), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "script-src 'nonce-header-native'" },
      });
    },
  };
  const worker = new Miniflare({ ...options, scriptPath: fileURLToPath(new URL('../dist/_worker.js', import.meta.url)) });
  const previous = new Miniflare({ ...options, script: baselineWorker() });
  try { await check(worker, previous); } finally { await Promise.all([worker.dispose(), previous.dispose()]); }
}

test('real four-language header menus preserve the service in href AND Sites data-url, in all three copies', async () => {
  await runtime(async worker => {
    for (const url of company) {
      const response = await worker.dispatchFetch(url);
      assert.equal(response.status, 200);
      const html = await response.text();
      const header = headerPart(html);
      for (const target of Object.values(data.languageLinks[url].alternatives)) {
        assert.equal(count(header, `href="${target}"`), 3, `${url}: href ${target}`);
        assert.equal(count(header, `data-url="${target}"`), 3, `${url}: data-url ${target}`);
      }
      assert.equal(response.headers.get('Content-Security-Policy'), "script-src 'nonce-header-native'");
      assert.ok(html.includes('<h1>Kept heading</h1>'));
      assert.ok(html.includes('<title>Kept title</title>'));
      assert.ok(html.includes(`src="https://script.google.com/macros/s/unchanged/exec?lang=${data.languageLinks[url].language}"`));
    }
  });
});

test('ordinary foreign-home navigation and the logo remain unchanged', async () => {
  const ordinary = '<a id="ordinary-home" jsname="QwLHlb" class="aJHbb" role="link" data-navtype="2" data-type="2" data-level="1" href="https://fr.panamalegallab.com/" data-url="https://fr.panamalegallab.com/">Partner homepage</a>';
  await runtime(async worker => {
    const response = await worker.dispatchFetch(company[0]);
    const html = await response.text();
    assert.equal(count(html, ordinary), 2);
    assert.ok(html.includes('jsname="jIujaf" href="https://www.panamalegallab.com/inicio"'));
  }, header => header.replaceAll('</nav>', ordinary + '</nav>'));
});

test('all 252 preferred pages preserve exact markup apart from nine menu targets and declared native ARIA', async () => {
  let links = 0;
  await runtime(async (worker, previous) => {
    const baselineHeaders = new Map();
    for (const [url, row] of Object.entries(data.languageLinks)) {
      const response = await worker.dispatchFetch(url);
      assert.equal(response.status, 200, url);
      const header = headerPart(await response.text());
      if (!baselineHeaders.has(row.language)) {
        const baseline = await previous.dispatchFetch(url);
        baselineHeaders.set(row.language, headerPart(await baseline.text()));
      }
      let expected = baselineHeaders.get(row.language);
      for (const [language, target] of Object.entries(row.alternatives)) {
        const root = SITES[language].productionOrigin + '/';
        expected = expected.replaceAll(`href="${root}"`, `href="${target}"`)
          .replaceAll(`data-url="${root}"`, `data-url="${target}"`);
        assert.equal(count(header, `href="${target}"`), 3, `${url}: ${language} href`);
        assert.equal(count(header, `data-url="${target}"`), 3, `${url}: ${language} data-url`);
        links += 3;
      }
      assert.equal(header, expectedFixtureAria(expected, url), `Only reviewed language targets and native ARIA may change: ${url}`);
    }
  });
  assert.equal(links, 2268);
});

test('real malformed native header groups retain their original attributes', async () => {
  const variants = [
    header => header.replaceAll('🌐 Idiomas', '🌐 Other'),
    header => header.replaceAll('aria-haspopup="true"', 'aria-haspopup="false"'),
    header => header.replaceAll('data-url="https://www.google.com/url?q=https%3A%2F%2Fen.panamalegallab.com%2F', 'data-url="https://www.google.com/url?q=https%3A%2F%2Ffr.panamalegallab.com%2F'),
    header => header.replaceAll('https%3A%2F%2Ffr.panamalegallab.com%2F', 'https%3A%2F%2Ffr.panamalegallab.com%2F%3Fx%3D1'),
    header => header.replaceAll(/(>🇮🇹 Italiano\s*)(<\/a>)/g, '$1<img alt="logo" src="https://example.invalid/a">$2'),
    header => header.replaceAll('id="WDxLfe"', 'id="yuynLe"'),
  ];
  for (const transform of variants) await runtime(async (worker, previous) => {
    const response = await worker.dispatchFetch(company[0]);
    const baseline = await previous.dispatchFetch(company[0]);
    assert.equal(headerPart(await response.text()), expectedFixtureAria(headerPart(await baseline.text()), company[0]));
  }, transform);
});

test('new unmapped pages preserve the native header without assuming translated equivalents', async () => {
  await runtime(async (worker, previous) => {
    const response = await worker.dispatchFetch('https://en.panamalegallab.com/new-published-page');
    const baseline = await previous.dispatchFetch('https://en.panamalegallab.com/new-published-page');
    assert.equal(headerPart(await response.text()), expectedFixtureAria(headerPart(await baseline.text()), 'https://en.panamalegallab.com/new-published-page'));
  });
});
