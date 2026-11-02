import test from 'node:test';
import assert from 'node:assert/strict';
import { planDeliveryRequest, rewriteProductionUrl } from '../src/plan.js';
import { KNOWN_PATHS, REDIRECTS } from '../vendor/routes-data.js';

const previewDomain = 'pll-seo-preview-20261102.pages.dev';
const sites = Object.freeze(Object.fromEntries([
  ['es', 'www', 'panamalegallab', 'inicio'],
  ['en', 'en', 'panamlegallab-en', 'home'],
  ['fr', 'fr', 'panamlegallab-fr', 'accueil'],
  ['it', 'it', 'panamlegallab-it', 'inizio'],
].map(([language, host, slug, homeAlias]) => [language, Object.freeze({
  language, homeAlias, productionHost: `${host}.panamalegallab.com`,
  productionOrigin: `https://${host}.panamalegallab.com`,
  upstreamRoot: `https://sites.google.com/panamalegallab.com/${slug}`,
  upstreamPrefix: `/panamalegallab.com/${slug}`,
})])));
const options = Object.freeze({ previewDomain, sites,
  knownPaths: Object.freeze(Object.fromEntries(Object.keys(sites).map(language => [language, ['/', `/${sites[language].homeAlias}`, '/known-page']]))),
  redirects: Object.freeze({
    'https://www.panamalegallab.com/old-page': 'https://www.panamalegallab.com/known-page',
    'https://it.panamalegallab.com/vecchia-pagina': 'https://it.panamalegallab.com/known-page',
  }),
});
const plan = (url, method = 'GET') => planDeliveryRequest(url, method, options);

test('the full reviewed145 redirect matrix preserves exact targets and encoded queries', () => {
  assert.equal(Object.keys(REDIRECTS).length, 145);
  for (const [source, target] of Object.entries(REDIRECTS)) {
    const result = planDeliveryRequest(source + '?utm_source=test&a=1%202');
    assert.equal(result.status, 301);
    assert.equal(result.location, target + '?utm_source=test&a=1%202');
    assert.equal(result.indexable, true);
  }
});

test('all256 current native production routes stay200 plans with the252 preferred canonical destinations', () => {
  let total = 0;
  const canonicals = new Set();
  for (const [language, paths] of Object.entries(KNOWN_PATHS)) for (const path of paths) {
    const result = planDeliveryRequest(sites[language].productionOrigin + path);
    assert.equal(result.kind, 'page');
    assert.equal(result.indexable, true);
    canonicals.add(result.canonical);
    total += 1;
  }
  assert.equal(total, 256);
  assert.equal(canonicals.size, 252);
});

for (const site of Object.values(sites)) {
  test(`${site.language}: exact production host serves its native root without a locale prefix`, () => {
    const result = plan(`${site.productionOrigin}/`);
    assert.equal(result.kind, 'page');
    assert.equal(result.mode, 'production');
    assert.equal(result.site.language, site.language);
    assert.equal(result.upstream, `${site.upstreamRoot}/`);
    assert.equal(result.canonical, `${site.productionOrigin}/`);
    assert.equal(result.indexable, true);
  });

  test(`${site.language}: homepage alias remains a page with root canonical`, () => {
    const result = plan(`${site.productionOrigin}/${site.homeAlias}?utm_source=test`);
    assert.equal(result.kind, 'page');
    assert.equal(result.path, `/${site.homeAlias}`);
    assert.equal(result.canonical, `${site.productionOrigin}/`);
  });

  test(`${site.language}: an unpublished manifest entry can reach only this fixed public Site`, () => {
    const result = plan(`${site.productionOrigin}/new-public-page/ni%C3%B1o`);
    assert.equal(result.kind, 'page');
    assert.equal(result.upstream, `${site.upstreamRoot}/new-public-page/ni%C3%B1o`);
    assert.equal(result.canonical, `${site.productionOrigin}/new-public-page/ni%C3%B1o`);
  });

  test(`${site.language}: preview page remains prefixed and noindex`, () => {
    const result = plan(`https://${previewDomain}/${site.language}/known-page`);
    assert.equal(result.kind, 'page');
    assert.equal(result.mode, 'preview');
    assert.equal(result.site.language, site.language);
    assert.equal(result.indexable, false);
    assert.equal(result.canonical, `${site.productionOrigin}/known-page`);
  });

  test(`${site.language}: production search uses exact host language and is noindex`, () => {
    const result = plan(`${site.productionOrigin}/_/search?query=residencia+Espa%C3%B1a&scope=site&showCloudSearchTab=false`);
    assert.equal(result.kind, 'page');
    assert.equal(result.searchPage, true);
    assert.equal(result.site.language, site.language);
    assert.equal(result.indexable, false);
    assert.equal(result.upstream, `https://sites.google.com/search${site.upstreamPrefix}?query=residencia+Espa%C3%B1a&scope=site&showCloudSearchTab=false`);
  });

  test(`${site.language}: exact anonymous Search POST route is admitted`, () => {
    const result = plan(`${site.productionOrigin}/_/view/search${site.upstreamPrefix}?authuser=0`, 'POST');
    assert.equal(result.kind, 'search-post');
    assert.equal(result.indexable, false);
    assert.equal(result.upstream, `https://sites.google.com/_/view/search${site.upstreamPrefix}`);
  });

  test(`${site.language}: reloading Search page2 keeps the exact public cursor`, () => {
    const result = plan(`${site.productionOrigin}/_/search?query=residencia&scope=site&showCloudSearchTab=false&page_token=CI7RkOmZNBAK`);
    assert.equal(result.kind, 'page');
    assert.equal(result.searchPage, true);
    assert.equal(result.upstream, `https://sites.google.com/search${site.upstreamPrefix}?query=residencia&scope=site&showCloudSearchTab=false&page_token=CI7RkOmZNBAK`);
    assert.equal(result.indexable, false);
  });
}

