import { parseArgs } from 'node:util';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Boardroom } from './application.ts';

const help = `BOARDROOM — local decision workspace

Recorded example: available without an account
Live meetings: unavailable
Commands and MCP: unavailable
Cloud telemetry: off

Usage:
  boardroom demo [--next]                 Read or resume the recorded example
  boardroom evidence [--line 4]          Inspect the saved source revision
  boardroom export --output <directory>  Create a new plan and decision memo
  boardroom status                      Show local capabilities
  boardroom doctor [--json]              Run separate local storage probes

Options: --data-dir <directory>, --terminal (Ink rendering), --json (export), --help
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
    },
  });
  const command = positionals[0];
  if (values.help || !command) {
    console.log(help);
  } else {
    if (!['demo', 'evidence', 'export', 'status', 'doctor'].includes(command) || positionals.length !== 1) {
      throw new Error('Unknown command. Run boardroom --help.');
    }
    if (command === 'export' && !values.output) throw new Error('Export requires --output <directory>.');
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
        const line = Number(values.line ?? '4');
        const meeting = app.openRecordedExample();
        const citation = app.resolveCitation(meeting.projectId, meeting.evidenceId, line, line);
        console.log(`Recorded example | saved evidence revision ${citation.revision}\n${citation.location}\nSHA-256: ${citation.sha256}\n${citation.text}`);
        if (citation.originalChanged) console.log('Warning: original changed or unavailable; showing the saved snapshot.');
      } else if (command === 'export') {
        const result = app.exportRecordedExample(values.output!);
        console.log(values.json ? JSON.stringify(result) : `Recorded example exported to:\n${result.plan}\n${result.memo}\nHuman decision: pending.`);
      } else if (command === 'doctor') {
        // Product telemetry is opt-in; inherited development tracing flags grant no consent.
        process.env.LANGSMITH_TRACING = 'false';
        process.env.LANGCHAIN_TRACING_V2 = 'false';
        const { StorageProbe } = await import('./technical-validation.ts');
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
        const result = {
          mode: 'technical-validation', platform: process.platform, architecture: process.arch,
          runtime: process.version, fts5: fts5 ? 'verified' : 'failed',
          checkpointReopen: reopened === 2 ? 'verified' : 'failed',
          liveProviders: 'unavailable', pdfDocx: 'unavailable', embeddings: 'unavailable',
          commandsMcp: 'unavailable', cloudTelemetry: 'off',
        };
        console.log(values.json ? JSON.stringify(result) : JSON.stringify(result, null, 2));
        if (!fts5 || reopened !== 2) process.exitCode = 1;
      } else {
        console.log(help);
      }
    } finally { app.close(); }
  }
} catch (error) {
  console.error(`BOARDROOM: ${error instanceof Error ? error.message : 'Operation failed.'}`);
  process.exitCode = 1;
}
