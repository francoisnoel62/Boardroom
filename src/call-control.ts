import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { PublicError } from './privacy.ts';
import { CallInputSchema, CallReceiptSchema, ExecutionSchema, ReservesSchema, UsageSchema, tokenCost,
  type CallInput, type CallReceipt, type Reserves, type CallRequest, type ProviderBoundary } from './call-domain.ts';
import type { LiveMeeting } from './live-domain.ts';
import type { EventInput } from './domain.ts';

export class CallController {
  private readonly clockId = randomUUID();
  private readonly db: Database.Database;
  private readonly getMeeting: (project: string, id: string) => LiveMeeting;
  private readonly append: (event: EventInput) => void;
  private readonly now: () => number;
  private readonly authorize: (project: string, id: string, input: CallInput) => void;
  constructor(db: Database.Database, getMeeting: (project: string, id: string) => LiveMeeting, append: (event: EventInput) => void,
    now?: () => number, authorize: (project: string, id: string, input: CallInput) => void = () => {}) {
    this.db = db; this.getMeeting = getMeeting; this.append = append; this.now = now ?? (() => performance.now());
    this.authorize = authorize;
  }
  private load(kind: string, id: string): unknown {
    const row = this.db.prepare('SELECT value FROM records WHERE kind = ? AND id = ?').get(kind, id) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : undefined;
  }
  private save(kind: string, id: string, value: unknown) {
    this.db.prepare('INSERT INTO records(kind, id, value) VALUES (?, ?, ?) ON CONFLICT(kind, id) DO UPDATE SET value=excluded.value')
      .run(kind, id, JSON.stringify(value));
  }
  configure(project: string, id: string, input: Reserves) {
    const meeting = this.getMeeting(project, id), fields = ReservesSchema.parse(input);
    const ceilingMicros = Math.round(meeting.costCeiling.amount * 1e6);
    if (meeting.costCeiling.currency !== 'USD' || Math.abs(ceilingMicros / 1e6 - meeting.costCeiling.amount) > 1e-12) {
      throw new PublicError('Execution requires a USD ceiling with at most six decimal places.');
    }
    const execution = ExecutionSchema.parse({ ...fields, schemaVersion: 1, id, projectId: project, status: 'active',
      ceilingMicros, durationTargetMs: meeting.durationTargetSeconds * 1000, createdAt: new Date().toISOString() });
    if (fields.revisionMicros + fields.conclusionMicros > ceilingMicros
      || fields.revisionMs + fields.conclusionMs > execution.durationTargetMs) throw new PublicError('Execution reserves exceed the meeting limits.');
    return this.db.transaction(() => {
      if (this.load('execution', id)) throw new PublicError('Execution limits are already frozen.');
      if (!meeting.team) throw new PublicError('Execution requires a configured frozen team.');
      this.save('execution', id, execution);
      this.append({ schemaVersion: 1, projectId: project, meetingId: id, type: 'execution.configured', occurredAt: execution.createdAt });
      return execution;
    }).immediate();
  }
  ledger(project: string, id: string) {
    this.getMeeting(project, id);
    const execution = ExecutionSchema.parse(this.load('execution', id));
    const rows = this.db.prepare("SELECT value FROM records WHERE kind = 'call' ORDER BY rowid").all() as { value: string }[];
    const calls = rows.map(row => CallReceiptSchema.parse(JSON.parse(row.value))).filter(call => call.meetingId === id);
    const obligation = (call: CallReceipt) => call.knownCostMicros ?? call.reservedMicros;
    const remainingRevision = Math.max(0, execution.revisionMicros - calls.filter(call => call.pool === 'revision').reduce((sum, call) => sum + obligation(call), 0));
    const remainingConclusion = Math.max(0, execution.conclusionMicros - calls.filter(call => call.pool === 'conclusion').reduce((sum, call) => sum + obligation(call), 0));
    const activeDuration = (items: CallReceipt[]) => {
      const clocks = new Map<string, [number, number][]>();
      let total = 0;
      for (const call of items) {
        if (call.clockId && call.startedMonoMs !== undefined && call.finishedMonoMs !== undefined) {
          const spans = clocks.get(call.clockId) ?? []; spans.push([call.startedMonoMs, call.finishedMonoMs]); clocks.set(call.clockId, spans);
        } else total += call.elapsedMs ?? 0;
      }
      for (const spans of clocks.values()) {
        let end = -Infinity;
        for (const [start, finish] of spans.sort((a, b) => a[0] - b[0])) { total += Math.max(0, finish - Math.max(start, end)); end = Math.max(end, finish); }
      }
      return total;
    };
    const committedDuration = (items: CallReceipt[]) => items.filter(call => call.elapsedMs === undefined).reduce((sum, call) => sum + call.limits.maxDurationMs, 0);
    const remainingRevisionMs = Math.max(0, execution.revisionMs - activeDuration(calls.filter(call => call.pool === 'revision')) - committedDuration(calls.filter(call => call.pool === 'revision')));
    const remainingConclusionMs = Math.max(0, execution.conclusionMs - activeDuration(calls.filter(call => call.pool === 'conclusion')) - committedDuration(calls.filter(call => call.pool === 'conclusion')));
    return { execution, calls, knownCostMicros: calls.reduce((sum, call) => sum + (call.knownCostMicros ?? 0), 0),
      committedMicros: calls.filter(call => call.knownCostMicros === undefined).reduce((sum, call) => sum + call.reservedMicros, 0),
      heldReserveMicros: remainingRevision + remainingConclusion, remainingRevision, remainingConclusion,
      activeMs: activeDuration(calls), committedMs: committedDuration(calls), remainingRevisionMs, remainingConclusionMs };
  }
  reserve(project: string, id: string, input: CallInput) {
    const fields = CallInputSchema.parse(input), meeting = this.getMeeting(project, id);
    const adviser = meeting.team?.advisers.find(adviser => adviser.id === fields.adviserId);
    const route = meeting.team?.routes.find(route => route.id === adviser?.routeId);
    if (!route?.pricing) throw new PublicError('A dated pricing bound is required before reserving a call.');
    const today = new Date().toISOString().slice(0, 10);
    if (route.pricing.asOf > today || route.pricing.validUntil < today) throw new PublicError('The route pricing bound is not current.');
    const receipt = CallReceiptSchema.parse({ ...fields, schemaVersion: 1, id: randomUUID(), projectId: project, meetingId: id,
      createdAt: new Date().toISOString(), status: 'reserved', pricing: route.pricing,
      route: { id: route.id, revision: route.revision, providerId: route.providerId, modelId: route.modelId },
      reservedMicros: tokenCost(route.pricing, fields.limits.maxInputTokens, fields.limits.maxOutputTokens) });
    this.db.transaction(() => {
      this.authorize(project, id, fields);
      const ledger = this.ledger(project, id), execution = ledger.execution;
      if (execution.status === 'stopped' || (execution.status === 'concluding' && fields.pool !== 'conclusion')) throw new PublicError('Execution no longer accepts this work.');
      const reserve = fields.pool === 'work' ? ledger.heldReserveMicros : fields.pool === 'revision' ? ledger.remainingConclusion : 0;
      if (ledger.knownCostMicros + ledger.committedMicros + reserve + receipt.reservedMicros > execution.ceilingMicros) throw new PublicError('Call refused: insufficient budget after protected reserves.');
      const timeReserve = fields.pool === 'work' ? ledger.remainingRevisionMs + ledger.remainingConclusionMs : fields.pool === 'revision' ? ledger.remainingConclusionMs : 0;
      if (ledger.activeMs + ledger.committedMs + timeReserve + fields.limits.maxDurationMs > execution.durationTargetMs) throw new PublicError('Call refused: insufficient active time after protected reserves.');
      this.save('call', receipt.id, receipt);
      this.append({ schemaVersion: 1, projectId: project, meetingId: id, callId: receipt.id, type: 'call.reserved', occurredAt: receipt.createdAt });
    }).immediate();
    return { receipt, execute: (request: CallRequest, provider: ProviderBoundary) => this.execute(receipt.id, request, provider) };
  }

