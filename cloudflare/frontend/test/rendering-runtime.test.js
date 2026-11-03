import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';
import { SITES } from '../vendor/logic.js';

const artifact = fileURLToPath(new URL('../dist/_worker.js', import.meta.url));
const HERO_LABEL = 'Servicios legales y corporativos en Panamá en un centro financiero internacional';
const LOGO_LABEL = 'Logo de Panamá Legal Lab con símbolo gráfico y nombre de la marca en naranja y blanco.';
const heroUrl = 'https://sites.google.com/sitesv-images-rt/synthetic-hero=w16383';
const heroCdn = heroUrl.replace('https://sites.google.com/', 'https://lh7-us.googleusercontent.com/');
const logoUrl = 'https://sites.google.com/sitesv-images-rt/synthetic-logo=w1280';
const logoCdn = logoUrl.replace('https://sites.google.com/', 'https://lh7-us.googleusercontent.com/');
const count = (html, text) => html.split(text).length - 1;
const config = upstream => {
  const value = Array.from({ length: 518 }, () => null);
  value[212] = 0; value[316] = upstream;
  return `<script nonce="kept">_at_config = ${JSON.stringify(value)};</script>`;
};
const nativeLink = (site, selected = 'true', extra = '') => `<a id="current" class="aJHbb dk90Ob jgXgSe HlqNPb" jscontroller="yUHiM" jsaction="rcuQ6b:WYd;" jsname="QwLHlb" role="link" tabindex="0" data-navtype="1" aria-selected="${selected}" href="${site.upstreamRoot}/inicio" data-url="${site.upstreamRoot}/inicio" data-type="1" data-level="1" ${extra}>Inicio</a>`;
const hero = (style = `background-position: center center; background-image: url(${heroUrl}); background-size: cover;`, label = HERO_LABEL) => `<div class="IFuOkc" jsname="LQX2Vd" role="img" aria-label="${label}" style="${style}"></div>`;
const logo = (extra = '', label = LOGO_LABEL) => `<div id="h.4a7e47a7ec29bfb_69"><div class="t3iYD"><img class="CENy8b" role="img" alt="${label}" src="${logoUrl}" ${extra}></div></div>`;

function source(site, upstream, change = value => value) {
  return change(`<!doctype html><html lang="${site.language}"><head><meta charset="utf-8"><title>Keep title</title><link rel="stylesheet" href="https://example.invalid/keep.css">${config(upstream)}</head><body><div data-domain="panamalegallab.com" data-sitename="${site.upstreamPrefix.split('/').at(-1)}"></div><header id="atIdViewHeader"><nav id="WDxLfe">${nativeLink(site)}</nav></header><section id="h.INITIAL_GRID.85u6di9ec7a5">${hero()}${logo()}</section><h1>Keep heading</h1><a id="ordinary" role="link" aria-selected="true" href="https://example.invalid/">Ordinary</a><div role="option" aria-selected="true">Selected option</div><iframe src="https://script.google.com/macros/s/unchanged/exec?lang=${site.language}"></iframe></body></html>`);
}

async function runtime(check, change, artifactPath = artifact) {
  let calls = 0;
  const worker = new Miniflare({ modules: true, scriptPath: artifactPath, compatibilityDate: '2026-07-30',
    outboundService(request) {
      calls += 1;
      const site = Object.values(SITES).find(value => request.url.startsWith(value.upstreamRoot + '/'));
      assert.ok(site);
      return new Response(source(site, request.url, change), { headers: {
        'Content-Type': 'text/html; charset=utf-8', Date: 'Tue, 03 Nov 2026 00:00:00 GMT',
        'Content-Security-Policy': "script-src 'nonce-kept'; style-src 'unsafe-inline'",
      } });
    },
  });
  try { await check(worker, () => calls); } finally { await worker.dispose(); }
}

const tag = (html, id) => html.match(new RegExp(`<[^>]+id="${id}"[^>]*>`))?.[0];

