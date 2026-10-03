import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { EvidenceSchema, FixtureSchema, ProjectSchema, RecordedMeetingSchema, type Project, type Evidence, type RecordedMeeting } from './domain.ts';
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
    const saved = this.load('meeting', 'launch-ledger-recording-v1');
    if (saved) return RecordedMeetingSchema.parse(saved);
    const project = this.openDemo();
    // This consent covers only the bundled, fictional demonstration source.
    const source = fileURLToPath(new URL('../assets/demo/context.md', import.meta.url));
    const evidence = this.captureSource(project.id, source, { authorized: true });
    const fixture = FixtureSchema.parse(JSON.parse(readFileSync(new URL('../assets/demo/meeting.json', import.meta.url), 'utf8')));
    const meeting = RecordedMeetingSchema.parse({
      ...fixture, id: 'launch-ledger-recording-v1', projectId: project.id, evidenceId: evidence.id,
      mode: 'recorded', humanDecision: 'pending', contextVersion: 1, proposalVersion: 2, position: 0,
    });
    this.save('meeting', meeting.id, meeting);
    return meeting;
  }

  nextRecordedMessage() {
    const meeting = this.openRecordedExample();
    const message = meeting.messages[meeting.position];
    if (!message) return null;
    this.save('meeting', meeting.id, { ...meeting, position: meeting.position + 1 });
    return message;
  }

  exportRecordedExample(outputDirectory: string) {
    const meeting = this.openRecordedExample();
    const citation = this.resolveCitation(meeting.projectId, meeting.evidenceId, 4, 4);
    const root = resolve(outputDirectory);
    mkdirSync(root, { recursive: true });
    const directory = mkdtempSync(join(root, 'boardroom-recorded-'));
    const plan = join(directory, 'plan.md');
    const memo = join(directory, 'memo.md');
    const provenance = `\n## Saved evidence\n\nSource: context.md, revision ${citation.revision}. SHA-256: ${citation.sha256}.\nStaffing objection: line 4. Acquisition uncertainty: line 6.\n\nRecorded example — scripted fixture. Human decision: pending.\n`;
    writeFileSync(plan, meeting.plan + provenance, { encoding: 'utf8', flag: 'wx' });
    writeFileSync(memo, meeting.memo + provenance, { encoding: 'utf8', flag: 'wx' });
    return { directory, plan, memo };
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
