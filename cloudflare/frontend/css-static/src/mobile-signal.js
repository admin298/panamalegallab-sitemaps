// Forward only a normalized device hint; raw browser identity stays at Pages.
export function normalizedMobileSignal(request) {
  const hint = request.headers.get('Sec-CH-UA-Mobile');
  if (hint === '?1' || hint === '?0') return hint === '?1' ? '1' : '0';
  const agent = request.headers.get('User-Agent') ?? '';
  return agent.length <= 512 && /Mobile|iPhone|iPod/iu.test(agent) ? '1' : '0';
}
