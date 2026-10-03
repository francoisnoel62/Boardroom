import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { Boardroom } from '../src/application.ts';

function setup(t: TestContext, monotonicNow?: () => number) {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom call control '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(root, monotonicNow ? { monotonicNow } : {});
  const date = new Date().toISOString().slice(0, 10);
  for (const [id, providerId] of [['po', 'a'], ['dev', 'b'], ['marketing', 'a']]) app.configureRoute({
    id, providerId, modelId: id, capabilities: { streaming: true, structuredOutput: 'json', tools: false,
      cancellation: 'best-effort', usage: 'tokens' }, limitations: ['Deterministic external boundary.'],
    pricing: { asOf: date, validUntil: '2099-01-01', source: 'https://example.test/rates', currency: 'USD',
      inputMicrosPerMillion: 1000000, outputMicrosPerMillion: 2000000, billing: 'bounded-text-only' },
  });
  app.configureTeam({ id: 'team', proposalAuthorId: 'po', advisers: [
    { id: 'po', role: 'Product Owner', routeId: 'po' }, { id: 'dev', role: 'Lead Developer', routeId: 'dev' },
    { id: 'marketing', role: 'Marketing Manager', routeId: 'marketing' },
  ] });
  const project = app.createProject({ name: 'Pilot', language: 'en' });
  const source = join(root, 'source.md'); writeFileSync(source, 'Two engineers.');
  const evidence = app.captureSource(project.id, source, { authorized: true });
  const meeting = app.prepareTeamMeeting({ projectId: project.id, teamId: 'team', question: 'First?',
    durationTargetSeconds: 10, costCeiling: { amount: 0.001, currency: 'USD' },
    passages: [{ evidenceId: evidence.id, firstLine: 1, lastLine: 1 }] });
  return { app, project, meeting, root };
}

const limits = { maxInputTokens: 100, maxOutputTokens: 100, maxDurationMs: 1000 };
const reserves = { revisionMicros: 200, conclusionMicros: 200, revisionMs: 1000, conclusionMs: 1000 };

