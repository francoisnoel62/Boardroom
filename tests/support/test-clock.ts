import { catalogInstant } from './clock.ts';

// Preloaded by `npm test`: spawned live-workflow processes inherit this instant and shift their clock to it
// (see provider-http.mjs), keeping the deterministic suite independent of the catalog's expiry date.
process.env.TEST_UTC_NOW ??= catalogInstant();
