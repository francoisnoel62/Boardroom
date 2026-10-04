import { z } from 'zod';
import type { LiveMeeting } from './live-domain.ts';

export const FramingBodySchema = z.strictObject({
  decisionQuestion: z.string().trim().min(1).max(4000), summary: z.string().trim().min(1).max(12000),
  initialProposal: z.string().trim().min(1).max(16000).nullable(),
  assumptions: z.array(z.string().trim().min(1).max(2000)).max(30),
  references: z.array(z.strictObject({ evidenceId: z.string().uuid(), revision: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/), firstLine: z.number().int().positive(), lastLine: z.number().int().positive() })).min(1).max(100),
});
export type FramingBody = z.infer<typeof FramingBodySchema>;
export const FramingVersionSchema = z.strictObject({ schemaVersion: z.literal(1), projectId: z.string(), meetingId: z.uuid(),
  version: z.number().int().positive(), contextVersion: z.literal(1), author: z.enum(['Product Owner', 'human']),
  createdAt: z.iso.datetime(), body: FramingBodySchema, sha256: z.string().regex(/^[a-f0-9]{64}$/), callIds: z.array(z.uuid()) });
export const FramingStateSchema = z.strictObject({ schemaVersion: z.literal(1), id: z.uuid(), projectId: z.string(),
  status: z.enum(['framing', 'awaiting-human', 'approved', 'failed', 'uncertain', 'stopped']),
  latestVersion: z.number().int().positive().optional(), approvedVersion: z.number().int().positive().optional(),
  failure: z.enum(['call-failed', 'outcome-unconfirmed', 'execution-refused', 'checkpoint-unconfirmed']).optional(),
});
export function validFramingReferences(body: FramingBody, meeting: LiveMeeting) {
  return body.references.every(reference => reference.firstLine <= reference.lastLine && meeting.context.passages.some(passage =>
    passage.evidenceId === reference.evidenceId && passage.revision === reference.revision && passage.sha256 === reference.sha256
    && reference.firstLine >= passage.firstLine && reference.lastLine <= passage.lastLine));
}
