import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { EvidenceSchema, EventSchema, ExportOperationSchema, FixtureSchema, ProjectSchema, RecordedMeetingSchema, RecordedDecisionSchema, type Project, type Evidence, type RecordedMeeting, type EventInput } from './domain.ts';
import { DocumentLocatorSchema, ExtractionSchema, extractDocument, type DocumentLocator } from './extraction.ts';

const hash = (content: Buffer) => createHash('sha256').update(content).digest('hex');

/** Owns durable product state; terminal clients only issue commands and display results. */
export class Boardroom {
  private readonly db: Database.Database;
  readonly dataDirectory: string;

  constructor(dataDirectory: string) {
    this.dataDirectory = resolve(dataDirectory);
    mkdirSync(this.dataDirectory, { recursive: true });
    this.db = new Database(join(this.dataDirectory, 'domain.sqlite'));
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.exec(`CREATE TABLE IF NOT EXISTS records (
      kind TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL,
      PRIMARY KEY (kind, id)
    )`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS events (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL, value TEXT NOT NULL
    )`);
  }

  capabilities() {
    return {
      recordedExample: 'available',
      liveMeetings: 'unavailable',
      commands: 'unavailable',
      mcp: 'unavailable',
      cloudTelemetry: 'off',
    } as const;
  }

  openDemo(): Project {
    const stored = this.load('project', 'launch-ledger');
    if (stored) return ProjectSchema.parse(stored);
    const project = ProjectSchema.parse({
      schemaVersion: 1, id: 'launch-ledger',
      name: 'Launch Ledger — fictional SaaS', recorded: true, language: 'en',
    });
    this.save('project', project.id, project);
    return project;
  }

  captureSource(projectId: string, path: string, consent: { authorized: boolean }): Evidence {
    if (!consent.authorized) throw new Error('Source access requires explicit authorization.');
    if (!this.load('project', projectId)) throw new Error('Project unavailable.');
    const originalPath = resolve(path);
    const content = readFileSync(originalPath);
    try {
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(content);
      if (decoded.includes('\0')) throw new Error('Binary content');
    } catch {
      throw new Error('Source must be valid UTF-8 text; this extractor cannot read the file.');
    }
    const sha256 = hash(content);
    const previous = this.all('evidence').map(value => EvidenceSchema.parse(value))
      .filter(evidence => evidence.projectId === projectId && evidence.originalPath === originalPath);
    const identical = previous.find(evidence => evidence.sha256 === sha256);
    if (identical) return identical;
    const snapshots = join(this.dataDirectory, 'snapshots');
    mkdirSync(snapshots, { recursive: true });
    const snapshot = join(snapshots, sha256);
    try { writeFileSync(snapshot, content, { flag: 'wx' }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (hash(readFileSync(snapshot)) !== sha256) throw new Error('Snapshot integrity check failed.');
    }
    const evidence = EvidenceSchema.parse({
      schemaVersion: 1, id: randomUUID(), projectId, originalPath, sha256,
      revision: Math.max(0, ...previous.map(item => item.revision)) + 1,
      extraction: 'utf8-text',
    });
    this.save('evidence', evidence.id, evidence);
    return evidence;
  }

  resolveCitation(projectId: string, evidenceId: string, firstLine: number, lastLine: number) {
    const evidence = EvidenceSchema.parse(this.load('evidence', evidenceId));
    if (evidence.projectId !== projectId) throw new Error('Evidence is outside this project.');
    if (evidence.extraction !== 'utf8-text') throw new Error('PDF/DOCX citations require a document locator, not text lines.');
    const content = readFileSync(join(this.dataDirectory, 'snapshots', evidence.sha256));
    if (hash(content) !== evidence.sha256) throw new Error('Snapshot integrity check failed.');
    const lines = content.toString('utf8').split(/\r?\n/);
    if (!Number.isInteger(firstLine) || !Number.isInteger(lastLine) || firstLine < 1 || lastLine < firstLine || lastLine > lines.length) {
      throw new Error('Citation line range is invalid.');
    }
    let originalChanged = true;
    try { originalChanged = hash(readFileSync(evidence.originalPath)) !== evidence.sha256; }
    catch { /* The immutable snapshot remains available if the original is missing. */ }
    return {
      evidenceId, sha256: evidence.sha256, revision: evidence.revision,
      location: `${evidence.originalPath}:${firstLine}-${lastLine}`,
      text: lines.slice(firstLine - 1, lastLine).join('\n'), originalChanged,
    };
  }

  async captureDocument(projectId: string, path: string, consent: { authorized: boolean }) {
    if (!consent.authorized) throw new Error('Source access requires explicit authorization.');
    if (!this.load('project', projectId)) throw new Error('Project unavailable.');
    const originalPath = resolve(path);
    const extension = extname(originalPath).toLowerCase();
    if (extension !== '.pdf' && extension !== '.docx') throw new Error('Document extraction supports PDF and DOCX files only.');
    const format = extension === '.pdf' ? 'pdf' : 'docx';
    const extractor = format === 'pdf' ? 'pdfjs-text' : 'mammoth-blocks';
    const content = readFileSync(originalPath);
    const sha256 = hash(content);
    const previous = this.all('evidence').map(value => EvidenceSchema.parse(value))
      .filter(evidence => evidence.projectId === projectId && evidence.originalPath === originalPath);
    const identical = previous.find(evidence => evidence.sha256 === sha256 && evidence.extraction === extractor);
    if (identical) return { evidence: identical, extraction: this.readExtraction(identical) };
    // Extract the bytes already read, so a concurrent original edit cannot change this revision.
    const extraction = ExtractionSchema.parse(await extractDocument(content, format));
    const extractedBytes = Buffer.from(JSON.stringify(extraction), 'utf8');
    const extractionSha256 = hash(extractedBytes);
    const snapshots = join(this.dataDirectory, 'snapshots');
    mkdirSync(snapshots, { recursive: true });
    for (const [digest, bytes] of [[sha256, content], [extractionSha256, extractedBytes]] as const) {
      const snapshot = join(snapshots, digest);
      try { writeFileSync(snapshot, bytes, { flag: 'wx' }); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        if (hash(readFileSync(snapshot)) !== digest) throw new Error('Snapshot integrity check failed.');
      }
    }
    // Parsing is finished before taking the write lock. Reconcile records again so
    // captures that overlapped during extraction cannot create competing revisions.
    const evidence = this.db.transaction(() => {
      const latest = this.all('evidence').map(value => EvidenceSchema.parse(value))
        .filter(item => item.projectId === projectId && item.originalPath === originalPath);
      const existing = latest.find(item => item.sha256 === sha256 && item.extraction === extractor);
      if (existing) return existing;
      const created = EvidenceSchema.parse({
        schemaVersion: 1, id: randomUUID(), projectId, originalPath, sha256, extractionSha256,
        revision: Math.max(0, ...latest.map(item => item.revision)) + 1, extraction: extractor,
      });
      this.save('evidence', created.id, created);
      return created;
    }).immediate();
    return { evidence, extraction: this.readExtraction(evidence) };
  }

  resolveDocumentCitation(projectId: string, evidenceId: string, locator: DocumentLocator) {
    const evidence = EvidenceSchema.parse(this.load('evidence', evidenceId));
    if (evidence.projectId !== projectId) throw new Error('Evidence is outside this project.');
    const requested = DocumentLocatorSchema.parse(locator);
    const extraction = this.readExtraction(evidence);
    const chunk = extraction.chunks.find(candidate =>
      candidate.locator.kind === requested.kind &&
      (requested.kind === 'pdf-page'
        ? candidate.locator.kind === 'pdf-page' && candidate.locator.page === requested.page
        : candidate.locator.kind === 'docx-block' && candidate.locator.block === requested.block));
    if (!chunk || !chunk.text) throw new Error('No extracted text is available at this document location.');
    let originalChanged = true;
    try { originalChanged = hash(readFileSync(evidence.originalPath)) !== evidence.sha256; }
    catch { /* Saved citations remain available when an authorized original moves or disappears. */ }
    const reference = requested.kind === 'pdf-page' ? `page=${requested.page}` : `block=${requested.block}`;
    return {
      evidenceId, sha256: evidence.sha256, extractionSha256: evidence.extractionSha256,
      revision: evidence.revision, location: `${evidence.originalPath}#${reference}`,
      locator: requested, text: chunk.text, originalChanged, status: extraction.status, warnings: extraction.warnings,
    };
  }

