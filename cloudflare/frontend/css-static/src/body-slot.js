export const BODY_DEADLINE_MS = 30_000;

// Bound retained response memory as well as active rendering. No timer survives a response.
export function holdResponseSlot(response, release, timing = globalThis) {
  if (!response.body) { release(); return response; }
  const reader = response.body.getReader();
  let finished = false, timer;
  const finish = () => {
    if (finished) return false;
    finished = true;
    timing.clearTimeout(timer);
    release();
    return true;
  };
  const body = new ReadableStream({
    start(controller) {
      timer = timing.setTimeout(() => {
        if (!finish()) return;
        controller.error(new Error('Response delivery deadline exceeded.'));
        reader.cancel().catch(() => {});
      }, BODY_DEADLINE_MS);
      timer?.unref?.();
    },
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (finished) return;
        if (chunk.done) { finish(); controller.close(); }
        else controller.enqueue(chunk.value);
      } catch (error) {
        if (finish()) controller.error(error);
      }
    },
    async cancel(reason) { if (finish()) await reader.cancel(reason); },
  }, { highWaterMark: 0 });
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}
