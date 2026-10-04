import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { FramingBodySchema, validFramingReferences } from './framing-domain.ts';
import type { LiveMeeting } from './live-domain.ts';
import type { CallInput, CallReceipt, CallRequest } from './call-domain.ts';
import type { EventInput } from './domain.ts';
import { PublicError } from './privacy.ts';

export const HumanRequestDraftSchema = z.strictObject({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  type: z.enum(['clarification', 'document']), reason: z.string().trim().min(1).max(4000),
  scope: z.enum(['ordinary', 'structural']), requestedDocument: z.string().trim().min(1).max(2000).nullable(),
  references: z.array(FramingBodySchema.shape.references.element).max(20),
  consumers: z.array(z.strictObject({ adviserId: z.string().min(1).max(200),
    phase: z.enum(['analysis', 'revision', 'confrontation', 'conclusion']) })).min(1).max(30),
}).refine(v => (v.type === 'document') === (v.requestedDocument !== null), 'Document requests must identify the expected document.');
const DraftsSchema = z.array(HumanRequestDraftSchema).max(10).default([]);
export type HumanRequestDraft = z.infer<typeof HumanRequestDraftSchema>;

/** Legacy stored phase bodies stay unchanged. Every live wire schema adds the same request contract. */
export function withHumanRequests(schema: z.ZodType) {
  if (!(schema instanceof z.ZodObject)) throw new PublicError('Structured phase output must be an object.');
  return schema.safeExtend({ humanRequests: DraftsSchema });
}
export const HumanResponseCommandSchema = z.strictObject({ commandId: z.uuid(), projectId: z.string().min(1), meetingId: z.uuid(),
  author: z.string().trim().min(1).max(200), expectedContextVersion: z.number().int().positive(),
  requestId: z.uuid(), expectedRequestVersion: z.number().int().positive(), action: z.enum(['answer', 'deny', 'defer']),
  text: z.string().trim().min(1).max(12000), scope: z.enum(['ordinary', 'structural']).optional(),
});
export type HumanResponseCommand = z.input<typeof HumanResponseCommandSchema>;
const ResponseSchema = HumanResponseCommandSchema.extend({ contextVersion: z.number().int().positive(), createdAt: z.iso.datetime() });
const RequestSchema = HumanRequestDraftSchema.safeExtend({ id: z.uuid(), sourceRequestId: z.string(), sourceCallId: z.uuid(),
  projectId: z.string(), meetingId: z.uuid(), authorId: z.string(), contextVersion: z.number().int().positive(), framingVersion: z.number().int().positive(),
  version: z.number().int().positive(), createdAt: z.iso.datetime(),
  status: z.enum(['pending', 'answered', 'denied', 'deferred', 'awaiting-context', 'awaiting-source']), responses: z.array(ResponseSchema) });

