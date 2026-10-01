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
  extraction: z.literal('utf8-text'),
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
