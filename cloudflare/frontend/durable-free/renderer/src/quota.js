export function createClientQuota({ limit, maxBuckets = 4096, duration = 60_000 } = {}) {
  let buckets = new Map();
  return (request, now) => {
    const client = request.headers.get('CF-Connecting-IP');
    if (!client) return true;
    const window = Math.floor(now / duration);
    buckets = new Map([...buckets].filter(([, value]) => value.window === window));
    const current = buckets.get(client);
    const count = current?.window === window ? current.count + 1 : 1;
    if (buckets.size >= maxBuckets && !current) {
      return false;
    }
    buckets = new Map([...buckets, [client, Object.freeze({ window, count })]]);
    return count <= limit;
  };
}
