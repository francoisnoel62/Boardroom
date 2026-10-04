import type { z } from 'zod';
import { FramingBodySchema } from '../framing-domain.ts';
import { AnalysisBodySchema, ConfrontationBodySchema, ProposalBodySchema, RevisionBodySchema } from '../deliberation-domain.ts';
import { FinalViewBodySchema } from '../decision-domain.ts';
import { withHumanRequests } from '../human-requests.ts';

// A preflight proves the route accepts every schema it will later receive. It carries synthetic data only: no
// question, constraint, source passage or other user content ever travels in it.
const note = 'Synthetic connectivity and schema check; no user data.';
const reference = { evidenceId: '00000000-0000-4000-8000-000000000000', revision: 1, sha256: '0'.repeat(64), firstLine: 1, lastLine: 1 };
const proposal = { title: note, items: [{ id: 'item-1', text: note, references: [reference] }] };

export interface PreflightCheck { name: string; scope: 'author' | 'reviewer' | 'all'; schema: z.ZodType; instance: unknown }
const phaseChecks: readonly PreflightCheck[] = [
  { name: 'framing', scope: 'author', schema: FramingBodySchema, instance: { decisionQuestion: note, summary: note, initialProposal: null,
    assumptions: [], references: [reference] } },
  { name: 'analysis', scope: 'all', schema: AnalysisBodySchema, instance: { assertions: [{ id: 'a-1', kind: 'unknown', text: note, references: [] }],
    risks: [], assumptions: [], recommendations: [note] } },
  { name: 'proposal', scope: 'author', schema: ProposalBodySchema, instance: proposal },
  { name: 'confrontation', scope: 'reviewer', schema: ConfrontationBodySchema, instance: { objections: [{ id: 'o-1',
    target: { kind: 'proposal-item', adviserId: null, assertionId: null, itemId: 'item-1' }, justification: note, impact: note, amendment: null, references: [] }] } },
  { name: 'revision', scope: 'author', schema: RevisionBodySchema, instance: { proposal, dispositions: [] } },
  { name: 'final-view', scope: 'all', schema: FinalViewBodySchema, instance: { proposalVersion: 1, proposalSha256: '0'.repeat(64),
    verdict: 'INSUFFICIENT_EVIDENCE', confidence: 0, justification: note, criticalUncertainty: note, conditions: [], references: [] } },
];
export const preflightChecks: readonly PreflightCheck[] = phaseChecks.map(check => ({ ...check,
  schema: withHumanRequests(check.schema), instance: { ...(check.instance as object), humanRequests: [{ id: 'synthetic-request',
    type: 'document', reason: note, scope: 'ordinary', requestedDocument: 'Synthetic document', references: [reference],
    consumers: [{ adviserId: 'synthetic-adviser', phase: 'conclusion' }] }] } }));
/** The proposal author frames, proposes and revises; every other adviser confronts. All of them analyse and give a final view. */
export const checksFor = (isAuthor: boolean) => preflightChecks.filter(check => check.scope === 'all' || (check.scope === 'author') === isAuthor);
export const syntheticRequest = (check: PreflightCheck) =>
  `${note} Return exactly this JSON object and nothing else: ${JSON.stringify(check.instance)}`;
