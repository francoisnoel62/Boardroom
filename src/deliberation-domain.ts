import { z } from 'zod';
import { FramingBodySchema, validFramingReferences } from './framing-domain.ts';
import type { LiveMeeting } from './live-domain.ts';

export const ReferenceSchema = FramingBodySchema.shape.references.element;
const text = z.string().trim().min(1).max(4000);
export const AssertionSchema = z.strictObject({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  kind: z.enum(['fact', 'hypothesis', 'opinion', 'unknown']), text,
  references: z.array(ReferenceSchema).max(30),
}).refine(assertion => assertion.kind !== 'fact' || assertion.references.length > 0, 'A supported fact needs evidence.');
export const AnalysisBodySchema = z.strictObject({ assertions: z.array(AssertionSchema).min(1).max(30),
  risks: z.array(text).max(20), assumptions: z.array(text).max(20), recommendations: z.array(text).min(1).max(20),
}).refine(body => new Set(body.assertions.map(assertion => assertion.id)).size === body.assertions.length, 'Assertion IDs must be unique within an analysis.');
export type AnalysisBody = z.infer<typeof AnalysisBodySchema>;
export const AnalysisSchema = z.strictObject({ schemaVersion: z.literal(1), projectId: z.string(), meetingId: z.uuid(),
  adviserId: z.string(), role: z.string(), route: z.strictObject({ id: z.string(), revision: z.number().int().positive(), providerId: z.string(), modelId: z.string() }),
  framingVersion: z.number().int().positive(), contextVersion: z.literal(1), factsSha256: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: z.iso.datetime(), body: AnalysisBodySchema, callIds: z.array(z.uuid()).min(1),
});
export const AnalysisStateSchema = z.strictObject({ schemaVersion: z.literal(1), projectId: z.string(), meetingId: z.uuid(),
  framingVersion: z.number().int().positive(), status: z.enum(['analysing', 'complete', 'incomplete']),
  outcomes: z.array(z.strictObject({ adviserId: z.string(), status: z.enum(['completed', 'failed', 'uncertain']), callIds: z.array(z.uuid()) })),
});
export function validAnalysis(body: AnalysisBody, meeting: LiveMeeting) {
  return validFramingReferences({ decisionQuestion: '', summary: '', initialProposal: null, assumptions: [],
    references: body.assertions.flatMap(assertion => assertion.references) }, meeting);
}
