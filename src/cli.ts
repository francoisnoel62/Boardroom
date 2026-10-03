import { parseArgs } from 'node:util';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { Boardroom } from './application.ts';

const help = `BOARDROOM — local decision workspace

Recorded example: available without an account
Live meetings: unavailable
Commands and MCP: unavailable
Cloud telemetry: off

Usage:
  boardroom demo [--next]                 Read or resume the recorded example
  boardroom evidence [--line 4]          Inspect the saved source revision
  boardroom document --source <file> --allow-source  Save authorized PDF/DOCX text
  boardroom evidence --id <id> --page <n>           Inspect a saved PDF page
  boardroom evidence --id <id> --block <n>          Inspect a saved DOCX block
  boardroom export --output <directory>  Create a new plan and decision memo
  boardroom history [--json]             Inspect playback events and export receipts
  boardroom decision [--json]            Inspect saved context, proposals and adviser views
  boardroom trace --output <directory>   Export a filtered local technical trace
  boardroom status                      Show local capabilities
  boardroom doctor [--json]              Run separate local storage probes
  boardroom terminal-check              Try input during a fictional stream (TTY only)
  boardroom isolation-check --output <directory>  Measure fixed temporary protection probes

Options: --data-dir <directory>, --terminal (Ink rendering), --json, --help
`;

