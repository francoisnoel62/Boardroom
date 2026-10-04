import { z } from 'zod';
import { ProposalBodySchema, ReferenceSchema } from './deliberation-domain.ts';

export const FinalViewBodySchema = z.strictObject({ proposalVersion: z.number().int().positive(), proposalSha256: z.string().regex(/^[a-f0-9]{64}$/),
  verdict: z.enum(['APPROVED', 'REJECTED', 'INSUFFICIENT_EVIDENCE']), confidence: z.number().int().min(0).max(100),
  justification: z.string().trim().min(1).max(8000), criticalUncertainty: z.string().trim().min(1).max(4000),
  conditions: z.array(z.string().trim().min(1).max(2000)).max(20), references: z.array(ReferenceSchema).max(50) });
export const FinalViewSchema = z.strictObject({ schemaVersion: z.literal(1), id: z.uuid(), projectId: z.string(), meetingId: z.uuid(),
  adviserId: z.string(), role: z.string(), framingVersion: z.number().int().positive(), contextVersion: z.literal(1),
  route: z.strictObject({ id: z.string(), revision: z.number().int().positive(), providerId: z.string(), modelId: z.string() }),
  body: FinalViewBodySchema, callIds: z.array(z.uuid()).min(1), createdAt: z.iso.datetime() });
export const ViewsStateSchema = z.strictObject({ schemaVersion: z.literal(1), projectId: z.string(), meetingId: z.uuid(), framingVersion: z.number().int().positive(),
  proposalVersion: z.number().int().positive(), proposalSha256: z.string().regex(/^[a-f0-9]{64}$/), status: z.enum(['running', 'complete', 'partial', 'waiting-human']),
  outcomes: z.array(z.strictObject({ adviserId: z.string(), status: z.enum(['completed', 'failed', 'uncertain', 'blocked']), callIds: z.array(z.uuid()), blockedRequestIds: z.array(z.uuid()).optional() })) });
export const HumanDecisionInputSchema = z.strictObject({ proposalVersion: z.number().int().positive(),
  action: z.enum(['accepted', 'rejected', 'modified', 'deferred', 'investigation-requested']), rationale: z.string().trim().min(1).max(12000),
  modifiedProposal: ProposalBodySchema.optional() }).refine(value => (value.action === 'modified') === (value.modifiedProposal !== undefined), 'Only a modified decision includes a modified proposal.');
export type HumanDecisionInput = z.input<typeof HumanDecisionInputSchema>;
export const HumanDecisionSchema = z.strictObject({ schemaVersion: z.literal(1), id: z.uuid(), projectId: z.string(), meetingId: z.uuid(),
  reviewedVersion: z.number().int().positive(), reviewedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  resultingVersion: z.number().int().positive(), action: z.enum(['accepted', 'rejected', 'modified', 'deferred', 'investigation-requested']),
  rationale: z.string().min(1), viewIds: z.array(z.uuid()), missingAdviserIds: z.array(z.string()), createdAt: z.iso.datetime() });