  private readExtraction(evidence: Evidence) {
    if (!evidence.extractionSha256) throw new Error('Evidence is not a saved PDF/DOCX extraction.');
    const original = readFileSync(join(this.dataDirectory, 'snapshots', evidence.sha256));
    const bytes = readFileSync(join(this.dataDirectory, 'snapshots', evidence.extractionSha256));
    if (hash(original) !== evidence.sha256 || hash(bytes) !== evidence.extractionSha256) {
      throw new Error('Snapshot integrity check failed.');
    }
    return ExtractionSchema.parse(JSON.parse(bytes.toString('utf8')));
  }

  openRecordedExample(): RecordedMeeting {
    return this.db.transaction(() => {
      const saved = this.load('meeting', 'launch-ledger-recording-v1');
      if (saved) return RecordedMeetingSchema.parse(saved);
      const project = this.openDemo();
      // Serialize first creation as well as playback so another reader cannot reset its position.
      const source = fileURLToPath(new URL('../assets/demo/context.md', import.meta.url));
      const evidence = this.captureSource(project.id, source, { authorized: true });
      const fixture = FixtureSchema.parse(JSON.parse(readFileSync(new URL('../assets/demo/meeting.json', import.meta.url), 'utf8')));
      const meeting = RecordedMeetingSchema.parse({
        ...fixture, id: 'launch-ledger-recording-v1', projectId: project.id, evidenceId: evidence.id,
        mode: 'recorded', humanDecision: 'pending', contextVersion: 1, proposalVersion: 2, position: 0,
      });
      this.save('meeting', meeting.id, meeting);
      return meeting;
    }).immediate();
  }

