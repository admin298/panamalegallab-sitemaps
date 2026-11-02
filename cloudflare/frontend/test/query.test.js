import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { equivalentSourceQuery, clearEquivalentQueryConfig } from '../src/config-query.js';
import { SITES, PreviewCompatibilityError } from '../vendor/logic.js';

const base = SITES.es.upstreamRoot + '/contacto';
const token = value => JSON.stringify(value).replaceAll('=', '\\u003d').replaceAll('&', '\\u0026');
const fixture = readFileSync(new URL('./fixtures/query-normalization.html', import.meta.url), 'utf8');
const script = fixture.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
const actualUrl = base + '?utm_source=pll-pilot-qa&qa=%C3%B1&literal=/';
const upstream = base + '?utm_source=pll-pilot-qa&qa=%C3%B1&literal=%2F';
const plan = { site: SITES.es, upstream };

for (const [actual, expected] of [
  ['?literal=/', '?literal=%2F'],
  ['?q=alpha+beta', '?q=alpha%20beta'],
  ['?q=%2b', '?q=%2B'],
  ['?q=ñ', '?q=%C3%B1'],
  ['?a=1&a=2&literal=/', '?a=1&a=2&literal=%2F'],
  ['?a=x=y&literal=/', '?a=x%3Dy&literal=%2F'],
  ['?a%26b=x=y', '?a%26b=x%3Dy'],
  ['?a=&literal=/', '?a=&literal=%2F'],
  ['?flag=&literal=/', '?flag&literal=%2F'],
]) test(`query-equivalent ordered pairs are accepted: ${actual}`, () => {
  assert.equal(equivalentSourceQuery(base + actual, base + expected, SITES.es), true);
});

for (const [actual, expected] of [
  ['?q=%2B', '?q=+'],
  ['?a=x%26b%3Dy', '?a=x&b=y'],
  ['?a=1&b=2', '?b=2&a=1'],
  ['?a=1', '?a=1&a=1'],
  ['?a=1&a=2', '?a=2&a=1'],
  ['?a=1&literal=/', '?a=1&b=2&literal=%2F'],
  ['?a%3Db=x', '?a=b%3Dx'],
  ['?literal=%252F', '?literal=%2F'],
  ['?q=%FF', '?q=%EF%BF%BD'],
  ['?q=%', '?q=%25'],
  ['?q=%C3', '?q=%EF%BF%BD'],
  ['?q=\ud800', '?q=\ufffd'],
  ['?q=e\u0301', '?q=é'],
  ['?q=%0A', '?q=\n'],
  ['?a=1&&b=2', '?a=1&b=2'],
  ['?a=1&&b=2', '?a=1&=&b=2'],
  ['?&a=1', '?=&a=1'],
  ['?a=1&', '?a=1&='],
]) test(`changed or malformed query pairs stay different: ${JSON.stringify(actual)}`, () => {
  assert.equal(equivalentSourceQuery(base + actual, base + expected, SITES.es), false);
});

for (const actual of [
  base.replace('https://', 'http://') + '?literal=/',
  base.replace('sites.google.com', 'evil.example') + '?literal=/',
  base.replace('sites.google.com', 'sites.google.com:443') + '?literal=/',
  base.replace('sites.google.com', 'user:password@sites.google.com') + '?literal=/',
  base.replace('sites.google.com', '@sites.google.com') + '?literal=/',
  base.replace('sites.google.com', '%73ites.google.com') + '?literal=/',
  base.replace('/contacto', '/x/../contacto') + '?literal=/',
  base.replace('/contacto', '/contact%6F') + '?literal=/',
  base.replace('/contacto', '/contacto/') + '?literal=/',
  base.replace('/contacto', '\\contacto') + '?literal=/',
  base + '?literal=/#',
  base + '?literal=/#fragment',
  base + '?literal=/\n',
  base + '\t?literal=/',
]) test(`non-query URL bytes never normalize: ${JSON.stringify(actual)}`, () => {
  assert.equal(equivalentSourceQuery(actual, base + '?literal=%2F', SITES.es), false);
});

test('the relaxed comparison is confined to the exact fixed known public Site', () => {
  assert.equal(equivalentSourceQuery('https://evil.example/path?x=/', 'https://evil.example/path?x=%2F', SITES.es), false);
  assert.equal(equivalentSourceQuery(base + '?x=/', base + '?x=%2F', SITES.it), false);
  assert.equal(equivalentSourceQuery(base + '?x=/', base + '?x=%2F', {}), false);
  assert.equal(equivalentSourceQuery(null, upstream, SITES.es), false);
});

test('only316 is changed after ordered-query validation; every other config byte and suffix stays exact', () => {
  assert.equal(clearEquivalentQueryConfig(script, plan), script.replace(token(actualUrl), 'null'));
});

test('relaxed query validation never overrides schema212/length/duplicate/suffix guards', () => {
  for (const text of [
    script.replace(',0,', ',1,'),
    script.replace('];window', ',null];window'),
    `${script}\n${script}`,
    script.replace(token(actualUrl), 'null'),
    script.replace(token(actualUrl), token(base + '?qa=%C3%B1&utm_source=pll-pilot-qa&literal=/')),
    script.replace(token(actualUrl), token(base + '?utm_source=pll-pilot-qa&qa=%C3%B1&literal=/#')),
    'const unrelated = 1;',
    '_at_config = [null];',
  ]) assert.throws(() => clearEquivalentQueryConfig(text, plan), PreviewCompatibilityError);
});
