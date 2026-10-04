// Projects the bundled recorded meeting into the steps the site tells.
// The fixture is the single source of truth: nothing here is retyped by hand.

export type Phase = 'proposal' | 'objection' | 'revision' | 'final-views';
export type Verdict = 'APPROVED' | 'REJECTED' | 'INSUFFICIENT_EVIDENCE';

export interface Evidence {
  source: 'context.md';
  firstLine: number;
  lastLine: number;
  lines: string[];
}

export interface StoryStep {
  id: string;
  phase: Phase;
  role: string;
  model: string;
  text: string;
  evidence?: Evidence;
}

export interface Story {
  steps: StoryStep[];
  proposals: { v1: string; v2: string };
  finalViews: Array<{ role: string; verdict: Verdict }>;
  openQuestion: string;
  humanDecision: string;
}

interface RawMessage {
  id: string;
  role: string;
  model: string;
  phase: string;
  text: string;
  citation?: { firstLine: number; lastLine: number };
}

const phases: readonly string[] = ['proposal', 'objection', 'revision', 'final-views'];
const isPhase = (value: string): value is Phase => phases.includes(value);

function messagesOf(meeting: unknown): RawMessage[] {
  const fixture = meeting as { schemaVersion?: unknown; messages?: unknown };
  if (fixture?.schemaVersion !== 1) throw new Error(`Unsupported recorded meeting schema version ${String(fixture?.schemaVersion)}.`);
  if (!Array.isArray(fixture.messages)) throw new Error('The recorded meeting has no messages.');
  return fixture.messages as RawMessage[];
}

function cite(context: string, citation: { firstLine: number; lastLine: number }): Evidence {
  const lines = context.split(/\r?\n/);
  const { firstLine, lastLine } = citation;
  if (firstLine < 1 || lastLine < firstLine || lastLine > lines.length) {
    throw new Error(`Cited lines ${firstLine}-${lastLine} are outside context.md.`);
  }
  return { source: 'context.md', firstLine, lastLine, lines: lines.slice(firstLine - 1, lastLine) };
}

const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function proposal(steps: StoryStep[], version: 'v1' | 'v2'): string {
  const prefix = `Proposal ${version}: `;
  const step = steps.find(candidate => candidate.text.startsWith(prefix));
  if (!step) throw new Error(`The recorded meeting has no proposal ${version}.`);
  return sentenceCase(step.text.slice(prefix.length));
}

export function buildStory(meeting: unknown, context: string): Story {
  const steps = messagesOf(meeting).map((message): StoryStep => {
    if (!isPhase(message.phase)) throw new Error(`Unknown recorded phase "${message.phase}".`);
    const { id, role, model, text } = message;
    return message.citation
      ? { id, phase: message.phase, role, model, text, evidence: cite(context, message.citation) }
      : { id, phase: message.phase, role, model, text };
  });

  const final = steps.find(step => step.phase === 'final-views');
  if (!final) throw new Error('The recorded meeting has no final views.');

  // Same explicit stance format as the application's recorded-decision adapter.
  const roles = [...new Set(steps.map(step => step.role))];
  const finalViews = roles.map(role => {
    const verdict = new RegExp(`${role} (APPROVED|REJECTED|INSUFFICIENT_EVIDENCE)[;.]`).exec(final.text)?.[1];
    if (!verdict) throw new Error(`No final view for ${role} in the recorded meeting.`);
    return { role, verdict: verdict as Verdict };
  });

  const humanDecision = /Human decision: (\w+)\./.exec(final.text)?.[1];
  if (!humanDecision) throw new Error('The recorded meeting does not state the human decision.');
  const openQuestion = /\. ([^.]+\.) Human decision:/.exec(final.text)?.[1] ?? '';

  return { steps, proposals: { v1: proposal(steps, 'v1'), v2: proposal(steps, 'v2') }, finalViews, openQuestion, humanDecision };
}

export function readExportedSourceHash(memo: string): string {
  const hash = /SHA-256: ([a-f0-9]{64})/.exec(memo)?.[1];
  if (!hash) throw new Error('The exported memo does not record its source hash.');
  return hash;
}