  /** Versioned projection of the saved fixture, including recordings created by earlier candidates. */
  recordedDecision(projectId: string) {
    const meeting = this.openRecordedExample();
    if (meeting.projectId !== projectId) throw new Error('Recording is outside this project.');
    const evidence = EvidenceSchema.parse(this.load('evidence', meeting.evidenceId));
    const final = meeting.messages.find(message => message.phase === 'final-views');
    if (!final) throw new Error('The saved recording has no final views.');
    const roles = ['Product Owner', 'Lead Developer', 'Marketing Manager'] as const;
    return RecordedDecisionSchema.parse({
      schemaVersion: 1, mode: meeting.mode, projectId, meetingId: meeting.id,
      context: { schemaVersion: 1, version: meeting.contextVersion,
        sources: [{ evidenceId: evidence.id, revision: evidence.revision }] },
      proposals: meeting.messages.filter(message => message.phase === 'proposal' || message.phase === 'revision')
        .map((message, index) => ({ schemaVersion: 1, version: index + 1,
          contextVersion: meeting.contextVersion, messageId: message.id, text: message.text })),
      // This adapter reads the fixed recorded format; it never infers a stance from generated prose.
      views: roles.map(role => ({ schemaVersion: 1, role,
        model: meeting.messages.find(message => message.role === role)?.model,
        contextVersion: meeting.contextVersion, proposalVersion: meeting.proposalVersion,
        stance: new RegExp(`${role} (APPROVED|REJECTED|INSUFFICIENT_EVIDENCE)(?:[;.])`).exec(final.text)?.[1],
        statement: final.text })),
      humanDecision: meeting.humanDecision,
    });
  }

  nextRecordedMessage() {
    const opened = this.openRecordedExample();
    return this.db.transaction(() => {
      const meeting = RecordedMeetingSchema.parse(this.load('meeting', opened.id));
      const message = meeting.messages[meeting.position];
      if (!message) return null;
      this.save('meeting', meeting.id, { ...meeting, position: meeting.position + 1 });
      this.appendEvent({
        schemaVersion: 1, projectId: meeting.projectId, occurredAt: new Date().toISOString(),
        type: 'recorded.message', meetingId: meeting.id, messageId: message.id, position: meeting.position + 1,
      });
      return message;
    }).immediate();
  }

  history(projectId: string) {
    return this.db.transaction(() => {
      // One read snapshot prevents mixing an old event list with newer operation receipts.
      const rows = this.db.prepare('SELECT sequence, value FROM events WHERE project_id = ? ORDER BY sequence')
        .all(projectId) as { sequence: number; value: string }[];
      const events = rows.map(row => EventSchema.parse({ ...JSON.parse(row.value), sequence: row.sequence }));
      const prepared = new Map(events.filter(event => event.type === 'export.prepared')
        .map(event => [event.operationId, event.sequence]));
      const operations = this.all('export').map(value => ExportOperationSchema.parse(value))
        .filter(operation => operation.projectId === projectId)
        .sort((a, b) => (prepared.get(a.id) ?? Infinity) - (prepared.get(b.id) ?? Infinity));
      return { events, operations };
    })();
  }

