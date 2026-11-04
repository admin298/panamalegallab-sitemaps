import { createHandler } from './worker.js';

export default { fetch: createHandler({ bootstrapMode: 'clear-google-redirect' }) };
