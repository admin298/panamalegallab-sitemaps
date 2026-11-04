import { DurableObject } from 'cloudflare:workers';
import { createDeliveryHandler } from '../renderer/src/worker.js';
import { createRendererClass } from './backend-core.js';
import { backendNotFound } from './boundary.js';

export class PllRenderer extends createRendererClass(DurableObject, createDeliveryHandler) {}
export default { fetch: request => backendNotFound(request.method) };
