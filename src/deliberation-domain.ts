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

export const ProposalBodySchema = z.strictObject({ title: text, items: z.array(z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), text: z.string().trim().min(1).max(12000), references: z.array(ReferenceSchema).max(30),
})).min(1).max(30) }).refine(body => new Set(body.items.map(item => item.id)).size === body.items.length, 'Proposal item IDs must be unique.');
export const ObjectionSchema = z.strictObject({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  target: z.strictObject({ kind: z.enum(['assertion', 'proposal-item']), adviserId: z.string().nullable(), assertionId: z.string().nullable(), itemId: z.string().nullable() }),
  justification: text, impact: text, amendment: text.nullable(), references: z.array(ReferenceSchema).max(30),
});
export const ConfrontationBodySchema = z.strictObject({ objections: z.array(ObjectionSchema).max(20) })
  .refine(body => new Set(body.objections.map(objection => objection.id)).size === body.objections.length, 'Objection IDs must be unique within an intervention.');
export const DispositionSchema = z.strictObject({ adviserId: z.string(), objectionId: z.string(), action: z.enum(['accepted', 'rejected', 'unresolved']),
  reason: text, changedItemIds: z.array(z.string()).max(30) });
export const RevisionBodySchema = z.strictObject({ proposal: ProposalBodySchema, dispositions: z.array(DispositionSchema).max(40) });
export const ProposalVersionSchema = z.strictObject({ schemaVersion: z.literal(1), projectId: z.string(), meetingId: z.uuid(),
  version: z.number().int().positive(), framingVersion: z.number().int().positive(), contextVersion: z.literal(1),
  authorId: z.string(), author: z.enum(['Product Owner', 'human']), createdAt: z.iso.datetime(),
  body: ProposalBodySchema, sha256: z.string().regex(/^[a-f0-9]{64}$/), callIds: z.array(z.uuid()),
  dispositions: z.array(DispositionSchema.extend({ round: z.number().int().positive() })),
  changes: z.array(z.strictObject({ itemId: z.string(), before: z.string().nullable(), after: z.string().nullable() })),
});
export type ProposalVersion = z.infer<typeof ProposalVersionSchema>;
export const ConfrontationSchema = z.strictObject({ schemaVersion: z.literal(1), projectId: z.string(), meetingId: z.uuid(), framingVersion: z.number().int().positive(),
  proposalVersion: z.number().int().positive(), round: z.number().int().positive(), adviserId: z.string(),
  status: z.enum(['completed', 'failed', 'uncertain']), body: ConfrontationBodySchema.nullable(),
  novelIds: z.array(z.string()), callIds: z.array(z.uuid()), createdAt: z.iso.datetime() });
export const DebateStateSchema = z.strictObject({ schemaVersion: z.literal(1), projectId: z.string(), meetingId: z.uuid(), framingVersion: z.number().int().positive(),
  status: z.enum(['running', 'complete', 'partial']), round: z.number().int().nonnegative(),
  stopReason: z.enum(['no-new-objections', 'round-bound', 'execution-refused', 'call-failed', 'conclusion-requested', 'stopped']).optional() });
export function validProposal(body: z.infer<typeof ProposalBodySchema>, meeting: LiveMeeting) {
  return validFramingReferences({ decisionQuestion: '', summary: '', initialProposal: null, assumptions: [], references: body.items.flatMap(item => item.references) }, meeting);
}
