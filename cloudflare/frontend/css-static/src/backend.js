import { DurableObject } from 'cloudflare:workers';
import { createDeliveryHandler } from '../renderer/src/worker.js';
import { createRendererClass } from './backend-core.js';
import { backendNotFound } from './boundary.js';

const cacheMode = typeof __PLL_HTML_CACHE_MODE__ === 'string' ? __PLL_HTML_CACHE_MODE__ : 'off';
export class PllRenderer extends createRendererClass(DurableObject, createDeliveryHandler, { cacheMode }) {}
export default { fetch: request => backendNotFound(request.method) };