test('current ES home prioritizes exactly its same hero after charset and before native scripts', async () => {
  await runtime(async (worker, calls) => {
    const response = await worker.dispatchFetch('https://www.panamalegallab.com/');
    const html = await response.text();
    const preload = `<link rel="preload" as="image" fetchpriority="high" href="${heroCdn}">`;
    assert.equal(count(html, preload), 1);
    assert.ok(html.indexOf('<meta charset="utf-8">') < html.indexOf(preload));
    assert.ok(html.indexOf(preload) < html.indexOf('<script nonce="kept">'));
    assert.ok(html.indexOf('<meta charset="utf-8">') < 1024);
    assert.ok(!html.includes('crossorigin'));
    assert.ok(html.includes(`background-image: url(${heroCdn});`));
    assert.equal(calls(), 1, 'the hint must not fetch an image or a second HTML source');
    assert.equal(response.headers.get('Content-Security-Policy'), "script-src 'nonce-kept'; style-src 'unsafe-inline'");
  });
});

test('logo reserves the measured ratio without changing image URL, dimensions, role, alt or surrounding content', async () => {
  await runtime(async worker => {
    const response = await worker.dispatchFetch('https://www.panamalegallab.com/');
    const html = await response.text();
    const image = html.match(/<img[^>]+synthetic-logo[^>]*>/)?.[0];
    assert.ok(image.includes('aspect-ratio: auto 1168 / 854;'));
    assert.ok(image.includes(`src="${logoCdn}"`));
    assert.ok(image.includes(`alt="${LOGO_LABEL}"`));
    assert.ok(!/\s(?:width|height)=/.test(image));
    assert.ok(html.includes('<h1>Keep heading</h1>'));
    assert.ok(html.includes('src="https://script.google.com/macros/s/unchanged/exec?lang=es"'));
  });
});

test('native current link exposes aria-current while retaining its native click and selected classes', async () => {
  await runtime(async worker => {
    const response = await worker.dispatchFetch('https://www.panamalegallab.com/');
    const html = await response.text();
    const current = tag(html, 'current');
    assert.ok(!current.includes('aria-selected'));
    assert.ok(current.includes('aria-current="page"'));
    for (const value of ['role="link"', 'tabindex="0"', 'jscontroller="yUHiM"', 'jsaction="rcuQ6b:WYd;"', 'class="aJHbb dk90Ob jgXgSe HlqNPb"']) assert.ok(current.includes(value));
    assert.ok(html.includes('<a id="ordinary" role="link" aria-selected="true" href="https://example.invalid/">'));
    assert.ok(html.includes('<div role="option" aria-selected="true">'));
  });
});

test('preview ES home receives rendering fixes but keeps noindex and production-only SEO inactive', async () => {
  await runtime(async worker => {
    const response = await worker.dispatchFetch('https://speed-test.pll-seo-preview-20261102.pages.dev/es/');
    const html = await response.text();
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    assert.equal(count(html, 'fetchpriority="high"'), 1);
    assert.ok(html.includes('aspect-ratio: auto 1168 / 854;'));
    assert.ok(tag(html, 'current').includes('aria-current="page"'));
    assert.ok(!html.includes('<meta name="description"'));
    assert.ok(html.includes('<link rel="canonical" href="https://www.panamalegallab.com/">'));
  });
});

test('absent, repeated or changed hero and logo profiles conservatively keep their original rendering', async () => {
  const variants = [
    html => html.replace(hero(), ''),
    html => html.replace(hero(), hero() + hero()),
    html => html.replace(HERO_LABEL, 'Changed hero label'),
    html => html.replace(logo(), logo() + logo()),
    html => html.replace(LOGO_LABEL, 'Changed logo label'),
    html => html.replace(logoUrl, 'https://example.invalid/unapproved-logo'),
    html => html.replace(logo(), logo('style="aspect-ratio: 1 / 1"')),
    html => html.replace(logo(), logo('width="1168" height="854"')),
  ];
  for (const change of variants) await runtime(async worker => {
    const response = await worker.dispatchFetch('https://www.panamalegallab.com/');
    const html = await response.text();
    const changedSource = change(source(SITES.es, SITES.es.upstreamRoot + '/'));
    if (!changedSource.includes(HERO_LABEL) || count(changedSource, HERO_LABEL) !== 1) assert.ok(!html.includes('fetchpriority="high"'));
    if (count(changedSource, 'id="h.4a7e47a7ec29bfb_69"') !== 1 || !changedSource.includes(LOGO_LABEL)
      || changedSource.includes('example.invalid/unapproved-logo') || /aspect-ratio: 1 \/ 1|width="1168"/.test(changedSource)) {
      assert.ok(!html.includes('aspect-ratio: auto 1168 / 854;'));
    }
  }, change);
});