test('work cannot consume a protected pool and CLI receipts survive independent processes', t => {
  const { app, project, meeting, root } = setup(t);
  const inputFile = join(root, 'reserves.json'); writeFileSync(inputFile, JSON.stringify(reserves));
  const cli = (...args: string[]) => {
    const result = spawnSync(process.execPath, ['src/cli.ts', '--data-dir', root, '--json', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
  };
  try {
    cli('execution-configure', '--project', project.id, '--id', meeting.id, '--input', inputFile);
    assert.throws(() => app.reserveCall(project.id, meeting.id, { adviserId: 'po', phase: 'framing',
      contextVersion: 1, subjectVersion: 1, pool: 'conclusion', limits }));
    app.reserveCall(project.id, meeting.id, { adviserId: 'po', phase: 'framing', contextVersion: 1,
      subjectVersion: 1, pool: 'work', limits });
    assert.equal(cli('calls', '--project', project.id, '--id', meeting.id).committedMicros, 300);
    cli('execution-stop', '--project', project.id, '--id', meeting.id);
    const ledger = cli('calls', '--project', project.id, '--id', meeting.id);
    assert.equal(ledger.calls[0].reason, 'not-started'); assert.equal(ledger.knownCostMicros, 0);
    assert.equal(ledger.execution.status, 'stopped');
  } finally { app.close(); }
});

test('call intentions reserve money atomically and preserve revision/conclusion funds after reopen', t => {
  const { app, project, meeting, root } = setup(t);
  try {
    app.configureExecution(project.id, meeting.id, reserves);
    const intent = app.reserveCall(project.id, meeting.id, { adviserId: 'po', phase: 'framing',
      contextVersion: 1, subjectVersion: 1, pool: 'work', limits });
    assert.equal(intent.receipt.reservedMicros, 300);
    app.reserveCall(project.id, meeting.id, { adviserId: 'dev', phase: 'preflight',
      contextVersion: 1, subjectVersion: 1, pool: 'work', limits });
    assert.throws(() => app.reserveCall(project.id, meeting.id, { adviserId: 'marketing', phase: 'preflight',
      contextVersion: 1, subjectVersion: 1, pool: 'work', limits }), /budget/i);
    const ledger = app.callLedger(project.id, meeting.id);
    assert.equal(ledger.committedMicros, 600); assert.equal(ledger.knownCostMicros, 0);
    assert.equal(ledger.heldReserveMicros, 400); assert.equal(ledger.calls.length, 2);
    const reopened = new Boardroom(root);
    try { assert.deepEqual(reopened.callLedger(project.id, meeting.id), ledger); }
    finally { reopened.close(); }
  } finally { app.close(); }
});

test('a real graph executes one durable handle, keeps unknown usage reserved and bounds known usage', async t => {
  const { app, project, meeting } = setup(t);
  try {
    app.configureExecution(project.id, meeting.id, reserves);
    const handle = app.reserveCall(project.id, meeting.id, { adviserId: 'po', phase: 'framing',
      contextVersion: 1, subjectVersion: 1, pool: 'work', limits });
    const { Annotation, START, END, StateGraph } = await import('@langchain/langgraph');
    const State = Annotation.Root({ finished: Annotation<boolean>() });
    const graph = new StateGraph(State).addNode('call', async () => {
      const result = await handle.execute({ text: 'Question and selected context' }, async (_request, signal, emit) => {
        assert.equal(signal.aborted, false); emit('provisional');
        return { text: '{"question":"First?"}', usage: { inputTokens: 20, outputTokens: 10 } };
      });
      assert.equal(result.receipt.status, 'completed'); assert.equal(result.receipt.knownCostMicros, 40);
      return { finished: true };
    }).addEdge(START, 'call').addEdge('call', END).compile();
    assert.equal((await graph.invoke({ finished: false })).finished, true);
    await assert.rejects(handle.execute({ text: 'Again' }, async () => ({ text: '{}' })), /already attempted/);
    const next = app.reserveCall(project.id, meeting.id, { adviserId: 'dev', phase: 'preflight',
      contextVersion: 1, subjectVersion: 1, pool: 'work', limits });
    const unknown = await next.execute({ text: 'Question' }, async () => ({ text: '{}' }));
    assert.equal(unknown.receipt.knownCostMicros, undefined);
    const ledger = app.callLedger(project.id, meeting.id);
    assert.equal(ledger.knownCostMicros, 40); assert.equal(ledger.committedMicros, 300);
    assert.equal(ledger.calls[0].streamedBytes, 11);
  } finally { app.close(); }
});

test('stop from another service aborts in-flight work, preserves uncertain cost and refuses pending/new work', async t => {
  const { app, project, meeting, root } = setup(t);
  const other = new Boardroom(root);
  try {
    app.configureExecution(project.id, meeting.id, reserves);
    const input = { adviserId: 'po', phase: 'framing' as const, contextVersion: 1 as const,
      subjectVersion: 1, pool: 'work' as const, limits };
    const handle = app.reserveCall(project.id, meeting.id, input);
    const pending = app.reserveCall(project.id, meeting.id, { ...input, adviserId: 'dev' });
    let aborted = false, resolveStarted!: () => void;
    const started = new Promise<void>(resolve => { resolveStarted = resolve; });
    const running = handle.execute({ text: 'Question' }, async (_request, signal, emit) => {
      emit('partial'); resolveStarted(); signal.addEventListener('abort', () => { aborted = true; });
      return new Promise(() => {}); // Remote cancellation is not guaranteed to settle.
    });
    await started; other.stopExecution(project.id, meeting.id);
    const result = await running;
    assert.equal(aborted, true); assert.equal(result.receipt.status, 'uncertain');
    assert.equal(result.receipt.reason, 'cancelled'); assert.equal(result.text, undefined);
    assert.equal(app.callLedger(project.id, meeting.id).committedMicros, 300);
    await assert.rejects(pending.execute({ text: 'Question' }, async () => ({ text: '{}' })), /no longer accepts/);
    assert.throws(() => app.reserveCall(project.id, meeting.id, input), /no longer accepts/);
    assert.equal(app.callLedger(project.id, meeting.id).calls[1].reason, 'not-started');
  } finally { other.close(); app.close(); }
});

test('invalid metering cannot release funds or produce an accepted result', async t => {
  const { app, project, meeting } = setup(t);
  try {
    app.configureExecution(project.id, meeting.id, reserves);
    const handle = app.reserveCall(project.id, meeting.id, { adviserId: 'po', phase: 'framing',
      contextVersion: 1, subjectVersion: 1, pool: 'work', limits });
    const result = await handle.execute({ text: 'Question' }, async () => ({ text: '{"accepted":true}',
      usage: { inputTokens: 1000, outputTokens: 1000 } }));
    assert.equal(result.text, undefined); assert.equal(result.receipt.reason, 'invalid-usage');
    assert.equal(result.receipt.status, 'uncertain'); assert.equal(result.receipt.knownCostMicros, undefined);
    assert.equal(app.callLedger(project.id, meeting.id).execution.status, 'stopped');
  } finally { app.close(); }
});

test('concurrent processes authorize only one affordable call and crash intentions are never replayed', { timeout: 15000 }, async t => {
  const { app, project, meeting, root } = setup(t);
  const children: ReturnType<typeof spawn>[] = [];
  t.after(async () => {
    await Promise.all(children.map(async child => {
      if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; }
    }));
    app.close();
  });
  app.configureExecution(project.id, meeting.id, reserves);
  const input = { adviserId: 'po', phase: 'framing', contextVersion: 1, subjectVersion: 1, pool: 'work',
    limits: { ...limits, maxInputTokens: 200 } };
  const program = `import {Boardroom} from ${JSON.stringify(new URL('../src/application.ts', import.meta.url).href)};
    const app = new Boardroom(process.env.TEST_ROOT); setInterval(() => {}, 1000); process.send('ready');
    process.once('message', () => {try { process.send(app.reserveCall(process.env.TEST_PROJECT,
      process.env.TEST_MEETING, JSON.parse(process.env.TEST_INPUT)).receipt); }
      catch(error) { process.send({error:error.message}); } });`;
  for (let index = 0; index < 4; index++) children.push(spawn(process.execPath, ['--input-type=module', '-e', program], {
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env: { ...process.env, TEST_ROOT: root, TEST_PROJECT: project.id,
      TEST_MEETING: meeting.id, TEST_INPUT: JSON.stringify(input) },
  }));
  const reply = (child: typeof children[number]) => Promise.race([once(child, 'message').then(([value]) => value),
    once(child, 'exit').then(() => { throw new Error('Worker exited.'); })]);
  await Promise.all(children.map(reply)); const pending = children.map(reply);
  for (const child of children) child.send('reserve');
  const results = await Promise.all(pending);
  assert.equal(results.filter(value => value.id).length, 1);
  assert.equal(results.filter(value => /budget/.test(value.error)).length, 3);
  await Promise.all(children.map(async child => {
    if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; }
  }));
  const reopened = new Boardroom(root);
  try {
    const ledger = reopened.callLedger(project.id, meeting.id);
    assert.equal(ledger.calls.length, 1); assert.equal(ledger.calls[0].status, 'reserved');
    assert.equal(ledger.committedMicros, 400); assert.equal(ledger.calls[0].startedMonoMs, undefined);
  } finally { reopened.close(); app.close(); }
});

