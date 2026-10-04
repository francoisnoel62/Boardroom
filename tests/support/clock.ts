import { supportedModel } from '../../src/providers/catalog.ts';

/** A UTC instant inside the catalog's rate window, so suites never depend on the day they run. */
export const catalogInstant = () => `${supportedModel('openai', 'gpt-4.1-mini-2025-04-14').pricing.asOf}T12:00:00.000Z`;