  private appendEvent(event: EventInput): void {
    const validated = EventSchema.parse({ ...event, sequence: 1 });
    const { sequence: _sequence, ...payload } = validated;
    this.db.prepare('INSERT INTO events(project_id, value) VALUES (?, ?)').run(event.projectId, JSON.stringify(payload));
  }

  exportRecordedExample(outputDirectory: string) {
    return this.prepareRecordedExport(outputDirectory).execute();
  }

  /** Persist intent first; its one-process execution handle is never reconstructed on reopen. */
  prepareRecordedExport(outputDirectory: string) {
    const meeting = this.openRecordedExample();
    const citation = this.resolveCitation(meeting.projectId, meeting.evidenceId, 4, 4);
    const root = resolve(outputDirectory);
    const operationId = randomUUID();
    const directory = join(root, `boardroom-recorded-${operationId}`);
    const plan = join(directory, 'plan.md');
    const memo = join(directory, 'memo.md');
    let operation = ExportOperationSchema.parse({
      schemaVersion: 1, id: operationId, projectId: meeting.projectId, meetingId: meeting.id,
      type: 'recorded.export', status: 'unconfirmed', createdAt: new Date().toISOString(),
      directory, plan, memo, receipts: [],
    });
    this.db.transaction(() => {
      this.save('export', operation.id, operation);
      this.appendEvent({ schemaVersion: 1, projectId: meeting.projectId, occurredAt: operation.createdAt, type: 'export.prepared', operationId });
    }).immediate();
    return {
      operation: ExportOperationSchema.parse(operation),
      execute: () => {
        this.db.transaction(() => {
          const current = ExportOperationSchema.parse(this.load('export', operationId));
          if (current.status !== 'unconfirmed' || current.startedAt) {
            throw new Error(`Export ${operationId} was already attempted; it cannot be replayed.`);
          }
          operation = { ...current, startedAt: new Date().toISOString() };
          this.save('export', operation.id, operation);
          this.appendEvent({ schemaVersion: 1, projectId: meeting.projectId, occurredAt: operation.startedAt!, type: 'export.started', operationId });
        }).immediate();
        const provenance = `\n## Saved evidence\n\nSource: context.md, revision ${citation.revision}. SHA-256: ${citation.sha256}.\nStaffing objection: line 4. Acquisition uncertainty: line 6.\n\nRecorded example — scripted fixture. Human decision: pending.\n`;
        try {
          mkdirSync(root, { recursive: true });
          mkdirSync(directory);
          for (const [path, text] of [[plan, meeting.plan], [memo, meeting.memo]] as const) {
            const bytes = Buffer.from(text + provenance, 'utf8');
            writeFileSync(path, bytes, { flag: 'wx' });
            operation.receipts.push({ path, sha256: hash(bytes) });
          }
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          const errorCode = code && /^E[A-Z0-9]+$/.test(code) ? code : 'EXPORT_WRITE_FAILED';
          operation = { ...operation, status: 'failed', finishedAt: new Date().toISOString(), errorCode };
          this.db.transaction(() => {
            this.save('export', operation.id, operation);
            this.appendEvent({ schemaVersion: 1, projectId: meeting.projectId, occurredAt: operation.finishedAt!, type: 'export.failed', operationId });
          }).immediate();
          throw new Error(`Export ${operationId} failed (${errorCode}). Inspect history before creating a new export.`, { cause: error });
        }
        operation = { ...operation, status: 'completed', finishedAt: new Date().toISOString() };
        this.db.transaction(() => {
          this.save('export', operation.id, operation);
          this.appendEvent({ schemaVersion: 1, projectId: meeting.projectId, occurredAt: operation.finishedAt!, type: 'export.completed', operationId });
        }).immediate();
        return { operationId, directory, plan, memo };
      },
    };
  }

  private all(kind: string): unknown[] {
    return (this.db.prepare('SELECT value FROM records WHERE kind = ?').all(kind) as { value: string }[])
      .map(row => JSON.parse(row.value));
  }

  private load(kind: string, id: string): unknown {
    const row = this.db.prepare('SELECT value FROM records WHERE kind = ? AND id = ?')
      .get(kind, id) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : undefined;
  }

  private save(kind: string, id: string, value: unknown): void {
    this.db.prepare('INSERT INTO records(kind, id, value) VALUES (?, ?, ?) ON CONFLICT(kind, id) DO UPDATE SET value = excluded.value')
      .run(kind, id, JSON.stringify(value));
  }

  close(): void { this.db.close(); }
}
