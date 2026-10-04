import { z } from 'zod';

const money = z.number().int().nonnegative().max(1e12);
export const PricingSchema = z.strictObject({
  asOf: z.iso.date(), validUntil: z.iso.date(), source: z.url(), currency: z.literal('USD'),
  inputMicrosPerMillion: money, outputMicrosPerMillion: money, billing: z.literal('bounded-text-only'),
}).refine(price => price.asOf <= price.validUntil, 'Pricing dates are inconsistent.');
export type Pricing = z.infer<typeof PricingSchema>;
export const CallLimitsSchema = z.strictObject({ maxInputTokens: z.number().int().positive().max(2000000),
  maxOutputTokens: z.number().int().positive().max(1000000), maxDurationMs: z.number().int().positive().max(3600000) });
const CallFieldsSchema = z.strictObject({ adviserId: z.string().min(1),
  phase: z.enum(['preflight', 'framing', 'framing-correction', 'analysis', 'confrontation', 'revision', 'conclusion']),
  contextVersion: z.literal(1), subjectVersion: z.number().int().positive(),
  framingVersion: z.number().int().positive().optional(),
  pool: z.enum(['work', 'revision', 'conclusion']), limits: CallLimitsSchema });
const correctPool = (call: { phase: string; pool: string }) => call.pool ===
  (call.phase === 'revision' ? 'revision' : call.phase === 'conclusion' ? 'conclusion' : 'work');
export const CallInputSchema = CallFieldsSchema.refine(correctPool, 'Phase cannot spend this protected pool.');
export type CallInput = z.input<typeof CallInputSchema>;
export const ReservesSchema = z.strictObject({ revisionMicros: money, conclusionMicros: money,
  revisionMs: z.number().int().nonnegative().max(3600000), conclusionMs: z.number().int().nonnegative().max(3600000) });
export type Reserves = z.input<typeof ReservesSchema>;
export const ExecutionSchema = ReservesSchema.extend({ schemaVersion: z.literal(1), id: z.uuid(), projectId: z.string(),
  status: z.enum(['active', 'concluding', 'stopped']), ceilingMicros: money,
  durationTargetMs: z.number().int().positive().max(3600000000), createdAt: z.iso.datetime() });
export const UsageSchema = z.strictObject({ inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative() });
export const CallReceiptSchema = CallFieldsSchema.extend({ schemaVersion: z.literal(1), id: z.uuid(),
  projectId: z.string(), meetingId: z.uuid(), createdAt: z.iso.datetime(),
  route: z.strictObject({ id: z.string(), revision: z.number().int().positive(), providerId: z.string(), modelId: z.string() }),
  pricing: PricingSchema, reservedMicros: money,
  status: z.enum(['reserved', 'running', 'completed', 'failed', 'uncertain', 'cancelled']),
  knownCostMicros: money.optional(), usage: UsageSchema.optional(),
  clockId: z.uuid().optional(), startedMonoMs: z.number().nonnegative().optional(), finishedMonoMs: z.number().nonnegative().optional(),
  elapsedMs: z.number().nonnegative().optional(), finishedAt: z.iso.datetime().optional(),
  reason: z.enum(['success', 'provider-error', 'cancelled', 'timeout', 'invalid-output', 'invalid-usage', 'not-started', 'refusal', 'truncated', 'tool-blocked', 'authentication', 'quota', 'identity-mismatch']).optional(),
  streamedBytes: z.number().int().nonnegative().default(0),
}).refine(correctPool, 'Phase cannot spend this protected pool.');
export type CallReceipt = z.infer<typeof CallReceiptSchema>;
export interface CallRequest { text: string; jsonSchema?: Record<string, unknown> }
export interface ProviderResult { text: string; usage?: { inputTokens: number; outputTokens: number };
  failure?: 'provider-error' | 'refusal' | 'truncated' | 'tool-blocked' | 'authentication' | 'quota' | 'identity-mismatch' | 'invalid-output' }
export type ProviderBoundary = (request: CallRequest, signal: AbortSignal, emit: (text: string) => void) => Promise<ProviderResult>;

export function tokenCost(price: Pricing, input: number, output: number): number {
  const numerator = BigInt(input) * BigInt(price.inputMicrosPerMillion) + BigInt(output) * BigInt(price.outputMicrosPerMillion);
  const cost = Number((numerator + 999999n) / 1000000n);
  if (!Number.isSafeInteger(cost) || cost > 1e12) throw new Error('Cost bound exceeds supported range.');
  return cost;
}
