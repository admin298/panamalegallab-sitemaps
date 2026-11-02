import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';

const artifact = fileURLToPath(new URL('../dist/_worker.js', import.meta.url));
const fixture = readFileSync(new URL('./fixtures/query-normalization.html', import.meta.url), 'utf8');
const source = 'https://sites.google.com/panamalegallab.com/panamalegallab/contacto';
const rawQuery = '?utm_source=pll-pilot-qa&qa=%C3%B1&literal=%2F';
const currentMeta = source + '?utm_source=pll-pilot-qa&qa=%C3%B1&literal=/';
const publicUrl = 'https://www.panamalegallab.com/contacto' + rawQuery;
const token = value => JSON.stringify(value).replaceAll('=', '\\u003d').replaceAll('&', '\\u0026');
const configScript = fixture.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];

async function withRuntime(html, check) {
  const seen = [];
  const runtime = new Miniflare({ modules: true, scriptPath: artifact, compatibilityDate: '2026-07-30',
    outboundService(request) {
      seen.push(request.url);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "script-src 'nonce-query-regression-nonce'" } });
    } });
  try { await check(runtime, seen); } finally { await runtime.dispose(); }
}

test('observed Google encoded-slash query normalization keeps production GET/HEAD200 and only316 changes', async () => {
  await withRuntime(fixture, async (runtime, seen) => {
    for (const method of ['GET', 'HEAD']) {
      const response = await runtime.dispatchFetch(publicUrl, { method, redirect: 'manual' });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Location'), null);
      assert.equal(response.headers.get('X-PLL-Delivery'), null);
      assert.equal(response.headers.get('X-Robots-Tag'), null);
      assert.equal(response.headers.get('Content-Security-Policy'), "script-src 'nonce-query-regression-nonce'");
      const html = await response.text();
      if (method === 'HEAD') assert.equal(html, '');
      else {
        assert.ok(html.includes(configScript.replace(token(currentMeta), 'null')));
        assert.ok(html.includes('nonce="query-regression-nonce"'));
        assert.ok(html.includes('<link rel="canonical" href="https://www.panamalegallab.com/contacto">'));
      }
    }
    assert.deepEqual(seen, [source + rawQuery, source + rawQuery]);
  });
});

test('query retry cannot hide schema drift, duplicate configuration, changed origin/path or changed parameter order', async () => {
  const cases = [
    fixture.replace(',0,', ',1,'),
    fixture.replace(configScript, configScript.replace('];window', ',null];window')),
    fixture.replace(configScript, `${configScript}\n${configScript}`),
    fixture.replace(token(currentMeta), token(currentMeta.replace('https://sites.google.com', 'https://evil.example'))),
    fixture.replace(token(currentMeta), token(currentMeta.replace('/contacto?', '/other?'))),
    fixture.replace(token(currentMeta), token(source + '?qa=%C3%B1&utm_source=pll-pilot-qa&literal=/')),
    fixture.replace(token(currentMeta), token(source + '?utm_source=pll-pilot-qa&literal=/')),
    fixture.replace(token(currentMeta), token(currentMeta + '&qa=%C3%B1')),
    fixture.replace(token(currentMeta), token(currentMeta + '#')),
  ];
  for (const html of cases) await withRuntime(html, async runtime => {
    const response = await runtime.dispatchFetch(publicUrl, { redirect: 'manual' });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), source + rawQuery);
    assert.equal(response.headers.get('X-PLL-Delivery'), 'google-source-fallback');
    assert.equal(response.headers.get('X-Robots-Tag'), null);
  });
});

test('query retry captures a split-size script and resets between neighboring script nodes', async () => {
  const padded = configScript + '/*' + 'padding'.repeat(12_000) + '*/';
  const html = fixture.replace(configScript, padded)
    .replace('<head>', '<head><script>const before = "preserved";</script>')
    .replace('</head>', '<script>const after = "preserved";</script></head>');
  await withRuntime(html, async runtime => {
    const response = await runtime.dispatchFetch(publicUrl, { redirect: 'manual' });
    assert.equal(response.status, 200);
    const result = await response.text();
    assert.ok(result.includes(padded.replace(token(currentMeta), 'null')));
    assert.ok(result.includes('const before = "preserved";'));
    assert.ok(result.includes('const after = "preserved";'));
  });
});
