import test from 'node:test';
import assert from 'node:assert/strict';
import { clearEquivalentQueryConfig } from '../renderer/src/config-query.js';
import { PreviewCompatibilityError, SITES } from '../renderer/vendor/logic.js';

// Sanitized contract fixture derived from the four 2026-11-06 public captures.
// No Google keys, signed image references, nonces or captured source are stored.
const configFor = (upstream, length = 519) => Array.from({ length }, (_, index) =>
  index === 40 ? ['unrelated', { html: '<unchanged>', escape: '\\"' }]
    : index === 212 ? 0 : index === 316 ? upstream : index >= 514 ? 0 : null);
const scriptFor = config => ' \n_at_config = ' + JSON.stringify(config) + '; window.afterConfig = "unchanged";';
const planFor = (language = 'es', query = '') => ({ site: SITES[language],
  upstream: SITES[language].upstreamRoot + '/' + query });
const incompatible = (script, plan = planFor()) =>
  assert.throws(() => clearEquivalentQueryConfig(script, plan), PreviewCompatibilityError);

test('reviewed519 preserves every byte except the one redirect URL token in all four languages', () => {
  for (const language of ['es', 'en', 'fr', 'it']) {
    const plan = planFor(language), config = configFor(plan.upstream);
    const original = scriptFor(config), calls = [];
    const result = clearEquivalentQueryConfig(original, plan,
      { onExtendedValidated: () => calls.push('validated') });
    assert.equal(result, original.replace(JSON.stringify(plan.upstream), 'null'));
    assert.deepEqual(calls, ['validated']);
    assert.ok(result.includes('; window.afterConfig = "unchanged";'));
  }
});

test('historical518 stays accepted without opting into the extended native contract', () => {
  const plan = planFor(), original = scriptFor(configFor(plan.upstream, 518));
  let extended = 0;
  assert.equal(clearEquivalentQueryConfig(original, plan,
    { onExtendedValidated: () => { extended += 1; } }),
  original.replace(JSON.stringify(plan.upstream), 'null'));
  assert.equal(extended, 0);
});

test('reviewed519 only accepts the observed appended zero and rejects unknown lengths', () => {
  const plan = planFor(), base = configFor(plan.upstream);
  for (const value of [null, false, true, 1, '', '0', [], {}]) incompatible(scriptFor(base.with(518, value)));
  for (const length of [0, 317, 517, 520, 521]) incompatible(scriptFor(configFor(plan.upstream, length)));
});

test('reviewed519 retains URL, source identity and redirect-field guards', () => {
  const plan = planFor(), base = configFor(plan.upstream);
  for (const value of [null, false, 1, '0']) incompatible(scriptFor(base.with(212, value)));
  for (const value of [null, '', 'https://example.invalid/', SITES.en.upstreamRoot + '/',
    plan.upstream + '#fragment', plan.upstream + '?unexpected=1']) incompatible(scriptFor(base.with(316, value)));
  incompatible(scriptFor(base), { ...plan, site: { ...plan.site, upstreamPrefix: '/unreviewed' } });
  incompatible(scriptFor(base), { ...plan, upstream: 'https://sites.google.com/elsewhere/' });
});

test('reviewed519 preserves encoded query equivalence and rejects changed order or decoding', () => {
  const plan = planFor('fr', '?x=a%20b&x=%26%3D&empty=');
  const actual = plan.upstream.replace('a%20b', 'a+b');
  const original = scriptFor(configFor(actual));
  assert.equal(clearEquivalentQueryConfig(original, plan), original.replace(JSON.stringify(actual), 'null'));
  const bad = ['?x=%26%3D&x=a+b&empty=', '?x=a+b&x=%26%3D', '?x=a+b&x=%26%3D&empty=&extra=',
    '?x=a+b&x=%26%3D&empty=\u0000', '?x=a+b&x=%26%3D&empty=%ZZ', '?x=a+b&&x=%26%3D&empty='];
  for (const query of bad) incompatible(scriptFor(configFor(SITES.fr.upstreamRoot + '/' + query)), plan);
});

test('reviewed519 rejects malformed or repeated configuration instead of guessing', () => {
  const plan = planFor(), base = scriptFor(configFor(plan.upstream));
  for (const script of [base.replace('_at_config =', 'window._at_config ='),
    base.replace('; window.', ' window.'), base + '_at_config=[];',
    base.replace('[null,', '[invalid,'), base.replace('];', '],null;'),
    '_at_config = {};', '_at_config = [']) incompatible(script, plan);
  let callbacks = 0;
  assert.throws(() => clearEquivalentQueryConfig(scriptFor(configFor(plan.upstream).with(518, 1)),
    plan, { onExtendedValidated: () => { callbacks += 1; } }), PreviewCompatibilityError);
  assert.equal(callbacks, 0);
});
