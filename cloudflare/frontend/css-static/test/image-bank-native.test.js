import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { withImageFormat } from '../src/image-format.js';

// Independent identities reviewed in the four captured bank-page IMG tags.
const banks = [
  ['es', 'panamalegallab', '/nuestros-servicios-en-panama/cuenta-bancaria-en-panama',
    'Requisitos para abrir una cuenta bancaria corporativa en Panam\u00e1.', '/nuestros-servicios-en-panama/crear-empresa-en-panama'],
  ['en', 'panamlegallab-en', '/our-services-in-panama/bank-account-in-panama',
    'Requirements to open a corporate bank account in Panama.', '/our-services-in-panama/start-business-in-panama'],
  ['fr', 'panamlegallab-fr', '/nos-services-au-panama/compte-bancaire-au-panama',
    'Conditions pour ouvrir un compte bancaire soci\u00e9t\u00e9 au Panama.', '/nos-services-au-panama/creer-entreprise-au-panama'],
  ['it', 'panamlegallab-it', '/i-nostri-servizi-a-panama/conto-bancario-a-panama',
    'Requisiti per aprire un conto bancario societario a Panama.', '/i-nostri-servizi-a-panama/creazione-impresa-a-panama'],
].map(([language, siteName, path, alt, otherPath]) => ({ language, siteName, path, alt, otherPath }));
const original = 'https://lh7-us.googleusercontent.com/sitesv-images-rt/Fresh_Corporate_Token=w1280';
const nonce = 'ValidNonce123';
const origin = language => `https://${language === 'es' ? 'www' : language}.panamalegallab.com`;
const escape = value => value.replaceAll('&','&amp;').replaceAll('"','&quot;');
function source(bank, wrongWidget = false) {
  return '<!doctype html><html><head><meta charset="utf-8">'
    + `<script nonce="${nonce}">window.currentBankImage=${JSON.stringify(original)};</script></head><body>`
    + `<div data-domain="panamalegallab.com" data-sitename="${bank.siteName}"></div>`
    + '<div class="UtePc"><section id="h.b6ffd859b1bde5a_755"><div class="wrapper">'
    + `<div id="${wrongWidget ? 'wrong-widget' : 'h.a7b918ebd00823c_143'}"><div><img class="CENy8b" role="img" alt="${escape(bank.alt)}" src="${original}"></div></div>`
    + '</div></section></div><p>Panamá, français, società 😀</p></body></html>';
}

test('native bank format is limited to four exact commercial paths and reviewed widget identities', async () => {
  assert.equal(typeof withImageFormat, 'function');
  const fixtures = Object.fromEntries(banks.map(bank => [bank.language, { normal: source(bank), wrongWidget: source(bank, true) }]));
  const bundled = await build({ stdin: {
    contents: `import {withImageFormat} from './src/image-format.js';
      const fixtures=${JSON.stringify(fixtures)};
      export default {async fetch(request,env){const query=new URL(request.url).searchParams;
        return withImageFormat(new Response(fixtures[query.get('fixture')][query.get('case')||'normal'],
          {headers:{'Content-Type':'text/html; charset=utf-8', 'Content-Security-Policy':${JSON.stringify(`script-src 'nonce-${nonce}'`)}}}),request,env);
      }};`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)), sourcefile: 'native-bank-synthetic.js',
  }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  const runtime = new Miniflare({ modules: true, script: bundled.outputFiles[0].text,
    compatibilityDate: '2026-07-30', bindings: { PLL_IMAGE_FORMAT: 'all' },
    outboundService() { assert.fail('Bank native tests prohibit external requests.'); } });
  try {
    for (const bank of banks) {
      const response = await runtime.dispatchFetch(origin(bank.language) + bank.path + '?fixture=' + bank.language);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('X-PLL-Image-Policy'), 'bank-corporate-webp-v1-' + bank.language, bank.language);
      const actual = Buffer.from(await response.arrayBuffer()).toString('utf8');
      const fallback = actual.match(/<script nonce="ValidNonce123" data-pll-image-fallback="v1">[\s\S]*?<\/script>/g);
      assert.equal(fallback?.length, 1);
      assert.ok(actual.indexOf(fallback[0]) < actual.indexOf('<meta'));
      assert.equal(actual.replace(fallback[0], ''), source(bank).replaceAll(original, original + '-rw'));
      for (const [path, fixture] of [['/', 'normal'], [bank.otherPath, 'normal'], [bank.path, 'wrongWidget']]) {
        const negative = await runtime.dispatchFetch(origin(bank.language) + path + '?fixture=' + bank.language + '&case=' + fixture);
        assert.equal(negative.status, 200);
        assert.equal(negative.headers.get('X-PLL-Image-Policy'), null, bank.language + ' ' + path + ' ' + fixture);
        assert.deepEqual(Buffer.from(await negative.arrayBuffer()), Buffer.from(fixture === 'normal' ? source(bank) : source(bank, true)));
      }
    }
  } finally { await runtime.dispose(); }
});
