import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { IMAGE_PROFILES } from '../src/image-profiles.js';

// Reviewed public records use ASCII escapes to preserve exact Unicode reliably.
// Origin tokens, source paths and probe notes are deliberately not deployable.
const expected = [
  {
    "language": "es",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamalegallab",
    "sectionId": "h.a7b918ebd00823c_757",
    "widgetId": "h.77306695899439f3_18",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Proceso de trabajo de Panama Legal Lab para servicios legales en Panam\u00e1: evaluaci\u00f3n inicial, revisi\u00f3n de viabilidad, preparaci\u00f3n documental, coordinaci\u00f3n profesional y seguimiento.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/"
  },
  {
    "language": "en",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-en",
    "sectionId": "h.43b40caf9fe02fb7_0",
    "widgetId": "h.43b40caf9fe02fb7_12",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "How Panama Legal Lab works for legal services in Panama, including initial assessment, viability review, document preparation, professional coordination, and follow-up.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/"
  },
  {
    "language": "fr",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-fr",
    "sectionId": "h.4667e1d775b5d54b_0",
    "widgetId": "h.4667e1d775b5d54b_12",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Processus de travail de Panama Legal Lab pour les services juridiques au Panama : \u00e9valuation du dossier, analyse de faisabilit\u00e9, pr\u00e9paration documentaire, coordination professionnelle et suivi.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/"
  },
  {
    "language": "it",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-it",
    "sectionId": "h.10e59a42a351e986_0",
    "widgetId": "h.10e59a42a351e986_12",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Processo di lavoro di Panama Legal Lab per servizi legali a Panama: valutazione iniziale, analisi di fattibilit\u00e0, preparazione documentale, coordinamento professionale e follow-up.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/"
  },
  {
    "language": "es",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamalegallab",
    "sectionId": "h.b6ffd859b1bde5a_755",
    "widgetId": "h.a7b918ebd00823c_143",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Requisitos para abrir una cuenta bancaria corporativa en Panam\u00e1.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/nuestros-servicios-en-panama/cuenta-bancaria-en-panama",
    "kind": "bank-corporate"
  },
  {
    "language": "en",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-en",
    "sectionId": "h.b6ffd859b1bde5a_755",
    "widgetId": "h.a7b918ebd00823c_143",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Requirements to open a corporate bank account in Panama.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/our-services-in-panama/bank-account-in-panama",
    "kind": "bank-corporate"
  },
  {
    "language": "fr",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-fr",
    "sectionId": "h.b6ffd859b1bde5a_755",
    "widgetId": "h.a7b918ebd00823c_143",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Conditions pour ouvrir un compte bancaire soci\u00e9t\u00e9 au Panama.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/nos-services-au-panama/compte-bancaire-au-panama",
    "kind": "bank-corporate"
  },
  {
    "language": "it",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-it",
    "sectionId": "h.b6ffd859b1bde5a_755",
    "widgetId": "h.a7b918ebd00823c_143",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Requisiti per aprire un conto bancario societario a Panama.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/i-nostri-servizi-a-panama/conto-bancario-a-panama",
    "kind": "bank-corporate"
  }
];
const sourceFields = ['language','dataDomain','dataSiteName','sectionId','widgetId',
  'imageClass','imageRole','imageAlt','sourceSuffix','hasSrcset'];
const homeFields = [...sourceFields, 'canonicalPath'].sort();
const bankFields = [...homeFields, 'kind'].sort();

test('exports exactly four home and four corporate-bank public profiles', () => {
  assert.deepEqual(IMAGE_PROFILES, expected);
  assert.equal(IMAGE_PROFILES.length, 8);
  assert.deepEqual(IMAGE_PROFILES.map(profile => profile.language),
    ['es','en','fr','it','es','en','fr','it']);
  assert.equal(new Set(IMAGE_PROFILES.map(profile => `${profile.language}:${profile.canonicalPath}`)).size, 8);
  for (const profile of IMAGE_PROFILES) {
    assert.deepEqual(Object.keys(profile).sort(), profile.kind === 'bank-corporate' ? bankFields : homeFields);
  }
});

test('preserves all four home identities and assigns exact bank canonical paths and kind', () => {
  assert.equal(IMAGE_PROFILES.filter(profile => profile.canonicalPath === '/').length, 4);
  for (const profile of IMAGE_PROFILES.slice(0, 4)) {
    assert.equal(profile.canonicalPath, '/');
    assert.equal(Object.hasOwn(profile, 'kind'), false);
  }
  assert.equal(IMAGE_PROFILES.filter(profile => profile.kind === 'bank-corporate').length, 4);
  for (const [index, profile] of IMAGE_PROFILES.slice(4).entries()) {
    assert.equal(profile.kind, 'bank-corporate');
    assert.equal(profile.canonicalPath, expected[index + 4].canonicalPath);
    assert.notEqual(profile.canonicalPath, '/');
  }
});

test('records contain only primitive public structural identity', () => {
  for (const profile of IMAGE_PROFILES) {
    assert.equal(profile.dataDomain, 'panamalegallab.com');
    assert.equal(profile.imageClass, 'CENy8b');
    assert.equal(profile.imageRole, 'img');
    assert.equal(profile.hasSrcset, false);
    for (const [field, value] of Object.entries(profile)) {
      assert.equal(typeof value, field === 'hasSrcset' ? 'boolean' : 'string', field);
      if (typeof value === 'string') assert.notEqual(value, '', field);
    }
  }
});

test('array and every profile are frozen and cannot gain fields or change identity', () => {
  assert.equal(Object.isFrozen(IMAGE_PROFILES), true);
  assert.throws(() => IMAGE_PROFILES.push({ language: 'xx' }), TypeError);
  for (const profile of IMAGE_PROFILES) {
    assert.equal(Object.isFrozen(profile), true);
    assert.equal(Reflect.set(profile, 'language', 'xx'), false);
    assert.equal(Reflect.set(profile, 'sourceEvidence', 'must not be deployable'), false);
  }
  assert.deepEqual(IMAGE_PROFILES, expected);
});

test('Unicode is intact and both cohorts match authoritative local evidence when available', async t => {
  assert.equal(JSON.stringify(IMAGE_PROFILES).includes('\uFFFD'), false);
  assert.equal(JSON.stringify(expected).includes('\uFFFD'), false);
  const homeEvidence = new URL('../../image-probe/process-source-profiles.json', import.meta.url);
  const bankEvidence = new URL('../../image-probe/commercial/bank-source-profiles.json', import.meta.url);
  if (existsSync(homeEvidence) && existsSync(bankEvidence)) {
    const homes = JSON.parse(await readFile(homeEvidence, 'utf8')).profiles;
    const banks = JSON.parse(await readFile(bankEvidence, 'utf8')).profiles;
    const pick = profile => Object.fromEntries(sourceFields.map(field => [field, profile[field]]));
    const authoritative = [
      ...homes.map(profile => ({ ...pick(profile), canonicalPath: '/' })),
      ...banks.map(profile => ({ ...pick(profile), canonicalPath: new URL(profile.pageUrl).pathname, kind: 'bank-corporate' })),
    ];
    assert.deepEqual(IMAGE_PROFILES, authoritative);
    assert.deepEqual(expected, authoritative);
    t.diagnostic('Checked all eight records directly against both local authoritative JSON files.');
  } else {
    assert.deepEqual(IMAGE_PROFILES, expected);
    t.diagnostic('Portable mode: reviewed ASCII-escaped expected records checked; external probe evidence is not packaged.');
  }
});
