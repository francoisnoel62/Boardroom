import { PublicError, publicDiagnostic } from './privacy.ts';
import { parseArgs } from 'node:util';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { Boardroom } from './application.ts';
import { HostSecretStore, SessionSecretStore } from './secrets.ts';

const sessionKey = process.env.BOARDROOM_SESSION_KEY;
delete process.env.BOARDROOM_SESSION_KEY;
const sessionKeys = process.env.BOARDROOM_SESSION_KEYS;
delete process.env.BOARDROOM_SESSION_KEYS;

const help = `BOARDROOM — local decision workspace

Recorded example: available without an account
Live meetings: unavailable (full decision workflow)
PO framing: available with explicit paid access and human approval
Commands and MCP: unavailable
Cloud telemetry: off

Usage:
  boardroom route-configure --input <json-file> [--catalog]  Save an unverified declared or supported route
  boardroom provider-preflight --project <id> --id <meeting-id> --adviser <id> --allow-provider [--session]  Paid connection test
  boardroom team-configure --input <json-file>   Save the three-adviser Plan 02 profile
  boardroom configuration [--json]              Inspect shareable configuration without credentials
  boardroom credential-set --route <id>         Enter a masked credential into the host vault
  boardroom credential-set --route <id> --secret-stdin  Store an explicitly piped credential
  boardroom credential-check --route <id> [--session]   Check presence without showing the key
  boardroom credential-delete --route <id>      Delete this route's host credential
  boardroom project-create --name <name> [--language en]  Create a real project
  boardroom project --id <project-id>    Inspect a saved project
  boardroom source --project <id> --source <file> --allow-source  Save authorized UTF-8 text
  boardroom meeting-prepare --project <id> --input <json-file> [--team <id>]  Freeze a question and selected passages
  boardroom meeting --project <id> --id <meeting-id>          Inspect a prepared meeting
  boardroom meeting-context --project <id> --id <meeting-id>  Read its frozen text passages
  boardroom meeting-start --project <id> --id <meeting-id> --allow-provider [--session]  Produce PO framing and wait
  boardroom meeting-framing --project <id> --id <meeting-id>  Inspect durable framing versions
  boardroom meeting-approve --project <id> --id <meeting-id> --version <n>  Approve the displayed framing
  boardroom meeting-correct --project <id> --id <meeting-id> --version <n> --input <json-file>  Save a human correction
  boardroom meeting-stop --project <id> --id <meeting-id>  Stop and preserve saved framing
  boardroom meeting-analyse --project <id> --id <meeting-id> --allow-provider [--session]  Three independent analyses
  boardroom meeting-analyses --project <id> --id <meeting-id>  Inspect saved analyses and missing advisers
  boardroom execution-configure --project <id> --id <meeting-id> --input <json-file>  Freeze protected reserves
  boardroom calls --project <id> --id <meeting-id>  Inspect budgets, time and call receipts
  boardroom execution-stop --project <id> --id <meeting-id>  Stop pending and in-flight work
  boardroom execution-conclude --project <id> --id <meeting-id>  Protect early conclusion
  boardroom demo [--next]                 Read or resume the recorded example
  boardroom evidence [--line 4]          Inspect the saved source revision
  boardroom document --source <file> --allow-source  Save authorized PDF/DOCX text
  boardroom evidence --id <id> --page <n>           Inspect a saved PDF page
  boardroom evidence --id <id> --block <n>          Inspect a saved DOCX block
  boardroom export --output <directory>  Create a new plan and decision memo
  boardroom history [--project <id>] [--json]  Inspect saved events and export receipts
  boardroom decision [--json]            Inspect saved context, proposals and adviser views
  boardroom trace --output <directory> [--project <id>]  Export a filtered local technical trace
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
      name: { type: 'string' }, language: { type: 'string' },
      project: { type: 'string' },
      input: { type: 'string' },
      route: { type: 'string' }, team: { type: 'string' }, session: { type: 'boolean' },
      'secret-stdin': { type: 'boolean' },
      catalog: { type: 'boolean' }, adviser: { type: 'string' }, 'allow-provider': { type: 'boolean' },
      version: { type: 'string' },
    },
  });
  const command = positionals[0];
  if (values.help || !command) {
    console.log(help);
  } else if (command === 'terminal-check' && positionals.length === 1) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new PublicError('Terminal validation requires an interactive terminal for input and output.');
    }
    const { runTerminalValidation } = await import('./terminal-validation.tsx');
    await runTerminalValidation();
  } else if (command === 'isolation-check' && positionals.length === 1) {
    if (!values.output) throw new PublicError('Isolation validation requires --output <directory>.');
    const { exportIsolationReport } = await import('./isolation-validation.ts');
    const path = await exportIsolationReport(values.output);
    console.log(values.json ? JSON.stringify({ mode: 'technical-isolation-validation', path })
      : `Technical isolation report: ${path}\nCommands and MCP remain unavailable.`);
  } else {
    if (!['meeting-analyse', 'meeting-analyses', 'meeting-start', 'meeting-framing', 'meeting-approve', 'meeting-correct', 'meeting-stop', 'provider-preflight', 'execution-configure', 'calls', 'execution-stop', 'execution-conclude', 'route-configure', 'team-configure', 'configuration', 'credential-set', 'credential-check', 'credential-delete', 'project-create', 'project', 'source', 'meeting-prepare', 'meeting', 'meeting-context', 'demo', 'evidence', 'export', 'status', 'doctor', 'document', 'history', 'decision', 'trace'].includes(command) || positionals.length !== 1) {
      throw new PublicError('Unknown command. Run boardroom --help.');
    }
    if (['route-configure', 'team-configure'].includes(command) && !values.input) throw new PublicError('Configuration requires --input <json-file>.');
    if (command.startsWith('credential-') && !values.route) throw new PublicError('Credential commands require --route <route-id>.');
    if (values.session && !['meeting-analyse', 'credential-check', 'provider-preflight', 'meeting-start'].includes(command)) throw new PublicError('Session injection requires a credential check or explicit provider operation.');
    if (['meeting-start', 'meeting-framing', 'meeting-approve', 'meeting-correct', 'meeting-stop'].includes(command)) {
      if (!values.project || !values.id) throw new PublicError('Framing commands require --project and --id.');
      if (command === 'meeting-start' && !values['allow-provider']) throw new PublicError('Paid framing requires explicit --allow-provider.');
      if (['meeting-approve', 'meeting-correct'].includes(command) && (!values.version || !/^[1-9][0-9]*$/.test(values.version)
        || !Number.isSafeInteger(Number(values.version)))) throw new PublicError('Human agreement/correction requires an explicit --version <positive-integer>.');
      if (command === 'meeting-correct' && !values.input) throw new PublicError('Correction requires --input <json-file>.');
    }
    if (command === 'provider-preflight' && (!values.project || !values.id || !values.adviser || !values['allow-provider'])) {
      throw new PublicError('Paid preflight requires --project, --id, --adviser and explicit --allow-provider.');
    }
    if (values['secret-stdin'] && command !== 'credential-set') throw new PublicError('--secret-stdin is available only for credential-set.');
    if (command === 'project-create' && !values.name) throw new PublicError('Project creation requires --name <name>.');
    if (command === 'project' && !values.id) throw new PublicError('Project inspection requires --id <project-id>.');
    if (['meeting-prepare', 'meeting', 'meeting-context'].includes(command) && !values.project) throw new PublicError('Meeting commands require --project <project-id>.');
    if (command === 'meeting-prepare' && !values.input) throw new PublicError('Meeting preparation requires --input <json-file>.');
    if (['execution-configure', 'calls', 'execution-stop', 'execution-conclude'].includes(command)) {
      if (!values.project || !values.id) throw new PublicError('Execution commands require --project and --id.');
      if (command === 'execution-configure' && !values.input) throw new PublicError('Execution configuration requires --input <json-file>.');
    }
    if ((command === 'meeting' || command === 'meeting-context') && !values.id) throw new PublicError('Meeting inspection requires --id <meeting-id>.');
    if (command === 'export' && !values.output) throw new PublicError('Export requires --output <directory>.');
    if (command === 'trace' && !values.output) throw new PublicError('Trace export requires --output <directory>.');
    if (command === 'source' && !values.project) throw new PublicError('Text capture requires --project <project-id>.');
    if ((command === 'source' || command === 'document') && !values.source) throw new PublicError('Source capture requires --source <file>.');
    if ((command === 'source' || command === 'document') && !values['allow-source']) throw new PublicError('Document reading requires explicit source consent: add --allow-source for this file.');
    if (command === 'evidence' && values.id && ((values.page !== undefined) === (values.block !== undefined))) {
      throw new PublicError('Saved document evidence requires exactly one --page or --block locator.');
    }
    if (command === 'evidence' && !values.id && (values.page || values.block)) throw new PublicError('A document locator requires --id <evidence-id>.');
    const app = new Boardroom(values['data-dir'] ?? defaultDataDirectory());
    try {
      if (command === 'meeting-analyse' || command === 'meeting-analyses') {
        if (!values.project || !values.id) throw new PublicError('Analysis commands require --project and --id.');
        let result;
        if (command === 'meeting-analyse') {
          if (!values['allow-provider']) throw new PublicError('Paid analyses require explicit --allow-provider.');
          const store = values.session ? new SessionSecretStore() : new HostSecretStore();
          try {
            if (values.session) {
              let keys: any;
              try { keys = JSON.parse(sessionKeys ?? 'null'); } catch { throw new PublicError('Invalid session credential map.'); }
              if (!keys || typeof keys !== 'object' || Array.isArray(keys)) throw new PublicError('Session analyses require BOARDROOM_SESSION_KEYS keyed by frozen route ID.');
              for (const route of app.getMeeting(values.project, values.id).team!.routes) {
                if (typeof keys[route.id] !== 'string') throw new PublicError('Session credential missing for a frozen route.');
                await app.setRouteCredential(route.id, keys[route.id], store);
              }
            }
            result = await app.analyseMeeting(values.project, values.id, store);
          } finally { if (store instanceof SessionSecretStore) store.clear(); }
          if (result.status !== 'complete') process.exitCode = 2;
        } else result = await app.inspectAnalyses(values.project, values.id);
        console.log(JSON.stringify(result, null, values.json ? undefined : 2));
      } else if (['meeting-start', 'meeting-framing', 'meeting-approve', 'meeting-correct', 'meeting-stop'].includes(command)) {
        let result;
        if (command === 'meeting-start') {
          const meeting = app.getMeeting(values.project!, values.id!);
          const routeId = meeting.team?.advisers.find(adviser => adviser.id === meeting.proposalAuthorId)?.routeId;
          if (!routeId) throw new PublicError('Frozen PO route unavailable.');
          const store = values.session ? new SessionSecretStore() : new HostSecretStore();
          try {
            if (values.session) {
              if (!sessionKey) throw new PublicError('Session injection requires BOARDROOM_SESSION_KEY for this process.');
              await app.setRouteCredential(routeId, sessionKey, store);
            }
            result = await app.startMeeting(values.project!, values.id!, store);
          } finally { if (store instanceof SessionSecretStore) store.clear(); }
          if (result.status !== 'awaiting-human') process.exitCode = 2;
        } else if (command === 'meeting-approve') result = await app.approveFraming(values.project!, values.id!, Number(values.version));
        else if (command === 'meeting-correct') result = await app.correctFraming(values.project!, values.id!, Number(values.version), JSON.parse(readFileSync(values.input!, 'utf8')));
        else {
          if (command === 'meeting-stop') app.stopExecution(values.project!, values.id!);
          result = await app.inspectMeeting(values.project!, values.id!);
        }
        console.log(JSON.stringify(result, null, values.json ? undefined : 2));
      } else if (command === 'provider-preflight') {
        const meeting = app.getMeeting(values.project!, values.id!);
        const routeId = meeting.team?.advisers.find(adviser => adviser.id === values.adviser)?.routeId;
        if (!routeId) throw new PublicError('Frozen adviser route unavailable.');
        const store = values.session ? new SessionSecretStore() : new HostSecretStore();
        try {
          if (values.session) {
            if (!sessionKey) throw new PublicError('Session injection requires BOARDROOM_SESSION_KEY for this process.');
            await app.setRouteCredential(routeId, sessionKey, store);
          }
          const result = await app.preflight(values.project!, values.id!, values.adviser!, store);
          console.log(JSON.stringify(result)); if (!result.verified) process.exitCode = 2;
        } finally { if (store instanceof SessionSecretStore) store.clear(); }
      } else if (['execution-configure', 'calls', 'execution-stop', 'execution-conclude'].includes(command)) {
        const result = command === 'execution-configure'
          ? app.configureExecution(values.project!, values.id!, JSON.parse(readFileSync(values.input!, 'utf8')))
          : command === 'calls' ? app.callLedger(values.project!, values.id!)
          : command === 'execution-stop' ? app.stopExecution(values.project!, values.id!)
          : app.requestConclusion(values.project!, values.id!);
        console.log(JSON.stringify(result, null, values.json ? undefined : 2));
      } else if (command === 'route-configure' || command === 'team-configure' || command === 'configuration') {
        const result = command === 'configuration' ? app.configuration() : command === 'team-configure'
          ? app.configureTeam(JSON.parse(readFileSync(values.input!, 'utf8'))) : (() => {
            const input = JSON.parse(readFileSync(values.input!, 'utf8'));
            const { credentialRef: _secret, ...route } = values.catalog ? app.configureSupportedRoute(input) : app.configureRoute(input);
            return route;
          })();
        console.log(JSON.stringify(result, null, values.json ? undefined : 2));
      } else if (command.startsWith('credential-')) {
        const store = values.session ? new SessionSecretStore() : new HostSecretStore();
        if (values.session) {
          if (!sessionKey) throw new PublicError('Session injection requires BOARDROOM_SESSION_KEY for this process.');
          await app.setRouteCredential(values.route!, sessionKey, store);
        }
        if (command === 'credential-set') {
          app.getRoute(values.route!); // Fail before prompting if no route exists.
          const { readCredential } = await import('./credential-input.ts');
          await app.setRouteCredential(values.route!, await readCredential(!!values['secret-stdin']), store);
        } else if (command === 'credential-delete') await app.deleteRouteCredential(values.route!, store);
        const status = await app.routeCredentialStatus(values.route!, store);
        console.log(JSON.stringify(status));
        if (status.status !== 'available' && command !== 'credential-delete') process.exitCode = 2;
        if (store instanceof SessionSecretStore) store.clear();
      } else if (command === 'project-create' || command === 'project') {
        const project = command === 'project-create'
          ? app.createProject({ name: values.name!, language: values.language ?? 'en' }) : app.getProject(values.id!);
        console.log(values.json ? JSON.stringify(project)
          : `${project.recorded ? 'Recorded' : 'Real'} project: ${project.id}\nName: ${project.name}\nLanguage: ${project.language}`);
      } else if (command === 'meeting-prepare' || command === 'meeting') {
        const meeting = command === 'meeting' ? app.getMeeting(values.project!, values.id!) : (() => {
          const input = JSON.parse(readFileSync(values.input!, 'utf8'));
          if (!input || typeof input !== 'object' || Array.isArray(input) || 'projectId' in input) {
            throw new PublicError('Meeting input must be an object without projectId; use --project.');
          }
          return values.team ? app.prepareTeamMeeting({ ...input, projectId: values.project!, teamId: values.team })
            : app.prepareMeeting({ ...input, projectId: values.project! });
        })();
        console.log(values.json ? JSON.stringify(meeting) : [
          'Live meeting prepared — no model calls.', `Meeting: ${meeting.id}`, `Project: ${meeting.projectId}`,
          `Question: ${meeting.question}`, `Language: ${meeting.language}`,
          `Context v${meeting.context.version} | ${meeting.context.passages.length} selected passages`,
          ...(meeting.team ? [`Team: ${meeting.team.id} v${meeting.team.revision}`,
            ...meeting.team.routes.map(route => `${route.id} v${route.revision} | ${route.providerId}/${route.modelId} | ${route.verification}`)] : []),
          `Duration target: ${meeting.durationTargetSeconds}s | declared ceiling: ${meeting.costCeiling.amount} ${meeting.costCeiling.currency}`,
          'Use execution-configure to freeze protected reserves; provider-preflight explicitly tests a supported paid route.',
        ].join('\n'));
      } else if (command === 'meeting-context') {
        const context = app.readMeetingContext(values.project!, values.id!);
        console.log(values.json ? JSON.stringify(context) : [
          `Frozen context v${context.contextVersion}`,
          ...context.passages.map(passage => `Evidence ${passage.evidenceId} | revision ${passage.revision}\n${passage.location}\nSHA-256: ${passage.sha256}\n${passage.text}${passage.originalChanged ? '\nWarning: original changed or unavailable; showing the saved snapshot.' : ''}`),
        ].join('\n\n'));
      } else if (command === 'source') {
        const evidence = app.captureSource(values.project!, values.source!, { authorized: true });
        console.log(values.json ? JSON.stringify(evidence)
          : `Saved text evidence: ${evidence.id}\nRevision: ${evidence.revision}\nSHA-256: ${evidence.sha256}`);
      } else if (command === 'demo') {
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
        const path = app.exportFilteredTrace(values.project ?? app.openDemo().id, values.output!);
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
        const history = app.history(values.project ?? app.openDemo().id);
        if (values.json) { console.log(JSON.stringify(history)); }
        else {
          const events = history.events.map(event => {
            const detail = event.type === 'recorded.message'
              ? `${event.messageId} | position ${event.position}`
              : event.type === 'live.meeting-prepared' ? `${event.meetingId} | context v${event.contextVersion}`
              : 'callId' in event ? event.callId : 'meetingId' in event ? event.meetingId : event.operationId;
            return `#${event.sequence} ${event.occurredAt} | ${event.type} | ${detail}`;
          });
          const operations = history.operations.map(operation => [
            `${operation.id} | ${operation.status}${operation.errorCode ? ` (${operation.errorCode})` : ''}`,
            `Directory: ${operation.directory}`,
            ...operation.receipts.map(receipt => `${receipt.path} | SHA-256: ${receipt.sha256}`),
            ...(operation.status === 'unconfirmed'
              ? ['Outcome unconfirmed. Inspect the directory before requesting a new export; no automatic retry.'] : []),
          ].join('\n'));
          console.log([values.project ? `Project ${values.project} | saved history` : 'Recorded example | saved history', ...events, 'Exports:', ...operations].join('\n'));
        }
      } else if (command === 'doctor') {
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
  console.error(`BOARDROOM: ${publicDiagnostic(error)}`);
  process.exitCode = 1;
}
