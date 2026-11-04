import { requestBoundary, boundaryResponse, temporaryResponse, withBackendVersion } from './boundary.js';
import { holdResponseSlot } from './body-slot.js';
import { withImageFormat } from './image-format.js';
import { withCssStatic } from './css-static.js';
import { createHtmlMemoryCache } from './html-memory-cache.js';
import { createSqliteTemplateStore } from './sqlite-template-store.js';

export const MAX_IN_FLIGHT = 8;

export function createRendererClass(Base, makeHandler, { cacheMode = 'off', cacheOptions = {} } = {}) {
  return class extends Base {
    constructor(ctx, env) {
      super(ctx, env);
      this.environment = env;
      this.handle = makeHandler();
      this.inFlight = 0;
      let store = cacheOptions.store;
      if (['preview', 'all'].includes(cacheMode) && !Object.hasOwn(cacheOptions, 'store')) {
        try {
          const sql = ctx?.storage?.sql;
          if (sql) store = createSqliteTemplateStore(sql, { now: cacheOptions.now ?? Date.now });
        } catch { /* Optional persistence cannot prevent normal rendering. */ }
      }
      this.htmlCache = createHtmlMemoryCache({ ...cacheOptions, mode: cacheMode, store });
    }

    async fetch(request) {
      const boundary = requestBoundary(request);
      if (!boundary.allowed) return withBackendVersion(boundaryResponse(boundary, request.method), this.environment);
      if (this.inFlight >= MAX_IN_FLIGHT)
        return withBackendVersion(temporaryResponse(boundary, request.method), this.environment);
      this.inFlight += 1;
      const release = () => { this.inFlight -= 1; };
      try {
        const result = await this.htmlCache.handle(request, async () => {
          const rendered = await this.handle(request);
          const images = await withImageFormat(rendered, request, this.environment);
          const delivered = await withCssStatic(images, request, this.environment);
          return withBackendVersion(delivered, this.environment);
        });
        // Persistent HTML may predate this deployment; provenance always names
        // the instance currently delivering it, while the body/CSP remain attested.
        return holdResponseSlot(withBackendVersion(result, this.environment), release);
      }
      catch { release(); return withBackendVersion(temporaryResponse(boundary, request.method), this.environment); }
    }
  };
}
