import { requestBoundary, boundaryResponse, temporaryResponse, withBackendVersion } from './boundary.js';
import { holdResponseSlot } from './body-slot.js';
import { withImageFormat } from './image-format.js';
import { withCssStatic } from './css-static.js';

export const MAX_IN_FLIGHT = 8;

export function createRendererClass(Base, makeHandler) {
  return class extends Base {
    constructor(ctx, env) {
      super(ctx, env);
      this.environment = env;
      this.handle = makeHandler();
      this.inFlight = 0;
    }

    async fetch(request) {
      const boundary = requestBoundary(request);
      if (!boundary.allowed) return withBackendVersion(boundaryResponse(boundary, request.method), this.environment);
      if (this.inFlight >= MAX_IN_FLIGHT)
        return withBackendVersion(temporaryResponse(boundary, request.method), this.environment);
      this.inFlight += 1;
      const release = () => { this.inFlight -= 1; };
      try {
        const rendered = await this.handle(request);
        const images = await withImageFormat(rendered, request, this.environment);
        const delivered = await withCssStatic(images, request, this.environment);
        return holdResponseSlot(withBackendVersion(delivered, this.environment), release);
      }
      catch { release(); return withBackendVersion(temporaryResponse(boundary, request.method), this.environment); }
    }
  };
}