test('timeout is bounded and early conclusion spends its own reserve without starting more work', async t => {
  const { app, project, meeting } = setup(t);
  try {
    app.configureExecution(project.id, meeting.id, reserves);
    const input = { adviserId: 'po', phase: 'framing' as const, contextVersion: 1 as const,
      subjectVersion: 1, pool: 'work' as const, limits: { ...limits, maxDurationMs: 30 } };
    const timeout = await app.reserveCall(project.id, meeting.id, input).execute({ text: 'Question' }, async () => new Promise(() => {}));
    assert.equal(timeout.receipt.reason, 'timeout'); assert.equal(timeout.receipt.status, 'uncertain');
    app.requestConclusion(project.id, meeting.id);
    assert.throws(() => app.reserveCall(project.id, meeting.id, input), /no longer accepts/);
    const concluded = await app.reserveCall(project.id, meeting.id, { ...input, phase: 'conclusion', pool: 'conclusion',
      limits: { ...limits, maxInputTokens: 50, maxOutputTokens: 50 } }).execute({ text: 'Conclude' }, async () => ({ text: '{}', usage: { inputTokens: 10, outputTokens: 5 } }));
    assert.equal(concluded.receipt.knownCostMicros, 20);
    const ledger = app.callLedger(project.id, meeting.id);
    assert.equal(ledger.committedMicros, 300); assert.equal(ledger.remainingConclusion, 180);
    assert.equal(ledger.remainingRevision, 200);
  } finally { app.close(); }
});

