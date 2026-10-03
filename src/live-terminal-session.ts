import { readFileSync } from 'node:fs';
import type { Boardroom } from './application.ts';
import { PublicError, publicDiagnostic } from './privacy.ts';
import { TeamMeetingInputSchema, type TeamMeetingInput } from './live-domain.ts';
import type { SecretStore } from './secrets.ts';
import { HumanDecisionInputSchema } from './decision-domain.ts';

export const terminalText = (text: string) => text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');

/** Transient command coordination only. Durable versions, agreement, receipts and results belong to Boardroom. */
export class LiveTerminalSession {
  readonly projectId: string;
  meetingId?: string;
  private preparation?: TeamMeetingInput;
  private selected: number[] = [];
  private pending?: Promise<void>;
  private busy = '';
  private notice = 'Review question and selected passages, then start.';
  private detail = '';
  private streams = new Map<string, string>();
  private lastExport?: { directory: string };
  private readonly app: Boardroom;
  private readonly output: string;
  private readonly store: SecretStore;
  constructor(app: Boardroom, projectId: string, store: SecretStore, output: string, input: { meetingId?: string; preparation?: TeamMeetingInput }) {
    this.app = app; this.projectId = projectId; this.store = store; this.output = output;
    if (input.meetingId) { app.getMeeting(projectId, input.meetingId); this.meetingId = input.meetingId; }
    else if (input.preparation) { this.preparation = TeamMeetingInputSchema.parse(input.preparation); this.selected = this.preparation.passages.map((_, i) => i + 1); }
    else throw new PublicError('Live terminal requires a saved meeting or preparation.');
  }
  private id() { if (!this.meetingId) throw new PublicError('Start the question first.'); return this.meetingId; }
  private stream = (adviser: string, text: string) => { this.streams.set(adviser, (this.streams.get(adviser) ?? '').concat(terminalText(text)).slice(-2000)); };
  async snapshot() {
    const draft = this.preparation;
    const saved = this.meetingId ? await this.app.inspectLiveDecision(this.projectId, this.meetingId) : undefined;
    const frame = saved?.framing, analyses = saved?.analyses, proposal = saved?.debate.proposals.at(-1), views = saved?.finalViews;
    const meeting = this.meetingId ? this.app.getMeeting(this.projectId, this.meetingId) : undefined;
    return { meetingId: this.meetingId, question: meeting?.question ?? draft?.question ?? '', busy: this.busy, notice: this.notice, detail: this.detail,
      selected: this.selected.join(','), passages: draft?.passages ?? meeting?.context.passages ?? [],
      routes: meeting?.advisers ?? (draft ? (this.app.configuration().teams.find(team => team.id === draft.teamId)?.advisers ?? []).map(a => {
        const route = this.app.getRoute(a.routeId); return { id: a.id, role: a.role, providerId: route.providerId, modelId: route.modelId };
      }) : []),
      frame: frame ? `${frame.status}${frame.failure ? ` (${frame.failure})` : ''} | v${frame.latestVersion ?? '-'}` : 'not-started', framingSummary: frame?.versions.at(-1)?.body.summary ?? '',
      analyses: `${analyses?.status ?? 'not-started'} | ${analyses?.current.length ?? 0}/3`,
      proposal: proposal ? `v${proposal.version} | ${proposal.body.title}: ${proposal.body.items.map(i => i.text).join('; ')}` : 'none',
      views: `${views?.status ?? 'not-started'} | ${views?.advisers.filter(a => a.status === 'current').length ?? 0}/3`,
      viewsDetail: views?.advisers.map(a => `${a.adviserId}: ${a.status}${a.view ? ` ${a.view.body.verdict} ${a.view.body.confidence}/100` : ''}`).join('; ') ?? '',
      human: saved?.decision?.action ?? 'pending', calls: saved?.calls, ceiling: meeting?.costCeiling ?? draft?.costCeiling,
      streams: [...this.streams].map(([adviser, text]) => `${adviser} (provisional): ${text}`).join('\n'), exported: this.lastExport?.directory };
  }
  async command(input: string) {
    const text = input.trim(), [name = '', ...words] = text.split(/\s+/), rest = text.slice(name.length).trim();
    if (!name) return;
    if (this.busy && !['stop', 'conclude', 'inspect', 'history', 'evidence', 'export'].includes(name)) throw new PublicError('Work is running; stop, conclude or inspect saved work.');
    if (name === 'question' || name === 'select') {
      if (this.meetingId || !this.preparation) throw new PublicError('Question/context are frozen after start.');
      if (name === 'question') { if (!rest) throw new PublicError('Question cannot be empty.'); this.preparation.question = rest; }
      else {
        const indices = rest.split(',').map(value => Number(value));
        if (!indices.length || new Set(indices).size !== indices.length || indices.some(i => !Number.isInteger(i) || i < 1 || i > this.preparation!.passages.length)) throw new PublicError('Select passage numbers from the displayed list.');
        this.selected = indices;
      }
      this.notice = name === 'select' ? `Selected: ${this.selected.join(',')}` : 'Question updated.'; return;
    }
    if (name === 'stop' || name === 'conclude') {
      if (name === 'stop') this.app.stopExecution(this.projectId, this.id()); else this.app.requestConclusion(this.projectId, this.id());
      this.notice = name === 'stop' ? 'Stopped. Saved work can be exported.' : 'Conclusion requested. Use explicit views on the saved proposal.'; return;
    }
    if (name === 'inspect' || name === 'history' || name === 'evidence') {
      this.detail = JSON.stringify(name === 'history' ? this.app.history(this.projectId) : name === 'evidence' ? this.app.readMeetingContext(this.projectId, this.id()) : await this.app.inspectLiveDecision(this.projectId, this.id()), null, 2).slice(-8000);
      this.notice = 'Saved detail (bounded view; CLI inspection provides the full record).'; return;
    }
    if (name === 'export') {
      this.lastExport = await this.app.exportLiveMeeting(this.projectId, this.id(), this.output, { json: true }, this.store);
      this.notice = 'Export saved; review artifacts before sharing.'; return;
    }
    if (name === 'approve' || name === 'correct' || name === 'decide' || name === 'decision-file') {
      const version = Number(words[0]);
      if (name !== 'decision-file' && (!Number.isSafeInteger(version) || version < 1)) throw new PublicError('Enter the explicit displayed version.');
      if (name === 'approve') await this.app.approveFraming(this.projectId, this.id(), version);
      else if (name === 'correct') await this.app.correctFraming(this.projectId, this.id(), version, JSON.parse(readFileSync(rest.slice(words[0]!.length).trim(), 'utf8')));
      else if (name === 'decision-file') await this.app.recordHumanDecision(this.projectId, this.id(), JSON.parse(readFileSync(rest, 'utf8')));
      else {
        const action = words[1], rationale = words.slice(2).join(' ');
        await this.app.recordHumanDecision(this.projectId, this.id(), HumanDecisionInputSchema.parse({ proposalVersion: version, action, rationale }));
      }
      this.notice = 'Human action saved.'; return;
    }
    if (!['start', 'analyse', 'debate', 'views'].includes(name)) throw new PublicError('Unknown terminal command; see displayed actions.');
    if (name === 'start' && !this.meetingId) {
      const prep = this.preparation!;
      const meeting = this.app.prepareTeamMeeting({ ...prep, passages: this.selected.map(i => prep.passages[i - 1]!) });
      this.meetingId = meeting.id;
      this.app.configureExecution(this.projectId, meeting.id, { revisionMicros: Math.floor(meeting.costCeiling.amount * 1e6 * 0.1), conclusionMicros: Math.floor(meeting.costCeiling.amount * 1e6 * 0.1),
        revisionMs: Math.floor(meeting.durationTargetSeconds * 1000 * 0.1), conclusionMs: Math.floor(meeting.durationTargetSeconds * 1000 * 0.15) });
    }
    this.busy = name; this.notice = 'Receiving provisional output; saved results require validation.'; this.streams.clear();
    this.pending = (async () => {
      try {
        if (name === 'start') {
          const meeting = this.app.getMeeting(this.projectId, this.id());
          const result = await this.app.startMeeting(this.projectId, this.id(), this.store, text => this.stream(meeting.proposalAuthorId, text));
          if (result.failure) { this.notice = `Framing ${result.status}: ${result.failure}. Inspect limits and saved receipts.`; return; }
        }
        else if (name === 'analyse') await this.app.analyseMeeting(this.projectId, this.id(), this.store, this.stream);
        else if (name === 'debate') await this.app.debateMeeting(this.projectId, this.id(), this.store, this.stream);
        else await this.app.collectFinalViews(this.projectId, this.id(), Number(rest), this.store, this.stream);
        this.notice = 'Phase finished. Inspect completed or partial work.';
      } catch (error) { this.notice = publicDiagnostic(error); }
      finally { this.busy = ''; this.streams.clear(); }
    })();
    await this.pending;
  }
  async cancel() {
    if (this.meetingId) {
      try { this.app.stopExecution(this.projectId, this.meetingId); } catch { /* Already stopped/not configured. */ }
      await this.pending;
      try { this.lastExport = await this.app.exportLiveMeeting(this.projectId, this.meetingId, this.output, { json: true }, this.store); }
      catch (error) { this.notice = publicDiagnostic(error); }
    }
    return this.lastExport;
  }
}