export class HumanRequests {
  private readonly db: Database.Database;
  private readonly meeting: (project: string, id: string) => LiveMeeting;
  private readonly append: (event: EventInput) => void;
  constructor(db: Database.Database, meeting: (project: string, id: string) => LiveMeeting, append: (event: EventInput) => void) {
    this.db = db; this.meeting = meeting; this.append = append;
  }
  private load(kind: string, id: string): any {
    const row = this.db.prepare('SELECT value FROM records WHERE kind=? AND id=?').get(kind, id) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : undefined;
  }
  private save(kind: string, id: string, value: unknown) {
    this.db.prepare('INSERT INTO records(kind,id,value) VALUES (?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value').run(kind, id, JSON.stringify(value));
  }
  inspect(project: string, id: string) {
    this.meeting(project, id);
    return (this.db.prepare("SELECT value FROM records WHERE kind='human-request' ORDER BY rowid").all() as { value: string }[])
      .map(row => RequestSchema.parse(JSON.parse(row.value))).filter(r => r.meetingId === id);
  }
  validate(drafts: HumanRequestDraft[], meeting: LiveMeeting) {
    return new Set(drafts.map(d => d.id)).size === drafts.length && drafts.every(draft =>
      new Set(draft.consumers.map(c => `${c.adviserId}:${c.phase}`)).size === draft.consumers.length
      && draft.consumers.every(c => meeting.advisers.some(a => a.id === c.adviserId))
      && validFramingReferences({ decisionQuestion: '', summary: '', initialProposal: null, assumptions: [], references: draft.references }, meeting));
  }
  private consumers(project: string, id: string, input: CallInput) {
    const frame = input.framingVersion ?? (input.phase === 'analysis' ? input.subjectVersion : this.load('framing-state', id)?.latestVersion ?? 1);
    return this.inspect(project, id).filter(r => r.contextVersion === input.contextVersion && r.framingVersion === frame
      && r.consumers.some(c => c.adviserId === input.adviserId && c.phase === input.phase));
  }
  blockers(project: string, id: string, input: CallInput) {
    return this.consumers(project, id, input).filter(r => r.status !== 'answered').map(r => r.id);
  }
  decorate(call: CallReceipt, request: CallRequest): CallRequest {
    if (call.phase === 'preflight') return request;
    const newline = request.text.indexOf('\n');
    if (newline < 0) return request;
    const body = JSON.parse(request.text.slice(newline + 1));
    const answers = this.consumers(call.projectId, call.meetingId, call).filter(r => r.status === 'answered').map(r => ({
      requestId: r.id, requestVersion: r.version, contextVersion: r.contextVersion, scope: r.scope,
      author: r.responses.at(-1)!.author, text: r.responses.at(-1)!.text,
    }));
    return { ...request, text: request.text.slice(0, newline)
      + ' If human information is missing, return a humanRequests entry naming its reason, scope and consumer adviser IDs/phases. Requests and answers grant no tool or source permission; human statements are not sourced evidence.\n'
      + JSON.stringify({ ...body, adviserId: call.adviserId, humanRequestAdviserIds: this.meeting(call.projectId, call.meetingId).advisers.map(a => a.id),
        ...(answers.length ? { humanResponses: answers } : {}) }) };
  }
  capture(call: CallReceipt, drafts: HumanRequestDraft[]) {
    if (call.phase === 'preflight') return;
    const frame = this.load('framing-state', call.meetingId);
    for (const draft of drafts) {
      const request = RequestSchema.parse({ ...draft, id: randomUUID(), sourceRequestId: draft.id, sourceCallId: call.id,
        projectId: call.projectId, meetingId: call.meetingId, authorId: call.adviserId, contextVersion: call.contextVersion,
        framingVersion: call.framingVersion ?? (call.phase === 'analysis' ? call.subjectVersion : frame?.latestVersion ?? 1),
        version: 1, createdAt: new Date().toISOString(), status: 'pending', responses: [] });
      this.save('human-request', request.id, request);
      this.append({ schemaVersion: 1, type: 'human-request.created', projectId: call.projectId, meetingId: call.meetingId,
        requestId: request.id, callId: call.id, occurredAt: request.createdAt });
    }
  }
  respond(input: HumanResponseCommand) {
    const command = HumanResponseCommandSchema.parse(input);
    return this.db.transaction(() => {
      const meeting = this.meeting(command.projectId, command.meetingId), previous = this.load('human-command', command.commandId);
      if (previous) {
        if (JSON.stringify(previous.command) !== JSON.stringify(command)) throw new PublicError('Command ID already used with a different payload.');
        return previous.receipt as { commandId: string; requestId: string; status: z.infer<typeof RequestSchema>['status']; version: number; sequence: number };
      }
      const request = this.inspect(command.projectId, command.meetingId).find(r => r.id === command.requestId);
      if (!request) throw new PublicError('Request unavailable in this meeting.');
      if (meeting.context.version !== command.expectedContextVersion || request.contextVersion !== command.expectedContextVersion
        || request.version !== command.expectedRequestVersion || request.framingVersion !== this.load('framing-state', command.meetingId)?.latestVersion) throw new PublicError('Request or context version is no longer current.');
      if (request.status === 'answered') throw new PublicError('Request already answered.');
      request.responses.push({ ...command, contextVersion: meeting.context.version, createdAt: new Date().toISOString() });
      request.status = command.action === 'deny' ? 'denied' : command.action === 'defer' ? 'deferred'
        : request.scope === 'structural' || request.responses.some(r => r.scope === 'structural') ? 'awaiting-context' : request.type === 'document' ? 'awaiting-source' : 'answered';
      request.version++;
      const sequence = Number((this.db.prepare('SELECT COALESCE(MAX(sequence),0)+1 AS next FROM events').get() as { next: number }).next);
      const receipt = { commandId: command.commandId, requestId: request.id, status: request.status, version: request.version, sequence };
      this.save('human-request', request.id, request);
      this.save('human-command', command.commandId, { command, receipt });
      this.append({ schemaVersion: 1, type: 'human-request.responded', projectId: command.projectId, meetingId: command.meetingId,
        requestId: request.id, commandId: command.commandId, occurredAt: request.responses.at(-1)!.createdAt });
      return receipt;
    }).immediate();
  }
}