test('active time excludes human waiting and merges overlapping calls on the same monotonic clock', async t => {
  let now = 0;
  const { app, project, meeting } = setup(t, () => now);
  try {
    app.configureExecution(project.id, meeting.id, reserves);
    now = 5000; assert.equal(app.callLedger(project.id, meeting.id).activeMs, 0);
    const input = { adviserId: 'po', phase: 'framing' as const, contextVersion: 1 as const,
      subjectVersion: 1, pool: 'work' as const, limits };
    const first = app.reserveCall(project.id, meeting.id, input);
    const second = app.reserveCall(project.id, meeting.id, { ...input, adviserId: 'dev' });
    let releaseFirst!: () => void, releaseSecond!: () => void;
    const firstResult = first.execute({ text: 'Question' }, async () => {
      await new Promise<void>(resolve => { releaseFirst = resolve; }); return { text: '{}' };
    });
    await delay(0); now = 5050;
    const secondResult = second.execute({ text: 'Question' }, async () => {
      await new Promise<void>(resolve => { releaseSecond = resolve; }); return { text: '{}' };
    });
    await delay(0); now = 5150; releaseFirst(); await firstResult;
    now = 5200; releaseSecond(); await secondResult;
    assert.equal(app.callLedger(project.id, meeting.id).activeMs, 200);
    now = 10000; assert.equal(app.callLedger(project.id, meeting.id).activeMs, 200);
  } finally { app.close(); }
});

test('correction is a fresh charged intention, time exhaustion refuses work and diagnostics contain no payload', async t => {
  const { app, project, meeting } = setup(t);
  try {
    app.configureExecution(project.id, meeting.id, reserves);
    const input = { adviserId: 'po', phase: 'framing' as const, contextVersion: 1 as const,
      subjectVersion: 1, pool: 'work' as const, limits };
    const first = await app.reserveCall(project.id, meeting.id, input).execute({ text: 'PRIVATE_QUESTION' },
      async () => ({ text: '{}', usage: { inputTokens: 10, outputTokens: 10 } }));
    const correction = app.reserveCall(project.id, meeting.id, { ...input, phase: 'framing-correction' });
    assert.notEqual(first.receipt.id, correction.receipt.id);
    await correction.execute({ text: 'PRIVATE_CORRECTION' }, async () => { throw new Error('SECRET_TOKEN upstream body'); });
    assert.equal(app.callLedger(project.id, meeting.id).committedMicros, 300);
    assert.throws(() => app.reserveCall(project.id, meeting.id, { ...input,
      limits: { maxInputTokens: 1, maxOutputTokens: 1, maxDurationMs: 8001 } }), /active time/);
    const metadata = JSON.stringify({ ledger: app.callLedger(project.id, meeting.id), history: app.history(project.id) });
    for (const sentinel of ['PRIVATE_QUESTION', 'PRIVATE_CORRECTION', 'SECRET_TOKEN']) assert.equal(metadata.includes(sentinel), false);
  } finally { app.close(); }
});

test('a response after the monotonic deadline is refused even if the timer callback has not run', async t => {
  let now = 0;
  const { app, project, meeting } = setup(t, () => now);
  try {
    app.configureExecution(project.id, meeting.id, reserves);
    const result = await app.reserveCall(project.id, meeting.id, { adviserId: 'po', phase: 'framing', contextVersion: 1,
      subjectVersion: 1, pool: 'work', limits }).execute({ text: 'Question' }, async () => {
      now = 1001; return { text: '{"accepted":true}', usage: { inputTokens: 10, outputTokens: 10 } };
    });
    assert.equal(result.text, undefined); assert.equal(result.receipt.reason, 'timeout');
    assert.equal(result.receipt.knownCostMicros, 30); assert.equal(result.receipt.elapsedMs, 1001);
  } finally { app.close(); }
});
