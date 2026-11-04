import test from 'node:test';
import assert from 'node:assert/strict';
import { holdResponseSlot, BODY_DEADLINE_MS } from '../src/body-slot.js';

function clock() {
  let callback, cleared = 0;
  return { setTimeout(fn, delay) { assert.equal(delay, BODY_DEADLINE_MS); callback = fn; return 1; },
    clearTimeout(id) { assert.equal(id, 1); cleared += 1; }, fire() { callback(); }, get cleared() { return cleared; } };
}
test('response slot stays occupied until body EOF and preserves status/headers/bytes', async () => {
  let release = 0, complete;
  const timing = clock();
  const body = new ReadableStream({ start(controller) { complete = () => { controller.enqueue(new TextEncoder().encode('same')); controller.close(); }; } });
  const response = holdResponseSlot(new Response(body, { status: 201, headers: { 'X-Same': 'yes' } }), () => { release += 1; }, timing);
  assert.equal(release, 0); complete(); assert.equal(await response.text(), 'same');
  assert.equal(response.status, 201); assert.equal(response.headers.get('X-Same'), 'yes');
  assert.equal(release, 1); assert.equal(timing.cleared, 1);
});
test('cancel, failed source, and deadline each release exactly once and clear active timer', async () => {
  for (const condition of ['cancel', 'error', 'deadline']) {
    let release = 0, controller, cancelled = 0;
    const timing = clock();
    const body = new ReadableStream({ start(value) { controller = value; }, cancel() { cancelled += 1; } });
    const response = holdResponseSlot(new Response(body), () => { release += 1; }, timing);
    if (condition === 'cancel') await response.body.cancel();
    if (condition === 'error') { controller.error(Error('source')); await assert.rejects(response.text()); }
    if (condition === 'deadline') { timing.fire(); await assert.rejects(response.text()); }
    assert.equal(release, 1); assert.equal(timing.cleared, 1);
    assert.equal(cancelled, condition === 'error' ? 0 : 1);
  }
});
test('null body releases immediately without a timer', () => {
  let release = 0;
  const response = holdResponseSlot(new Response(null, { status: 204 }), () => { release += 1; },
    { setTimeout() { assert.fail('no body has no active timer'); } });
  assert.equal(release, 1); assert.equal(response.status, 204);
});

test('deadline racing with an already pending pull and client cancel cannot release twice', async () => {
  let release = 0, complete;
  const timing = clock();
  const body = new ReadableStream({ pull(controller) { return new Promise(resolve => { complete = () => { controller.close(); resolve(); }; }); } });
  const response = holdResponseSlot(new Response(body), () => { release += 1; }, timing);
  const reader = response.body.getReader();
  const pending = reader.read();
  await Promise.resolve();
  timing.fire();
  await assert.rejects(pending);
  await assert.rejects(reader.cancel());
  assert.equal(release, 1); assert.equal(timing.cleared, 1);
  // Cancellation may have closed the source before its held pull resolves.
  if (complete) { try { complete(); } catch {} }
});