test('legacy redirect preserves the visitor query and reviewed target', () => {
  const result = plan('https://www.panamalegallab.com/old-page?utm_source=search&a=1%202');
  assert.equal(result.kind, 'redirect');
  assert.equal(result.status, 301);
  assert.equal(result.location, 'https://www.panamalegallab.com/known-page?utm_source=search&a=1%202');
  assert.equal(result.indexable, true);
});

test('production HTTP GET redirects to the exact same HTTPS host/path/query before fetch', () => {
  const result = plan('http://www.panamalegallab.com/known-page?utm_source=search&a=1%202');
  assert.equal(result.kind, 'redirect');
  assert.equal(result.status, 301);
  assert.equal(result.location, 'https://www.panamalegallab.com/known-page?utm_source=search&a=1%202');
});

test('production HTTP HEAD has the same HTTPS redirect', () => {
  const result = plan('http://it.panamalegallab.com/known-page?x=1', 'HEAD');
  assert.equal(result.status, 301);
  assert.equal(result.location, 'https://it.panamalegallab.com/known-page?x=1');
});

test('production HTTP legacy path redirects directly to its reviewed final HTTPS target', () => {
  assert.equal(plan('http://www.panamalegallab.com/old-page?x=1').location,
    'https://www.panamalegallab.com/known-page?x=1');
});

test('preview HTTP stays rejected instead of being promoted through the Search route', () => {
  assert.equal(plan(`http://${previewDomain}/search${sites.es.upstreamPrefix}?query=x&scope=site&showCloudSearchTab=false`).status, 400);
});

test('production HTTP Search POST never redirects or forwards its body', () => {
  const result = plan(`http://it.panamalegallab.com/_/view/search${sites.it.upstreamPrefix}`, 'POST');
  assert.equal(result.kind, 'error');
  assert.equal(result.status, 400);
});

test('a locale prefix is not stripped from a production visitor path', () => {
  const result = plan('https://www.panamalegallab.com/en/a-new-page');
  assert.equal(result.site.language, 'es');
  assert.equal(result.path, '/en/a-new-page');
  assert.equal(result.upstream, `${sites.es.upstreamRoot}/en/a-new-page`);
});

test('preview unknown pages stay closed until separately validated', () => {
  assert.equal(plan(`https://${previewDomain}/en/not-in-manifest`).status, 404);
});

test('the project deployment host retains preview restrictions', () => {
  const result = plan(`https://975cec6d.${previewDomain}/it/known-page`);
  assert.equal(result.mode, 'preview');
  assert.equal(result.indexable, false);
});

for (const host of ['panamalegallab.com', 'attacker.example', 'www.panamalegallab.com.attacker.example', 'unrelated.pages.dev']) {
  test(`unknown host is not an origin proxy: ${host}`, () => {
    assert.equal(plan(`https://${host}/known-page`).status, 421);
  });
}

for (const url of [
  'https://user:password@www.panamalegallab.com/known-page',
  'https://www.panamalegallab.com/a/../known-page',
  'https://www.panamalegallab.com/%2e%2e/known-page',
  'https://www.panamalegallab.com/%2F%2Fevil.example',
  'https://www.panamalegallab.com/a%5cb',
  'https://www.panamalegallab.com/a%252fb',
  'https://www.panamalegallab.com/a%00b',
  'https://www.panamalegallab.com/%ff',
]) {
  test(`unsafe public path or authority is rejected before fetch: ${url}`, () => {
    assert.equal(plan(url).status, 400);
  });
}

test('an unapproved authority port is rejected without fetching an origin', () => {
  assert.equal(plan('https://www.panamalegallab.com:8443/known-page').status, 421);
});

for (const path of ['/_/view/cspreport', '/_/unobserved-rpc', '/search/unknown/site']) {
  test(`unknown Google endpoint remains closed: ${path}`, () => {
    assert.equal(plan(`https://www.panamalegallab.com${path}`, 'POST').status, 405);
  });
}

test('production Search cannot use another language slug', () => {
  assert.equal(plan(`https://it.panamalegallab.com/_/view/search${sites.es.upstreamPrefix}`, 'POST').status, 404);
});

test('production GET Search rejects foreign-site route', () => {
  assert.equal(plan(`https://it.panamalegallab.com/search${sites.fr.upstreamPrefix}?query=x&scope=site&showCloudSearchTab=false`).status, 404);
});

test('production URL rewriting sends known Google paths to native production paths', () => {
  const rewritten = rewriteProductionUrl(`${sites.fr.upstreamRoot}/guide?x=1#partie`, sites);
  assert.equal(rewritten, `${sites.fr.productionOrigin}/guide?x=1#partie`);
});

test('production URL rewriting unwraps only a single reviewed Google wrapper target', () => {
  const target = `${sites.it.productionOrigin}/guida?x=1#parte`;
  const rewritten = rewriteProductionUrl(`https://www.google.com/url?q=${encodeURIComponent(target)}&sa=D`, sites);
  assert.equal(rewritten, target);
});

for (const value of [
  '#section', '/new-local-page', 'https://external.example/path',
  'https://sites.google.com/panamalegallab.com/not-an-approved-site/path',
  'https://www.google.com/url?q=https%3A%2F%2Fexternal.example%2F',
  'https://www.google.com/url?q=https%3A%2F%2Fit.panamalegallab.com%2F&q=https%3A%2F%2Fexternal.example',
]) {
  test(`unapproved or local links are preserved: ${value}`, () => {
    assert.equal(rewriteProductionUrl(value, sites), value);
  });
}
