import test from 'node:test';
import assert from 'node:assert/strict';
import { createClientQuota } from '../src/quota.js';
import { isExpectedSiteMarker, makeDeliveryAttributeHandler } from '../src/html.js';
import { planDeliveryRequest } from '../src/plan.js';
import { SITES } from '../vendor/logic.js';

const request = client => new Request('https://it.panamalegallab.com/', {
  headers: client ? { 'CF-Connecting-IP': client } : {},
});

test('one visitor cannot consume another visitor local request allowance', () => {
  const quota = createClientQuota({ limit: 2 });
  assert.equal(quota(request('192.0.2.1'), 0), true);
  assert.equal(quota(request('192.0.2.1'), 0), true);
  assert.equal(quota(request('192.0.2.1'), 0), false);
  assert.equal(quota(request('192.0.2.2'), 0), true);
});

test('local quotas expire and return a visitor allowance on the next minute', () => {
  const quota = createClientQuota({ limit: 1 });
  assert.equal(quota(request('192.0.2.1'), 59_000), true);
  assert.equal(quota(request('192.0.2.1'), 59_500), false);
  assert.equal(quota(request('192.0.2.1'), 60_000), true);
});

test('client bucket storage stays bounded and old buckets expire before another client is admitted', () => {
  const quota = createClientQuota({ limit: 1, maxBuckets: 2 });
  assert.equal(quota(request('192.0.2.1'), 0), true);
  assert.equal(quota(request('192.0.2.2'), 0), true);
  assert.equal(quota(request('192.0.2.3'), 0), false);
  assert.equal(quota(request('192.0.2.3'), 60_000), true);
});

test('missing platform client metadata never creates a shared deny-all bucket', () => {
  const quota = createClientQuota({ limit: 1, maxBuckets: 1 });
  for (let index = 0; index < 3; index += 1) assert.equal(quota(request(), 0), true);
  assert.equal(quota(request('192.0.2.1'), 0), true);
});

test('public Site identity requires both exact markers for the expected language Site', () => {
  assert.equal(isExpectedSiteMarker('panamalegallab.com', 'panamlegallab-it', SITES.it), true);
  assert.equal(isExpectedSiteMarker('panamalegallab.com', 'panamalegallab', SITES.it), false);
  assert.equal(isExpectedSiteMarker('other.example', 'panamlegallab-it', SITES.it), false);
});

test('production attribute delivery changes owned links and CDN prefix, preserving other values', () => {
  const plan = planDeliveryRequest(SITES.it.productionOrigin + '/');
  for (const [attribute, original, expected] of [
    ['href', SITES.it.upstreamRoot + '/new', SITES.it.productionOrigin + '/new'],
    ['src', 'https://sites.google.com/sitesv-images-rt/token=w300', 'https://lh7-us.googleusercontent.com/sitesv-images-rt/token=w300'],
    ['src', 'https://script.google.com/public-app', 'https://script.google.com/public-app'],
  ]) {
    let value = original;
    makeDeliveryAttributeHandler(attribute, plan).element({ getAttribute: () => value, setAttribute: (_name, next) => { value = next; } });
    assert.equal(value, expected);
  }
});
