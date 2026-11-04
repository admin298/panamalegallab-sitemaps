import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { withImageFormat } from '../src/image-format.js';
import { IMAGE_PROFILES } from '../src/image-profiles.js';
const homeProfiles = IMAGE_PROFILES.filter(profile => profile.canonicalPath === '/');

const original = 'https://lh7-us.googleusercontent.com/sitesv-images-rt/Fresh_Token=w1280';
const nonce = 'ValidNonce123';
const preview = 'https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
const production = language => `https://${language === 'es' ? 'www' : language}.panamalegallab.com`;
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const csp = `script-src 'nonce-${nonce}'`;

function source(profile, name = 'normal') {
  const image = `<img class="${profile.imageClass}" role="${profile.imageRole}" alt="${escape(profile.imageAlt)}" src="${original}">`;
  const section = `<section id="${profile.sectionId}"><div class="wrapper"><div id="${profile.widgetId}"><div class="intermediate">${image}</div></div></div></section>`;
  const html = '<!doctype html><html><head><meta charset="utf-8">'
    + `<script nonce="${nonce}">window.currentImage=${JSON.stringify(original)};</script></head><body>`
    + `<div data-domain="${profile.dataDomain}" data-sitename="${profile.dataSiteName}"></div>`
    + '<div class="UtePc">' + section + '</div><p>Panamá, français, Italia 😀</p></body></html>';
  const cases = {
    normal: html,
    bom: '\ufeff' + html,
    duplicate: html.replace(image, image + image),
    duplicateSection: html.replace(section, section + section),
    wrongSite: html.replace(`data-sitename="${profile.dataSiteName}"`, 'data-sitename="other-site"'),
    wrongDomain: html.replace(`data-domain="${profile.dataDomain}"`, 'data-domain="other.example"'),
    hidden: html.replace('<img ', '<img hidden '),
    hiddenAncestor: html.replace('<div class="intermediate">', '<div class="intermediate" hidden>'),
    hiddenBetween: html.replace('<div class="wrapper">', '<div class="wrapper" style="display:none">'),
    srcset: html.replace('<img ', `<img srcset="${original} 1x" `),
    malicious: html.replaceAll(original, original.replace('lh7-us.googleusercontent.com', 'evil.example')),
    nonceMismatch: html.replace(`nonce="${nonce}"`, 'nonce="DifferentNonce123"'),
    metaCsp: html.replace('</head>', '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'"></head>'),
    noImage: html.replace(image, ''),
    wrongSection: html.replace(`id="${profile.sectionId}"`, 'id="other-section"'),
    wrongAlt: html.replace(`alt="${escape(profile.imageAlt)}"`, 'alt="Different reviewed image"'),
    alreadyWebp: html.replaceAll(original, original + '-rw'),
    missingNonce: html.replace(` nonce="${nonce}"`, ''),
  };
  return cases[name];
}

async function nativeScript() {
  const fixtures = Object.fromEntries(homeProfiles.map(profile => [profile.language,
    Object.fromEntries(['normal','bom','duplicate','duplicateSection','wrongSite','wrongDomain',
      'hidden','hiddenAncestor','hiddenBetween','srcset','malicious','nonceMismatch','metaCsp','noImage',
      'wrongSection','wrongAlt','alreadyWebp','missingNonce'].map(name => [name, source(profile, name)]))]));
  const bundle = await build({
    stdin: { contents: `
      import { withImageFormat } from './src/image-format.js';
      const fixtures = ${JSON.stringify(fixtures)};
      export default { async fetch(request, env) {
        const url = new URL(request.url);
        const language = url.searchParams.get('lang') || 'es';
        const name = url.searchParams.get('case') || 'normal';
        const input = fixtures[language][name];
        const response = new Response(request.method === 'HEAD' ? null : new TextEncoder().encode(input), {
          headers: {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'public, max-age=60',
            'Content-Security-Policy': ${JSON.stringify(csp)}, 'X-Existing':'preserved'}
        });
        return withImageFormat(response, request, env);
      }};`,
      sourcefile: 'native-image-format-synthetic.js',
      resolveDir: fileURLToPath(new URL('../', import.meta.url)),
    },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022',
  });
  return bundle.outputFiles[0].text;
}

function assertChanged(bytes, profile, name) {
  const value = bytes.toString('utf8');
  const fallback = value.match(/<script nonce="ValidNonce123" data-pll-image-fallback="v1">[\s\S]*?<\/script>/g);
  assert.equal(fallback?.length, 1, `${profile.language} ${name}: one nonce-authorized fallback`);
  assert.ok(value.indexOf(fallback[0]) < value.indexOf('<meta'), 'fallback precedes page resources');
  const withoutFallback = value.replace(fallback[0], '');
  assert.equal(withoutFallback, source(profile, name).replaceAll(original, original + '-rw'));
  assert.deepEqual(Buffer.from(withoutFallback.replaceAll(original + '-rw', original)),
    Buffer.from(source(profile, name)), 'all other bytes including BOM and non-ASCII remain exact');
}

test('native parser changes only the four unique reviewed process images with a nonce-authorized fallback', async () => {
  assert.equal(typeof withImageFormat, 'function');
  const script = await nativeScript();
  for (const mode of ['off', 'preview', 'all']) {
    const runtime = new Miniflare({ modules: true, script, compatibilityDate: '2026-07-30',
      bindings: { PLL_IMAGE_FORMAT: mode },
      outboundService() { assert.fail('Native image tests prohibit external requests.'); },
    });
    try {
      for (const profile of homeProfiles) {
        for (const name of ['normal', 'bom']) {
          for (const isPreview of [false, true]) {
            const url = (isPreview ? preview + '/' + profile.language : production(profile.language))
              + '/?lang=' + profile.language + '&case=' + name;
            const response = await runtime.dispatchFetch(url);
            const enabled = mode === 'all' || (mode === 'preview' && isPreview);
            assert.equal(response.status, 200);
            assert.equal(response.headers.get('X-PLL-Image-Policy'), enabled ? 'process-webp-v1-' + profile.language : null,
              `${mode} ${profile.language} ${name} ${isPreview}`);
            assert.equal(response.headers.get('Content-Security-Policy'), csp);
            assert.equal(response.headers.get('X-Existing'), 'preserved');
            const bytes = Buffer.from(await response.arrayBuffer());
            if (enabled) assertChanged(bytes, profile, name);
            else assert.deepEqual(bytes, Buffer.from(source(profile, name)));
          }
        }
        const control = await runtime.dispatchFetch(preview + '/' + profile.language + '/?lang=' + profile.language + '&_pll_speed=control');
        assert.equal(control.headers.get('X-PLL-Image-Policy'), null);
        assert.deepEqual(Buffer.from(await control.arrayBuffer()), Buffer.from(source(profile)));
        const head = await runtime.dispatchFetch(production(profile.language) + '/?lang=' + profile.language, { method: 'HEAD' });
        assert.equal(head.headers.get('X-PLL-Image-Policy'), null);
        assert.equal((await head.arrayBuffer()).byteLength, 0);
      }
      if (mode === 'all') {
        for (const profile of homeProfiles) {
          for (const name of ['duplicate','duplicateSection','wrongSite','wrongDomain','hidden','hiddenAncestor','hiddenBetween',
            'srcset','malicious','nonceMismatch','metaCsp','noImage','wrongSection','wrongAlt','alreadyWebp','missingNonce']) {
            const response = await runtime.dispatchFetch(production(profile.language) + '/?lang=' + profile.language + '&case=' + name);
            assert.equal(response.status, 200);
            assert.equal(response.headers.get('X-PLL-Image-Policy'), null, profile.language + ' ' + name);
            assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(source(profile, name)), profile.language + ' ' + name);
          }
          const productionControl = await runtime.dispatchFetch(production(profile.language) + '/?lang=' + profile.language + '&_pll_speed=control');
          assert.equal(productionControl.headers.get('X-PLL-Image-Policy'), 'process-webp-v1-' + profile.language);
          assertChanged(Buffer.from(await productionControl.arrayBuffer()), profile, 'normal');
          const commercial = await runtime.dispatchFetch(production(profile.language) + '/unreviewed-commercial-page?lang=' + profile.language);
          assert.equal(commercial.headers.get('X-PLL-Image-Policy'), null);
          assert.deepEqual(Buffer.from(await commercial.arrayBuffer()), Buffer.from(source(profile)));
        }
      }
    } finally { await runtime.dispose(); }
  }
});
