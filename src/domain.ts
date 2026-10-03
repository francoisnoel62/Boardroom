import { z } from 'zod';

export const ProjectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  name: z.string(),
  recorded: z.literal(true),
  language: z.literal('en'),
});

export type Project = z.infer<typeof ProjectSchema>;

export const EvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  projectId: z.string(),
  originalPath: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  revision: z.number().int().positive(),
  extraction: z.enum(['utf8-text', 'pdfjs-text', 'mammoth-blocks']),
  extractionSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['Product Owner', 'Lead Developer', 'Marketing Manager']),
  model: z.string(),
  phase: z.enum(['proposal', 'objection', 'revision', 'final-views']),
  text: z.string(),
  citation: z.object({ firstLine: z.number().int().positive(), lastLine: z.number().int().positive() }).optional(),
});

export const FixtureSchema = z.object({
  schemaVersion: z.literal(1), messages: z.array(MessageSchema), plan: z.string(), memo: z.string(),
});

export const RecordedMeetingSchema = FixtureSchema.extend({
  id: z.literal('launch-ledger-recording-v1'), projectId: z.string(), evidenceId: z.string(),
  mode: z.literal('recorded'), humanDecision: z.literal('pending'),
  contextVersion: z.literal(1), proposalVersion: z.literal(2),
  position: z.number().int().nonnegative(),
});

export type RecordedMeeting = z.infer<typeof RecordedMeetingSchema>;

export const ContextSchema = z.object({
  schemaVersion: z.literal(1), version: z.number().int().positive(),
  sources: z.array(z.object({ evidenceId: z.string(), revision: z.number().int().positive() })).min(1),
});
export const ProposalSchema = z.object({
  schemaVersion: z.literal(1), version: z.number().int().positive(),
  contextVersion: z.number().int().positive(), messageId: z.string(), text: z.string().min(1),
});
export const AdviserViewSchema = z.object({
  schemaVersion: z.literal(1), role: z.enum(['Product Owner', 'Lead Developer', 'Marketing Manager']),
  model: z.string(), contextVersion: z.number().int().positive(), proposalVersion: z.number().int().positive(),
  stance: z.enum(['APPROVED', 'REJECTED', 'INSUFFICIENT_EVIDENCE']), statement: z.string().min(1),
});
export const RecordedDecisionSchema = z.object({
  schemaVersion: z.literal(1), mode: z.literal('recorded'), projectId: z.string(), meetingId: z.string(),
  context: ContextSchema, proposals: z.array(ProposalSchema).min(1), views: z.array(AdviserViewSchema),
  humanDecision: z.literal('pending'),
}).refine(value => value.proposals.every(proposal => proposal.contextVersion === value.context.version)
  && value.views.every(view => view.contextVersion === value.context.version
    && value.proposals.some(proposal => proposal.version === view.proposalVersion)),
  'A proposal or adviser view references an unavailable version.');

const EventEnvelope = z.object({
  schemaVersion: z.literal(1), sequence: z.number().int().positive(),
  projectId: z.string(), occurredAt: z.iso.datetime(),
});

export const EventSchema = z.discriminatedUnion('type', [
  EventEnvelope.extend({ type: z.enum(['execution.configured', 'execution.stopped', 'execution.conclusion-requested']), meetingId: z.uuid() }),
  EventEnvelope.extend({ type: z.enum(['call.reserved', 'call.started', 'call.settled']), meetingId: z.uuid(), callId: z.uuid() }),
  EventEnvelope.extend({ type: z.enum(['framing.started', 'framing.completed', 'framing.corrected', 'framing.approved', 'framing.stopped', 'framing.failed']), meetingId: z.uuid(), version: z.number().int().positive().optional() }),
  EventEnvelope.extend({
    type: z.literal('live.meeting-prepared'), meetingId: z.string().uuid(), contextVersion: z.literal(1),
  }),
  EventEnvelope.extend({
    type: z.literal('recorded.message'), meetingId: z.string(),
    messageId: z.string(), position: z.number().int().positive(),
  }),
  EventEnvelope.extend({ type: z.literal('export.prepared'), operationId: z.string() }),
  EventEnvelope.extend({ type: z.literal('export.started'), operationId: z.string() }),
  EventEnvelope.extend({ type: z.literal('export.completed'), operationId: z.string() }),
  EventEnvelope.extend({ type: z.literal('export.failed'), operationId: z.string() }),
]);

export type DomainEvent = z.infer<typeof EventSchema>;
type WithoutSequence<T> = T extends unknown ? Omit<T, 'sequence'> : never;
export type EventInput = WithoutSequence<DomainEvent>;

export const ExportOperationSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().uuid(), projectId: z.string(), meetingId: z.string(),
  type: z.literal('recorded.export'), status: z.enum(['unconfirmed', 'completed', 'failed']),
  createdAt: z.iso.datetime(), startedAt: z.iso.datetime().optional(), finishedAt: z.iso.datetime().optional(),
  directory: z.string(), plan: z.string(), memo: z.string(),
  errorCode: z.string().optional(),
  receipts: z.array(z.object({ path: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) })),
});

export type ExportOperation = z.infer<typeof ExportOperationSchema>;
