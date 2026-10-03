import { z } from 'zod';

export const ProjectInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  language: z.string().trim().min(1).max(80),
});
export const LiveProjectSchema = ProjectInputSchema.extend({
  schemaVersion: z.literal(1), id: z.string().uuid(), recorded: z.literal(false),
});
export type ProjectInput = z.input<typeof ProjectInputSchema>;
export type LiveProject = z.infer<typeof LiveProjectSchema>;

const PassageSelectionSchema = z.strictObject({
  evidenceId: z.string().uuid(), firstLine: z.number().int().positive(), lastLine: z.number().int().positive(),
});
const MeetingFieldsSchema = z.strictObject({
  projectId: z.string().min(1), question: z.string().trim().min(1),
  constraints: z.array(z.string().trim().min(1)).default([]),
  language: z.string().trim().min(1).optional(), initialPlan: z.string().trim().min(1).optional(),
  advisers: z.array(z.strictObject({
    id: z.string().min(1), role: z.string().min(1), providerId: z.string().min(1), modelId: z.string().min(1),
  })).min(1).refine(advisers => new Set(advisers.map(adviser => adviser.id)).size === advisers.length,
    'Adviser IDs must be unique.'),
  proposalAuthorId: z.string().min(1), durationTargetSeconds: z.number().int().positive(),
  costCeiling: z.strictObject({ amount: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/) }),
  passages: z.array(PassageSelectionSchema).min(1),
});
export const MeetingInputSchema = MeetingFieldsSchema.refine(
  value => value.advisers.some(adviser => adviser.id === value.proposalAuthorId), 'Proposal author must be a selected adviser.');
export const FrozenContextSchema = z.strictObject({
  schemaVersion: z.literal(1), version: z.literal(1), projectId: z.string().min(1),
  passages: z.array(PassageSelectionSchema.extend({
    revision: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })).min(1),
});
export const LiveMeetingSchema = MeetingFieldsSchema.omit({ passages: true, language: true }).extend({
  schemaVersion: z.literal(1), id: z.string().uuid(), mode: z.literal('live'), status: z.literal('prepared'),
  language: z.string().min(1), createdAt: z.iso.datetime(), context: FrozenContextSchema,
}).refine(value => value.advisers.some(adviser => adviser.id === value.proposalAuthorId),
  'Proposal author must be a selected adviser.');
export type MeetingInput = z.input<typeof MeetingInputSchema>;
export type LiveMeeting = z.infer<typeof LiveMeetingSchema>;
