import { PublicError } from '../privacy.ts';
import type { Pricing } from '../call-domain.ts';

const entries = [
  { providerId: 'openai', modelId: 'gpt-4.1-mini-2025-04-14', context: 1047576, output: 32768,
    inputRate: 400000, outputRate: 1600000, source: 'https://developers.openai.com/api/docs/models/gpt-4.1-mini' },
  { providerId: 'openai', modelId: 'gpt-4.1-2025-04-14', context: 1047576, output: 32768,
    inputRate: 2000000, outputRate: 8000000, source: 'https://developers.openai.com/api/docs/models/gpt-4.1' },
  { providerId: 'anthropic', modelId: 'claude-haiku-4-5-20251001', context: 200000, output: 64000,
    inputRate: 1000000, outputRate: 5000000, source: 'https://platform.claude.com/docs/en/about-claude/pricing' },
] as const;

/** Dated rates are usable from `asOf` through `validUntil` inclusive, judged against an explicit UTC day. */
export function pricingIsCurrent(pricing: Pick<Pricing, 'asOf' | 'validUntil'>, utcDay: string) {
  return pricing.asOf <= utcDay && utcDay <= pricing.validUntil;
}
export function supportedModel(providerId: string, modelId: string) {
  const entry = entries.find(item => item.providerId === providerId && item.modelId === modelId);
  if (!entry) throw new PublicError('Unsupported bounded provider/model route.');
  const pricing: Pricing = { asOf: '2026-10-03', validUntil: '2026-10-14', source: entry.source, currency: 'USD',
    inputMicrosPerMillion: entry.inputRate, outputMicrosPerMillion: entry.outputRate, billing: 'bounded-text-only' };
  return { ...entry, pricing };
}
export function supportedRoute(input: { id: string; providerId: string; modelId: string }) {
  const model = supportedModel(input.providerId, input.modelId);
  return { ...input, pricing: model.pricing, capabilities: { streaming: true, structuredOutput: 'json-schema' as const,
    tools: false, cancellation: 'best-effort' as const, usage: 'tokens' as const }, limitations: [
    'Account/model access requires an explicit paid preflight; local declarations are unverified.',
    'Input reservation uses the entire published context window; cached input is charged conservatively at the base rate.',
    'Text only; no tools, cache writes, extended thinking, retries or provider substitution. Cancellation may still be billed.',
    'Pricing reviewed 2026-10-03; refresh this catalog after 2026-10-14 before further paid work.',
  ] };
}