function defaultDataDirectory(): string {
  if (process.platform === 'win32') return join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Boardroom');
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'Boardroom');
  return join(process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share'), 'boardroom');
}

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean' }, next: { type: 'boolean' }, json: { type: 'boolean' }, terminal: { type: 'boolean' },
      'data-dir': { type: 'string' }, output: { type: 'string' }, line: { type: 'string' },
      source: { type: 'string' }, 'allow-source': { type: 'boolean' },
      id: { type: 'string' }, page: { type: 'string' }, block: { type: 'string' },
    },
  });
  const command = positionals[0];
  if (values.help || !command) {
    console.log(help);
  } else if (command === 'terminal-check' && positionals.length === 1) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new Error('Terminal validation requires an interactive terminal for input and output.');
    }
    const { runTerminalValidation } = await import('./terminal-validation.tsx');
    await runTerminalValidation();
  } else if (command === 'isolation-check' && positionals.length === 1) {
    if (!values.output) throw new Error('Isolation validation requires --output <directory>.');
    const { exportIsolationReport } = await import('./isolation-validation.ts');
    const path = await exportIsolationReport(values.output);
    console.log(values.json ? JSON.stringify({ mode: 'technical-isolation-validation', path })
      : `Technical isolation report: ${path}\nCommands and MCP remain unavailable.`);
  } else {
    if (!['demo', 'evidence', 'export', 'status', 'doctor', 'document', 'history', 'decision', 'trace'].includes(command) || positionals.length !== 1) {
      throw new Error('Unknown command. Run boardroom --help.');
    }
    if (command === 'export' && !values.output) throw new Error('Export requires --output <directory>.');
    if (command === 'trace' && !values.output) throw new Error('Trace export requires --output <directory>.');
    if (command === 'document' && !values.source) throw new Error('Document extraction requires --source <file>.');
    if (command === 'document' && !values['allow-source']) throw new Error('Document reading requires explicit source consent: add --allow-source for this file.');
    if (command === 'evidence' && values.id && ((values.page !== undefined) === (values.block !== undefined))) {
      throw new Error('Saved document evidence requires exactly one --page or --block locator.');
    }
    if (command === 'evidence' && !values.id && (values.page || values.block)) throw new Error('A document locator requires --id <evidence-id>.');
    const app = new Boardroom(values['data-dir'] ?? defaultDataDirectory());
    try {
      if (command === 'demo') {
        const transcript = ['BOARDROOM | Recorded example — scripted fictional fixture; no model calls.\n'];
        let count = 0;
        do {
          const message = app.nextRecordedMessage();
          if (!message) break;
          transcript.push(`[${message.phase}] ${message.role} | ${message.model}\n${message.text}`);
          if (message.citation) transcript.push(`Evidence: context.md:${message.citation.firstLine}-${message.citation.lastLine}`);
          transcript.push('');
          count += 1;
        } while (!values.next);
        if (!count) transcript.push('Recording complete. Inspect evidence or export the saved result.');
        const text = transcript.join('\n');
        if (values.terminal || process.stdout.isTTY) {
          const { displayTranscript } = await import('./terminal.tsx');
          await displayTranscript(text);
        } else { console.log(text); }
      } else if (command === 'evidence') {
        if (values.id) {
          const project = app.openDemo();
          const locator = values.page !== undefined
            ? { kind: 'pdf-page' as const, page: Number(values.page) }
            : { kind: 'docx-block' as const, block: Number(values.block) };
          const citation = app.resolveDocumentCitation(project.id, values.id, locator);
          console.log(values.json ? JSON.stringify(citation)
            : `Saved document revision ${citation.revision}\n${citation.location}\nSHA-256: ${citation.sha256}\n${citation.text}\n${citation.warnings.map(warning => `Warning: ${warning}`).join('\n')}`);
          if (citation.originalChanged && !values.json) console.log('Warning: original changed or unavailable; showing the saved snapshot.');
        } else {
          const line = Number(values.line ?? '4');
          const meeting = app.openRecordedExample();
          const citation = app.resolveCitation(meeting.projectId, meeting.evidenceId, line, line);
          console.log(`Recorded example | saved evidence revision ${citation.revision}\n${citation.location}\nSHA-256: ${citation.sha256}\n${citation.text}`);
          if (citation.originalChanged) console.log('Warning: original changed or unavailable; showing the saved snapshot.');
        }
      } else if (command === 'document') {
        const project = app.openDemo();
        const result = await app.captureDocument(project.id, values.source!, { authorized: true });
        console.log(values.json ? JSON.stringify(result)
          : `Saved document evidence: ${result.evidence.id}\nExtraction: ${result.extraction.status}\n${result.extraction.chunks.map(chunk => `${JSON.stringify(chunk.locator)}\n${chunk.text}`).join('\n\n')}\n${result.extraction.warnings.map(warning => `Warning: ${warning}`).join('\n')}`);
        if (result.extraction.status === 'failed') process.exitCode = 2;
      } else if (command === 'export') {
        const result = app.exportRecordedExample(values.output!);
        console.log(values.json ? JSON.stringify(result) : `Recorded example export: ${result.operationId}\n${result.plan}\n${result.memo}\nHuman decision: pending.`);
      } else if (command === 'trace') {
        const path = app.exportFilteredTrace(app.openDemo().id, values.output!);
        console.log(values.json ? JSON.stringify({ mode: 'local-filtered-trace', path }) : `Local filtered trace: ${path}\nCloud telemetry: off.`);
      } else if (command === 'decision') {
        const decision = app.recordedDecision(app.openDemo().id);
        console.log(values.json ? JSON.stringify(decision) : [
          'Recorded example | saved decision',
          `Context v${decision.context.version} | proposal v${decision.proposals.at(-1)!.version}`,
          ...decision.proposals.map(proposal => proposal.text),
          ...decision.views.map(view => `${view.role}: ${view.stance} on v${view.proposalVersion}`),
          'Human decision: pending. Adviser views do not decide for the human.',
        ].join('\n'));
      } else if (command === 'history') {
        const history = app.history(app.openDemo().id);
        if (values.json) { console.log(JSON.stringify(history)); }
        else {
          const events = history.events.map(event => {
            const detail = event.type === 'recorded.message'
              ? `${event.messageId} | position ${event.position}` : event.operationId;
            return `#${event.sequence} ${event.occurredAt} | ${event.type} | ${detail}`;
          });
          const operations = history.operations.map(operation => [
            `${operation.id} | ${operation.status}${operation.errorCode ? ` (${operation.errorCode})` : ''}`,
            `Directory: ${operation.directory}`,
            ...operation.receipts.map(receipt => `${receipt.path} | SHA-256: ${receipt.sha256}`),
            ...(operation.status === 'unconfirmed'
              ? ['Outcome unconfirmed. Inspect the directory before requesting a new export; no automatic retry.'] : []),
          ].join('\n'));
          console.log(['Recorded example | saved history', ...events, 'Exports:', ...operations].join('\n'));
        }
      } else if (command === 'doctor') {
        // Product telemetry is opt-in; inherited development tracing flags grant no consent.
        process.env.LANGSMITH_TRACING = 'false';
        process.env.LANGCHAIN_TRACING_V2 = 'false';
        const { StorageProbe, optionalProbeResults } = await import('./technical-validation.ts');
        let probe = new StorageProbe(app.dataDirectory);
        let fts5: boolean;
        try {
          await probe.runCheckpoint();
          fts5 = probe.checkFts5();
        } finally { probe.close(); }
        probe = new StorageProbe(app.dataDirectory);
        let reopened: number | undefined;
        try { reopened = await probe.readCheckpoint(); }
        finally { probe.close(); }
        const { extractDocument } = await import('./extraction.ts');
        const pdf = await extractDocument(readFileSync(new URL('../assets/validation/launch.pdf', import.meta.url)), 'pdf');
        const docx = await extractDocument(readFileSync(new URL('../assets/validation/launch.docx', import.meta.url)), 'docx');
        const pdfVerified = pdf.status === 'complete' && pdf.chunks.length === 2
          && pdf.chunks[1]?.text === 'Launch scope: one integration.';
        const docxVerified = docx.status === 'complete' && docx.chunks.length === 3
          && docx.chunks[1]?.text === 'Budget: €500 for the café pilot.';
        const result = {
          mode: 'technical-validation', platform: process.platform, architecture: process.arch,
          runtime: process.version, fts5: fts5 ? 'verified' : 'failed',
          checkpointReopen: reopened === 2 ? 'verified' : 'failed',
          liveProviders: 'unavailable',
          pdfDocx: { pdf: pdfVerified ? 'verified' : 'failed', docx: docxVerified ? 'verified' : 'failed' },
          embeddings: 'unavailable',
          optionalProbes: optionalProbeResults(),
          commandsMcp: 'unavailable', cloudTelemetry: 'off',
        };
        console.log(values.json ? JSON.stringify(result) : JSON.stringify(result, null, 2));
        if (!fts5 || reopened !== 2 || !pdfVerified || !docxVerified) process.exitCode = 1;
      } else {
        console.log(help);
      }
    } finally { app.close(); }
  }
} catch (error) {
  console.error(`BOARDROOM: ${error instanceof Error ? error.message : 'Operation failed.'}`);
  process.exitCode = 1;
}