test('unapproved, ambiguous and escaped hero URLs never become a new preload', async () => {
  const values = ['http://lh7-us.googleusercontent.com/sitesv-images-rt/a', 'https://evil.invalid/a',
    'https://lh7-us.googleusercontent.com/not-images/a', 'https://u:p@lh7-us.googleusercontent.com/sitesv-images-rt/a',
    'https://lh7-us.googleusercontent.com:444/sitesv-images-rt/a', 'https://lh7-us.googleusercontent.com/sitesv-images-rt/a\\x',
    'https://lh7-us.googleusercontent.com/sitesv-images-rt/a%0Aevil'];
  for (const value of values) await runtime(async worker => {
    const response = await worker.dispatchFetch('https://www.panamalegallab.com/');
    assert.ok(!(await response.text()).includes('fetchpriority="high"'), value);
  }, html => html.replace(heroUrl, value));
});

test('existing equivalent image preload is retained once and attribute values remain escaped', async () => {
  await runtime(async worker => {
    const response = await worker.dispatchFetch('https://www.panamalegallab.com/');
    const html = await response.text();
    assert.equal(count(html, 'rel="preload"'), 1);
    assert.ok(html.includes(`href="${heroCdn}"`));
  }, html => html.replace('</head>', `<link rel="preload" as="image" href="${heroUrl}"></head>`));
  await runtime(async worker => {
    const response = await worker.dispatchFetch('https://www.panamalegallab.com/');
    const html = await response.text();
    assert.equal(count(html, 'fetchpriority="high"'), 1);
    assert.ok(html.includes('href="https://lh7-us.googleusercontent.com/sitesv-images-rt/synthetic-hero=w16383?x=1&amp;y=2"'));
  }, html => html.replaceAll(heroUrl, heroUrl + '?x=1&amp;y=2'));
});

test('other locales and non-home pages retain images and omit the ES home rendering profile', async () => {
  await runtime(async worker => {
    for (const url of ['https://www.panamalegallab.com/contacto', 'https://en.panamalegallab.com/',
      'https://fr.panamalegallab.com/', 'https://it.panamalegallab.com/']) {
      const response = await worker.dispatchFetch(url); const html = await response.text();
      assert.equal(response.status, 200);
      assert.ok(!html.includes('fetchpriority="high"'));
      assert.ok(!html.includes('aspect-ratio: auto 1168 / 854;'));
      assert.ok(html.includes(`src="${logoCdn}"`));
    }
  });
});

test('wrong Site and viewer configuration remain unavailable, and HEAD preserves its empty-body contract', async () => {
  await runtime(async worker => {
    const response = await worker.dispatchFetch('https://www.panamalegallab.com/', { method: 'HEAD' });
    assert.equal(response.status, 200); assert.equal(await response.text(), '');
  });
  await runtime(async worker => {
    const response = await worker.dispatchFetch('https://www.panamalegallab.com/');
    assert.equal(response.status, 503);
  }, html => html.replace('data-sitename="panamalegallab"', 'data-sitename="wrong-site"'));
  await runtime(async worker => {
    const response = await worker.dispatchFetch('https://www.panamalegallab.com/', { redirect: 'manual' });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('X-PLL-Delivery'), 'google-source-fallback');
  }, html => html.replace('"https://sites.google.com/panamalegallab.com/panamalegallab/"', '"https://evil.invalid/"'));
});

test('home aliases preserve native current semantics and uppercase equivalent preload is not duplicated', async () => {
  await runtime(async worker => {
    for (const url of ['https://www.panamalegallab.com/inicio', 'https://speed-test.pll-seo-preview-20261102.pages.dev/es/inicio']) {
      const response = await worker.dispatchFetch(url); const html = await response.text();
      assert.equal(response.status, 200); assert.equal(count(html, 'fetchpriority="high"'), 1);
      assert.ok(tag(html, 'current').includes('aria-current="page"'));
    }
  });
  await runtime(async worker => {
    const html = await (await worker.dispatchFetch('https://www.panamalegallab.com/')).text();
    assert.equal(count(html.toLowerCase(), 'rel="preload"'), 1);
    assert.ok(!html.includes('fetchpriority="high"'));
  }, html => html.replace('</head>', `<link rel="PRELOAD" as="IMAGE" href="${heroCdn}"></head>`));
});

