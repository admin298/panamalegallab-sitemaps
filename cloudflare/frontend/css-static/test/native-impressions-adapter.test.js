import test from 'node:test';
import assert from 'node:assert/strict';
import { withCssStatic, CSS_NATIVE_URL, CSS_ASSET_PATH } from '../src/css-static.js';
import { impressionDocument, impressionHeaders, readConfig, origin, VIEW_SCRIPTS,
  IMPRESSION_PREVIEW, ImpressionFixtureRewriter } from './fixtures/impression-fixtures.js';

const run = (html, url, environment, headers = impressionHeaders) => withCssStatic(
  new Response(html, { headers }), new Request(url), environment, { Rewriter: ImpressionFixtureRewriter });
const languages = ['es', 'en', 'fr', 'it'];

test('native impression policy is independent of CSS mapping across all four sites', async () => {
  for (const language of languages) {
    const html = impressionDocument(language, { css: false });
    const response = await run(html, origin(language) + '/', { PLL_CSS_STATIC: 'off', PLL_NATIVE_IMPRESSIONS: 'all' });
    const body = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await response.arrayBuffer());
    assert.equal(response.headers.get('X-PLL-Impression-Policy'), 'native-noop-v1-' + language, language);
    assert.equal(readConfig(body)[356], true);
    assert.equal(body, impressionDocument(language, { css: false, value: true }));
    assert.equal(response.headers.get('X-PLL-CSS-Policy'), null);
    assert.equal(response.headers.get('Content-Security-Policy'), impressionHeaders['Content-Security-Policy']);
    assert.equal(response.headers.get('X-Keep'), 'yes');
    assert.equal(response.headers.has('ETag'), false);
  }
});

test('native noop and exact CSS mapping compose without altering other source bytes or GA4', async () => {
  for (const language of languages) {
    const html = impressionDocument(language);
    const response = await run(html, origin(language) + '/', { PLL_CSS_STATIC: 'all', PLL_NATIVE_IMPRESSIONS: 'all' });
    const body = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await response.arrayBuffer());
    assert.equal(readConfig(body)[356], true, language);
    assert.equal(response.headers.get('X-PLL-Impression-Policy'), 'native-noop-v1-' + language);
    assert.equal(response.headers.get('X-PLL-CSS-Policy'), 'static-exact-v1-' + language);
    const withoutFallback = body.replace(/<script nonce="ValidNonce123" data-pll-css-fallback="v1">[\s\S]*?<\/script>/u, '');
    assert.equal(withoutFallback, impressionDocument(language, { value: true }).replace(CSS_NATIVE_URL, CSS_ASSET_PATH));
    assert.equal((body.match(/G-FNRPN562BY/gu) ?? []).length, 1);
  }
});

test('native modes and a preview-only control cannot be selected by public query parameters', async () => {
  for (const language of languages) {
    for (const mode of [undefined, 'off', 'invalid', 'preview', 'all']) {
      for (const preview of [false, true]) {
        const url = (preview ? IMPRESSION_PREVIEW + '/' + language : origin(language)) + '/';
        const expected = mode === 'all' || (mode === 'preview' && preview);
        const response = await run(impressionDocument(language), url, { PLL_CSS_STATIC: 'off', PLL_NATIVE_IMPRESSIONS: mode });
        assert.equal(readConfig(await response.text())[356], expected ? true : null, `${mode} ${language} ${preview}`);
      }
    }
    for (const preview of [false, true]) {
      const url = (preview ? IMPRESSION_PREVIEW + '/' + language : origin(language))
        + '/?_pll_native_impressions=control&PLL_NATIVE_IMPRESSIONS=off';
      const response = await run(impressionDocument(language), url, { PLL_CSS_STATIC: 'off', PLL_NATIVE_IMPRESSIONS: 'all' });
      assert.equal(readConfig(await response.text())[356], preview ? null : true);
    }
    for (const query of ['_pll_native_impressions=candidate', '_pll_native_impressions=unknown',
      '_pll_native_impressions=control&_pll_native_impressions=candidate']) {
      const response = await run(impressionDocument(language), IMPRESSION_PREVIEW + '/' + language + '/?' + query,
        { PLL_CSS_STATIC: 'off', PLL_NATIVE_IMPRESSIONS: 'preview' });
      assert.equal(readConfig(await response.text())[356], query.endsWith('=candidate') && !query.includes('&') ? true : null);
    }
  }
});

test('unknown or mismatched view bundles leave native config unchanged while valid CSS still works', async () => {
  for (const language of languages) {
    for (const viewUrl of [VIEW_SCRIPTS[language] + '/next', VIEW_SCRIPTS[language].replace('www.gstatic.com', 'evil.invalid'),
      VIEW_SCRIPTS[language === 'es' ? 'en' : 'es']]) {
      const response = await run(impressionDocument(language, { viewUrl }), origin(language) + '/',
        { PLL_CSS_STATIC: 'all', PLL_NATIVE_IMPRESSIONS: 'all' });
      const body = await response.text();
      assert.equal(response.headers.get('X-PLL-Impression-Policy'), null);
      assert.equal(readConfig(body)[356], null);
      assert.equal(response.headers.get('X-PLL-CSS-Policy'), 'static-exact-v1-' + language);
    }
  }
});

test('logger remains safe when CSS identity or style policy is unsupported', async () => {
  for (const language of languages) {
    const html = impressionDocument(language, { css: false });
    const response = await run(html, origin(language) + '/', { PLL_CSS_STATIC: 'all', PLL_NATIVE_IMPRESSIONS: 'all' },
      { ...impressionHeaders, 'Content-Security-Policy': impressionHeaders['Content-Security-Policy'] + "; style-src 'self'" });
    assert.equal(readConfig(await response.text())[356], true);
    assert.equal(response.headers.get('X-PLL-CSS-Policy'), null);
  }
});

test('unknown CSS version and integrity affect only CSS admission, not valid native impression admission', async () => {
  for (const language of languages) {
    const source = impressionDocument(language);
    for (const html of [source.replace(CSS_NATIVE_URL, CSS_NATIVE_URL + '/future'),
      source.replace('data-id="_cl"', 'data-id="_cl" integrity="sha256-native"')]) {
      const response = await run(html, origin(language) + '/', { PLL_CSS_STATIC: 'all', PLL_NATIVE_IMPRESSIONS: 'all' });
      assert.equal(readConfig(await response.text())[356], true);
      assert.equal(response.headers.get('X-PLL-Impression-Policy'), 'native-noop-v1-' + language);
      assert.equal(response.headers.get('X-PLL-CSS-Policy'), null);
    }
  }
});