  stop(project: string, id: string, conclude = false) {
    return this.db.transaction(() => {
      const { execution, calls } = this.ledger(project, id);
      if (execution.status === 'stopped') throw new PublicError('Execution is already stopped.');
      execution.status = conclude ? 'concluding' : 'stopped'; this.save('execution', id, execution);
      const occurredAt = new Date().toISOString();
      for (const call of calls.filter(call => call.status === 'reserved' && (!conclude || call.pool !== 'conclusion'))) {
        this.save('call', call.id, { ...call, status: 'cancelled', reason: 'not-started', knownCostMicros: 0, elapsedMs: 0, finishedAt: occurredAt });
        this.append({ schemaVersion: 1, projectId: project, meetingId: id, callId: call.id, type: 'call.settled', occurredAt });
      }
      this.append({ schemaVersion: 1, projectId: project, meetingId: id,
        type: conclude ? 'execution.conclusion-requested' : 'execution.stopped', occurredAt });
      return execution;
    }).immediate();
  }

  private async execute(id: string, request: CallRequest, provider: ProviderBoundary) {
    let receipt = CallReceiptSchema.parse(this.load('call', id));
    if (typeof request.text !== 'string' || Buffer.byteLength(JSON.stringify(request)) > receipt.limits.maxInputTokens) {
      throw new PublicError('Request exceeds its reserved input bound.');
    }
    this.db.transaction(() => {
      receipt = CallReceiptSchema.parse(this.load('call', id));
      this.authorize(receipt.projectId, receipt.meetingId, receipt);
      const execution = ExecutionSchema.parse(this.load('execution', receipt.meetingId));
      if (execution.status === 'stopped' || (execution.status === 'concluding' && receipt.pool !== 'conclusion')) throw new PublicError('Execution no longer accepts this work.');
      if (receipt.status !== 'reserved') throw new PublicError('Call was already attempted; it cannot be replayed.');
      receipt = { ...receipt, status: 'running', clockId: this.clockId, startedMonoMs: this.now() };
      this.save('call', id, receipt);
      this.append({ schemaVersion: 1, projectId: receipt.projectId, meetingId: receipt.meetingId, callId: id, type: 'call.started', occurredAt: new Date().toISOString() });
    }).immediate();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), receipt.limits.maxDurationMs);
    const poll = setInterval(() => {
      try {
        this.authorize(receipt.projectId, receipt.meetingId, receipt);
        const execution = ExecutionSchema.parse(this.load('execution', receipt.meetingId));
        if (execution.status === 'stopped' || (execution.status === 'concluding' && receipt.pool !== 'conclusion')) controller.abort('cancelled');
      } catch { controller.abort('cancelled'); }
    }, 25);
    const aborted = new Promise<never>((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true }));
    let settled = false;
    let result: Awaited<ReturnType<ProviderBoundary>> | undefined;
    try {
      result = await Promise.race([Promise.resolve().then(() => provider(request, controller.signal, text => {
        if (!settled && !controller.signal.aborted) receipt.streamedBytes += Buffer.byteLength(text);
      })), aborted]);
      const usage = UsageSchema.safeParse(result.usage);
      if (result.usage !== undefined && (!usage.success || usage.data.inputTokens > receipt.limits.maxInputTokens || usage.data.outputTokens > receipt.limits.maxOutputTokens)) {
        receipt = { ...receipt, status: 'uncertain', reason: 'invalid-usage' }; result = undefined;
      } else if (usage.success) {
        receipt = { ...receipt, usage: usage.data, knownCostMicros: tokenCost(receipt.pricing, usage.data.inputTokens, usage.data.outputTokens) };
      }
      if (result) receipt = { ...receipt, status: result.failure ? 'failed' : 'completed', reason: result.failure ?? 'success' };
    } catch {
      receipt = { ...receipt, status: 'uncertain', reason: controller.signal.aborted ? controller.signal.reason : 'provider-error' };
      result = undefined;
    } finally {
      settled = true; clearTimeout(timer); clearInterval(poll);
    }
    const finishedMonoMs = this.now();
    receipt = { ...receipt, finishedMonoMs, elapsedMs: finishedMonoMs - receipt.startedMonoMs!, finishedAt: new Date().toISOString() };
    if (result && receipt.elapsedMs! >= receipt.limits.maxDurationMs) {
      receipt = { ...receipt, status: 'failed', reason: 'timeout' }; result = undefined;
    }
    this.db.transaction(() => {
      if (result && !result.failure) try { this.authorize(receipt.projectId, receipt.meetingId, receipt); }
      catch { receipt = { ...receipt, status: 'failed', reason: 'cancelled' }; result = undefined; }
      this.save('call', id, receipt);
      if (receipt.reason === 'invalid-usage') this.stop(receipt.projectId, receipt.meetingId);
      this.append({ schemaVersion: 1, projectId: receipt.projectId, meetingId: receipt.meetingId, callId: id, type: 'call.settled', occurredAt: receipt.finishedAt! });
    }).immediate();
    return { receipt: CallReceiptSchema.parse(receipt), ...(result && !result.failure ? { text: result.text } : {}) };
  }
}