test('native ancestor/false selections, author state and changed controllers are handled without touching other attributes', async () => {
  const variants = [
    { change: html => html.replace('aria-selected="true"', 'aria-selected="false"'), selected: false, current: false },
    { change: html => html.replaceAll(SITES.es.upstreamRoot + '/inicio', SITES.es.upstreamRoot + '/contacto'), selected: false, current: false },
    { change: html => html.replace('aria-selected="true"', 'aria-selected="true" aria-current="step"'), selected: false, current: 'step' },
    { change: html => html.replace('jscontroller="yUHiM"', 'jscontroller="changed"'), selected: true, current: false },
    { change: html => html.replace(`data-url="${SITES.es.upstreamRoot}/inicio"`, `data-url="${SITES.es.upstreamRoot}/contacto"`), selected: true, current: false },
    { change: html => html.replace('jscontroller="yUHiM" jsaction="rcuQ6b:WYd;"', '').replace('jgXgSe HlqNPb', 'hDrhEe HlqNPb'), selected: false, current: 'page' },
  ];
  for (const row of variants) await runtime(async worker => {
    const html = await (await worker.dispatchFetch('https://www.panamalegallab.com/')).text(); const link = tag(html, 'current');
    assert.equal(link.includes('aria-selected'), row.selected);
    assert.equal(link.includes('aria-current'), Boolean(row.current));
    if (row.current) assert.ok(link.includes(`aria-current="${row.current}"`));
    assert.ok(link.includes('role="link"')); assert.ok(link.includes('tabindex="0"'));
  }, row.change);
});

test('geometry control has exactly the same page and headers as full, with only the hero hint absent', async () => {
  let fullHtml; let fullHeaders;
  await runtime(async worker => {
    const response = await worker.dispatchFetch('https://speed-test.pll-seo-preview-20261102.pages.dev/es/');
    fullHtml = await response.text(); fullHeaders = [...response.headers];
  });
  await runtime(async worker => {
    const response = await worker.dispatchFetch('https://speed-test.pll-seo-preview-20261102.pages.dev/es/');
    const html = await response.text();
    assert.deepEqual([...response.headers], fullHeaders);
    assert.equal(html, fullHtml.replace(`<link rel="preload" as="image" fetchpriority="high" href="${heroCdn}">`, ''));
    assert.ok(html.includes('aspect-ratio: auto 1168 / 854;'));
    assert.ok(tag(html, 'current').includes('aria-current="page"'));
    assert.ok(!html.includes('fetchpriority="high"'));
  }, undefined, fileURLToPath(new URL('../dist-geometry/_worker.js', import.meta.url)));
});

test('real Google ordering keeps the existing late charset and places the hint before image preloader', async () => {
  const bootstrap = `<script nonce="kept">window.ppConfig={kept:true};/*${'native-bootstrap'.repeat(340)}*/</script>`;
  await runtime(async worker => {
    const html = await (await worker.dispatchFetch('https://www.panamalegallab.com/')).text();
    assert.equal(count(html, 'fetchpriority="high"'), 1);
    assert.equal(count(html, '<meta charset="utf-8">'), 1);
    assert.ok(html.includes('<head>' + bootstrap + '<meta charset="utf-8">'));
    assert.ok(html.indexOf('fetchpriority="high"') < html.indexOf('data-image-preloader="native"'));
    assert.ok(html.indexOf('<meta charset="utf-8">') > 1024, 'keep existing charset position; do not move native metadata');
  }, html => html.replace('<head>', '<head>' + bootstrap).replace('</head>',
    `<script nonce="kept" data-image-preloader="native">new Image().src = "${heroUrl}";</script></head>`));
});

test('a relevant native image preloader before the charset suppresses a late duplicate hint', async () => {
  await runtime(async worker => {
    const html = await (await worker.dispatchFetch('https://www.panamalegallab.com/')).text();
    assert.ok(!html.includes('fetchpriority="high"'));
  }, html => html.replace('<head>', `<head><script nonce="kept">new Image().src = "${heroUrl}";</script>`));
});
