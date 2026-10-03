import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openTerminal } from './terminal.ts';
import { qualifyLiveDecision } from './live-decision.mjs';

const candidate = fileURLToPath(new URL('..', import.meta.url));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');

test('installed launcher completes the account-free journey with only the bundled Node', { timeout: 90000 }, async t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom installed François '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const evidence = process.env.BOARDROOM_QUALIFICATION_OUTPUT ?? join(root, 'evidence');
  mkdirSync(evidence, { recursive: true });
  const mode = process.env.BOARDROOM_INSTALLATION_MODE ?? 'local-empty-path';
  assert.ok(['clean', 'local-empty-path'].includes(mode));
  // macOS Keychain belongs to the real login HOME. Isolate application data
  // explicitly there rather than inventing a login home with no default vault.
  const macDataDirectory = join(root, 'application-data');
  const env = { ...process.env, NODE_PATH: '', NODE_OPTIONS: '', HOME: process.platform === 'darwin' ? process.env.HOME : join(root, 'home'),
    LOCALAPPDATA: join(root, 'local'), XDG_DATA_HOME: join(root, 'xdg'), CI: 'true',
    LANGSMITH_TRACING: 'false', LANGCHAIN_TRACING_V2: 'false' };
  if (mode === 'local-empty-path') env.PATH = '';
  const noHostNode = spawnSync('node', ['--version'], { env, encoding: 'utf8' });
  assert.equal(noHostNode.error?.code, 'ENOENT', 'An application Node is still reachable through PATH.');
  let removalProof;
  if (mode === 'clean') {
    assert.ok(process.env.BOARDROOM_NO_NODE_PROOF, 'Clean qualification requires environment-removal evidence.');
    removalProof = JSON.parse(readFileSync(process.env.BOARDROOM_NO_NODE_PROOF, 'utf8'));
    assert.equal(removalProof.systemNodeVisible, false);
    for (const path of removalProof.absentPaths) assert.equal(existsSync(path), false, `Host Node remains at ${path}`);
  }
  const launcher = join(candidate, process.platform === 'win32' ? 'boardroom.cmd' : 'boardroom');
  const commandLog = [];
  const invokeInput = (input, ...args) => {
    if (process.platform === 'darwin') args.push('--data-dir', macDataDirectory);
    commandLog.push(args);
    const quote = arg => { assert.ok(!/["\r\n%]/.test(arg)); return `"${arg}"`; };
    const command = process.platform === 'win32' ? join(process.env.SystemRoot, 'System32', 'cmd.exe') : launcher;
    const arguments_ = process.platform === 'win32' ? ['/d', '/s', '/c', `"${[launcher, ...args].map(quote).join(' ')}"`] : args;
    return spawnSync(command, arguments_, { input, encoding: 'utf8', cwd: root, env,
      ...(process.platform === 'win32' ? { windowsVerbatimArguments: true } : {}) });
  };
  const invoke = (...args) => invokeInput(undefined, ...args);
  const run = (...args) => { const result = invoke(...args); assert.equal(result.status, 0, result.stdout + result.stderr); return result.stdout; };
  const original = join(candidate, 'assets', 'demo', 'context.md');
  const originalHash = hash(original);
  assert.match(run('--help'), /Recorded example: available without an account/);
  assert.match(run('demo', '--next'), /Product Owner/);
  assert.match(run('demo', '--next'), /Lead Developer/);
  assert.match(run('evidence', '--line', '4'), /Team: two engineers/);
  const output = join(root, 'outputs');
  const first = JSON.parse(run('export', '--output', output, '--json'));
  const second = JSON.parse(run('export', '--output', output, '--json'));
  assert.notEqual(first.directory, second.directory);
  assert.match(readFileSync(first.memo, 'utf8'), /INSUFFICIENT_EVIDENCE/);
  assert.match(readFileSync(first.plan, 'utf8'), /Recorded example/);
  copyFileSync(first.plan, join(evidence, 'export-plan.md'));
  copyFileSync(first.memo, join(evidence, 'export-memo.md'));
  const history = JSON.parse(run('history', '--json'));
  assert.equal(history.events.filter(event => event.type === 'recorded.message').length, 2);
  assert.equal(history.operations.length, 2);
  assert.deepEqual(JSON.parse(run('history', '--json')), history);
  assert.equal(JSON.parse(run('decision', '--json')).humanDecision, 'pending');
  const liveProject = JSON.parse(run('project-create', '--name', 'Local pilot', '--language', 'en', '--json'));
  assert.equal(liveProject.recorded, false);
  assert.deepEqual(JSON.parse(run('project', '--id', liveProject.id, '--json')), liveProject);
  const liveSource = join(root, 'pilot-context.md');
  copyFileSync(original, liveSource);
  const liveEvidence = JSON.parse(run('source', '--project', liveProject.id, '--source', liveSource, '--allow-source', '--json'));
  const question = JSON.parse(readFileSync(join(candidate, 'assets', 'validation', 'live-question.json'), 'utf8'));
  question.passages[0].evidenceId = liveEvidence.id;
  question.costCeiling.amount = 0;
  const questionPath = join(root, 'question.json');
  writeFileSync(questionPath, JSON.stringify(question));
  const prepared = JSON.parse(run('meeting-prepare', '--project', liveProject.id, '--input', questionPath, '--json'));
  assert.equal(prepared.status, 'prepared');
  assert.equal(prepared.initialPlan, undefined);
  assert.deepEqual(JSON.parse(run('meeting', '--project', liveProject.id, '--id', prepared.id, '--json')), prepared);
  assert.equal(hash(liveSource), originalHash);
  writeFileSync(liveSource, 'Changed local copy.');
  const frozen = JSON.parse(run('meeting-context', '--project', liveProject.id, '--id', prepared.id, '--json'));
  assert.equal(frozen.passages[0].text, 'Team: two engineers; four weeks available for the launch.');
  assert.equal(frozen.passages[0].originalChanged, true);
  assert.deepEqual(JSON.parse(run('history', '--project', liveProject.id, '--json')).events.map(event => event.type), ['live.meeting-prepared']);
  assert.match(run('status'), /Live meetings: available/);
  writeFileSync(join(evidence, 'live-preparation.json'), JSON.stringify({
    schemaVersion: 1, status: prepared.status, noModelCalls: true,
    originalPreserved: hash(original) === originalHash, frozenPassage: frozen.passages[0].text,
    contextVersion: prepared.context.version, sourceSha256: liveEvidence.sha256,
  }, null, 2) + '\n');
  const configurationFile = join(root, 'routes.json');
  for (const [id, providerId, modelId] of [['po', 'a', 'a1'], ['dev', 'b', 'b1'], ['marketing', 'a', 'a2']]) {
    writeFileSync(configurationFile, JSON.stringify({ id, providerId, modelId, capabilities: {
      streaming: true, structuredOutput: 'json', tools: false, cancellation: 'best-effort', usage: 'tokens',
    }, limitations: ['Declared, not account-verified.'] }));
    assert.equal(JSON.parse(run('route-configure', '--input', configurationFile, '--json')).verification, 'unverified');
  }
  writeFileSync(configurationFile, JSON.stringify({ id: 'decision', proposalAuthorId: 'po', advisers: [
    { id: 'po', role: 'Product Owner', routeId: 'po' }, { id: 'dev', role: 'Lead Developer', routeId: 'dev' },
    { id: 'marketing', role: 'Marketing Manager', routeId: 'marketing' },
  ] }));
  run('team-configure', '--input', configurationFile, '--json');
  delete question.advisers; delete question.proposalAuthorId;
  writeFileSync(questionPath, JSON.stringify(question));
  const configured = JSON.parse(run('meeting-prepare', '--project', liveProject.id, '--input', questionPath, '--team', 'decision', '--json'));
  assert.equal(configured.team.revision, 1); assert.equal(configured.advisers[1].modelId, 'b1');
  const framing = JSON.parse(run('meeting-framing', '--project', liveProject.id, '--id', configured.id, '--json'));
  assert.equal(framing.status, 'prepared'); assert.deepEqual(framing.versions, []);
  assert.equal(framing.checkpoint.status, 'not-started');
  const token = 'installed-SENTINEL-private-7e4c';
  env.BOARDROOM_SESSION_KEY = token;
  const session = invoke('credential-check', '--route', 'po', '--session', '--json');
  delete env.BOARDROOM_SESSION_KEY;
  assert.equal(session.status, 0, session.stderr); assert.equal(JSON.parse(session.stdout).source, 'session');
  assert.ok(!session.stdout.includes(token)); assert.ok(!session.stderr.includes(token));
  const plain = invokeInput(token, 'credential-set', '--route', 'po');
  assert.equal(plain.status, 1); assert.match(plain.stderr, /explicit --secret-stdin/);
  const vault = JSON.parse(invoke('credential-check', '--route', 'po', '--json').stdout);
  let hostVault = 'unavailable';
  if (vault.status !== 'unavailable') {
    try {
      const stored = invokeInput(token + '\n', 'credential-set', '--route', 'po', '--secret-stdin', '--json');
      assert.equal(stored.status, 0, stored.stderr);
      assert.ok(!stored.stdout.includes(token)); assert.ok(!stored.stderr.includes(token));
      assert.equal(JSON.parse(run('credential-check', '--route', 'po', '--json')).status, 'available');
      run('credential-delete', '--route', 'po', '--json');
      assert.equal(JSON.parse(invoke('credential-check', '--route', 'po', '--json').stdout).status, 'missing');
      hostVault = 'verified';
    } finally { invoke('credential-delete', '--route', 'po'); }
  } else assert.notEqual(process.env.BOARDROOM_REQUIRE_HOST_VAULT, 'true', 'Required installed host vault is unavailable.');
  assert.ok(!run('configuration', '--json').includes(token));
  // Keep the injected token present while exercising the graph import path.
  env.BOARDROOM_SESSION_KEY = token;
  env.LANGSMITH_TRACING = 'true'; env.LANGCHAIN_TRACING = 'true'; env.LANGCHAIN_TRACING_V2 = 'true';
  const protectedDoctor = invoke('doctor', '--json');
  delete env.BOARDROOM_SESSION_KEY;
  assert.equal(protectedDoctor.status, 0, protectedDoctor.stderr);
  assert.ok(!protectedDoctor.stdout.includes(token)); assert.ok(!protectedDoctor.stderr.includes(token));
  assert.equal(JSON.parse(protectedDoctor.stdout).checkpointReopen, 'verified');
  const configTrace = JSON.parse(run('trace', '--project', liveProject.id, '--output', join(root, 'config-traces'), '--json'));
  assert.ok(!readFileSync(configTrace.path, 'utf8').includes(token));
  // Checkpoint/domain files are external artifacts at the installed product seam.
  const { readdirSync } = await import('node:fs');
  const dataHome = process.platform === 'win32' ? join(root, 'local', 'Boardroom')
    : process.platform === 'darwin' ? macDataDirectory : join(root, 'xdg', 'boardroom');
  for (const name of readdirSync(dataHome).filter(name => /sqlite/.test(name))) {
    assert.ok(!readFileSync(join(dataHome, name)).includes(Buffer.from(token)));
  }
  assert.ok(!readFileSync(first.plan, 'utf8').includes(token)); assert.ok(!readFileSync(first.memo, 'utf8').includes(token));
  writeFileSync(join(evidence, 'protected-configuration.json'), JSON.stringify({
    schemaVersion: 1, platform: process.platform, hostVault, sessionInjection: 'verified',
    shareableConfiguration: 'verified', frozenTeam: 'verified', sentinelAbsent: true, noModelCalls: true,
  }, null, 2) + '\n');
  assert.match(run('demo', '--next'), /Marketing Manager/);
  assert.match(run('demo'), /INSUFFICIENT_EVIDENCE/);
  const pdf = join(root, 'launch.pdf');
  copyFileSync(join(candidate, 'assets', 'validation', 'launch.pdf'), pdf);
  const savedPdf = JSON.parse(run('document', '--source', pdf, '--allow-source', '--json'));
  writeFileSync(pdf, 'Changed original.');
  const citation = JSON.parse(run('evidence', '--id', savedPdf.evidence.id, '--page', '2', '--json'));
  assert.equal(citation.text, 'Launch scope: one integration.');
  assert.equal(citation.originalChanged, true);
  const savedDocx = JSON.parse(run('document', '--source', join(candidate, 'assets', 'validation', 'launch.docx'), '--allow-source', '--json'));
  assert.match(run('evidence', '--id', savedDocx.evidence.id, '--block', '2'), /Budget: €500/);
  const malformed = invoke('document', '--source', pdf, '--allow-source', '--json');
  assert.equal(malformed.status, 2);
  assert.equal(JSON.parse(malformed.stdout).extraction.status, 'failed');
  const doctor = JSON.parse(run('doctor', '--json'));
  assert.equal(doctor.fts5, 'verified');
  assert.equal(doctor.checkpointReopen, 'verified');
  assert.equal(doctor.optionalProbes.embeddings.status, 'blocked');
  assert.equal(doctor.optionalProbes.providerStreaming.status, 'blocked');
  const trace = JSON.parse(run('trace', '--output', join(root, 'traces'), '--json'));
  assert.ok(!readFileSync(trace.path, 'utf8').includes(root));
  copyFileSync(trace.path, join(evidence, 'filtered-trace.json'));
  const isolation = JSON.parse(run('isolation-check', '--output', join(root, 'isolation'), '--json'));
  copyFileSync(isolation.path, join(evidence, 'isolation.json'));
  const runtime = join(candidate, 'runtime', process.platform === 'win32' ? 'node.exe' : 'node');
  const cli = join(candidate, 'dist', 'cli.js');
  const terminalStarted = performance.now();
  const terminal = openTerminal(t, [cli, 'terminal-check'], { executable: runtime, cwd: root, env });
  // Qualify cold startup separately; all subsequent interaction checks retain the 10-second bound.
  await terminal.waitFor(/Stream tick: [1-9]/, 30000);
  const terminalStartupMs = Math.round(performance.now() - terminalStarted);
  t.diagnostic(`Installed PTY first-frame readiness: ${terminalStartupMs} ms`);
  terminal.write('\x1b[200~Capacity:\r\ncafé 😀\x1b[201~');
  await terminal.waitFor(/Draft: Capacity:\ncafé 😀/);
  terminal.resize(44, 18);
  await terminal.waitFor(/Window: 44x18/);
  terminal.write('\r'); terminal.resize(100, 30);
  await terminal.waitFor(/Accepted: "Capacity:\\ncafé 😀"/);
  terminal.write('\x1b');
  assert.equal((await terminal.finish()).exitCode, 130);
  assert.deepEqual(JSON.parse(run('history', '--json')).operations, history.operations);
  const display = openTerminal(t, [cli, 'demo', '--data-dir', join(root, 'capture data')], { executable: runtime, cwd: root, env, cols: 120, rows: 44 });
  assert.equal((await display.finish()).exitCode, 0);
  assert.match(display.snapshot(), /INSUFFICIENT_EVIDENCE/);
  // Strip only the Windows terminal-title OSC metadata, which may contain a local runtime path.
  const recording = display.recording().map(([time, kind, bytes]) => [time, kind, bytes.replace(/\x1b\]0;[^\x07]*(?:\x07|\x1b\\)/g, '')]);
  writeFileSync(join(evidence, 'recorded-example.cast'), [JSON.stringify({ version: 2, width: 120, height: 44, title: 'BOARDROOM — actual packaged CLI; fictional recorded example' }), ...recording.map(event => JSON.stringify(event))].join('\n') + '\n');
  writeFileSync(join(evidence, 'terminal-screen.txt'), display.snapshot());
  assert.equal(hash(original), originalHash);
  const dataPath = process.platform === 'win32' ? join(env.LOCALAPPDATA, 'Boardroom')
    : process.platform === 'darwin' ? macDataDirectory : join(env.XDG_DATA_HOME, 'boardroom');
  assert.ok(existsSync(join(dataPath, 'domain.sqlite')));
  assert.ok(!dataPath.startsWith(candidate));
  writeFileSync(join(evidence, 'installation.json'), JSON.stringify({ schemaVersion: 1, mode, platform: process.platform,
    architecture: process.arch, runtime: process.version, hostNodeVisible: false, dataOutsideCandidate: true,
    sourceUnchanged: true, restart: 'new application processes', terminalStartupMs, commandLog, doctor, removalProof }, null, 2) + '\n');
  await qualifyLiveDecision(t, { candidate, root, evidence, env, run });
});
