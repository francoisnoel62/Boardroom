import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test, type TestContext } from 'node:test';
import { providerSetup } from './support/providers.ts';
import { liveSetup } from './support/live.ts';

// Expected figures are derived by hand from the dated catalog rates and the phase bounds, not recomputed by the code
// under test. Each call reserves the whole context window plus its output cap:
//   final view (2,048 output): gpt-4.1-mini 422,308 + claude-haiku-4.5 210,240 + gpt-4.1 2,111,536 = 2,744,084 micro-USD
//   revision (4,096 output, proposal author gpt-4.1-mini): 425,584, held twice = 851,168 (a proposal and one revision)
//   analysis batch (4,096 output): 425,584 + 220,480 + 2,127,920 = 2,773,984 (the largest concurrent batch of work)
const conclusion = 2_744_084, revision = 851_168, analysisBatch = 2_773_984;
const floor = revision + conclusion + analysisBatch; // 6,369,236 micro-USD: at least 6.37 USD
const noFetch = async () => { throw new Error('No provider request is expected here.'); };

function another(t: TestContext, ceiling: number, seconds = 600, fetch: typeof globalThis.fetch = noFetch) {
  const fixture = providerSetup(t, fetch);
  const meeting = fixture.app.prepareTeamMeeting({ projectId: fixture.project.id, teamId: 'team', question: 'Funded?', durationTargetSeconds: seconds,
    costCeiling: { amount: ceiling, currency: 'USD' }, passages: fixture.meeting.context.passages.map(({ evidenceId, firstLine, lastLine }) => ({ evidenceId, firstLine, lastLine })) });
  return { ...fixture, meeting };
}

test('protected reserves are computed from the frozen team and its call bounds, in money and in time', t => {
  const { app, project, meeting } = another(t, 10);
  const execution = app.configureExecution(project.id, meeting.id);
  assert.deepEqual({ revisionMicros: execution.revisionMicros, conclusionMicros: execution.conclusionMicros, revisionMs: execution.revisionMs, conclusionMs: execution.conclusionMs },
    { revisionMicros: revision, conclusionMicros: conclusion, revisionMs: 120_000, conclusionMs: 90_000 });
});

test('a ceiling or duration that cannot protect the reserves and admit the largest batch is refused with the figures', t => {
  const poor = another(t, 6.36);
  assert.throws(() => poor.app.configureExecution(poor.project.id, poor.meeting.id), /at least 6\.37 USD/);
  const exact = another(t, 6.37);
  assert.doesNotThrow(() => exact.app.configureExecution(exact.project.id, exact.meeting.id));
  const brief = another(t, 10, 389);
  assert.throws(() => brief.app.configureExecution(brief.project.id, brief.meeting.id), /at least 390 s/);
  const enough = another(t, 10, 390);
  assert.doesNotThrow(() => enough.app.configureExecution(enough.project.id, enough.meeting.id));
  assert.equal(floor, 6_369_236);
});

test('explicit reserves below the funded minimum stop every live phase before any request or reservation', async t => {
  let requests = 0;
  const { app, store, project, meeting } = another(t, 10, undefined, async () => { requests++; throw new Error('No provider request is expected here.'); });
  app.configureExecution(project.id, meeting.id, { revisionMicros: 1_000_000, conclusionMicros: 1_000_000, revisionMs: 10_000, conclusionMs: 10_000 });
  await app.setRouteCredential('po', 'DUMMY_KEY', store);
  const started = await app.startMeeting(project.id, meeting.id, store);
  assert.equal(started.failure, 'execution-refused');
  assert.equal(requests, 0); assert.equal(app.callLedger(project.id, meeting.id).calls.length, 0);
  assert.throws(() => app.reserveCall(project.id, meeting.id, { adviserId: 'po', phase: 'analysis', contextVersion: 1, subjectVersion: 1, pool: 'work',
    limits: { maxInputTokens: 1_047_576, maxOutputTokens: 4096, maxDurationMs: 60_000 } }), /below the funded minimum/);
});

test('work calls with unknown usage can never consume the funds the final views need', async t => {
  const { app, project, meeting } = another(t, 7);
  app.configureExecution(project.id, meeting.id);
  const work = { adviserId: 'marketing', phase: 'preflight' as const, contextVersion: 1 as const, subjectVersion: 1, pool: 'work' as const,
    limits: { maxInputTokens: 1_047_576, maxOutputTokens: 4096, maxDurationMs: 60_000 } };
  let admitted = 0;
  for (;;) {
    let handle: ReturnType<typeof app.reserveCall>;
    try { handle = app.reserveCall(project.id, meeting.id, work); } catch (error) { assert.match(String(error), /insufficient budget after protected reserves/); break; }
    admitted++;
    const outcome = await handle.execute({ text: 'x' }, async () => { throw new Error('connection lost'); });
    assert.equal(outcome.receipt.status, 'uncertain'); assert.equal(outcome.receipt.knownCostMicros, undefined);
  }
  assert.ok(admitted >= 1, 'the work pool was actually exercised');
  app.requestConclusion(project.id, meeting.id);
  const final = (adviserId: string, maxInputTokens: number) => app.reserveCall(project.id, meeting.id, { adviserId, phase: 'conclusion', contextVersion: 1,
    subjectVersion: 1, pool: 'conclusion', limits: { maxInputTokens, maxOutputTokens: 2048, maxDurationMs: 30_000 } });
  assert.doesNotThrow(() => { final('po', 1_047_576); final('dev', 200_000); final('marketing', 1_047_576); });
});

test('the CLI computes the reserves when no input file is given', t => {
  const { project, meeting, root } = another(t, 10);
  const run = spawnSync(process.execPath, ['src/cli.ts', '--data-dir', root, '--json', 'execution-configure', '--project', project.id, '--id', meeting.id], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(run.stdout).conclusionMicros, conclusion);
});

test('at the smallest funded ceiling, confrontations that never settle still leave every final view fundable', async t => {
  const { app, store, project, meeting } = await liveSetup(t, (phase, _request, normal) => { if (phase === 'confrontation') throw new Error('connection lost'); return normal; }, 6.37);
  await app.analyseMeeting(project.id, meeting.id, store);
  const debate = await app.debateMeeting(project.id, meeting.id, store);
  assert.equal(debate.status, 'partial'); assert.equal(debate.stopReason, 'call-failed'); assert.equal(debate.proposals.length, 1);
  // The two confrontations (Haiku 220,480 + gpt-4.1 2,127,920) stay committed: their usage is unknown.
  assert.equal(app.callLedger(project.id, meeting.id).committedMicros, 2_348_400);
  app.requestConclusion(project.id, meeting.id);
  const views = await app.collectFinalViews(project.id, meeting.id, 1, store);
  assert.equal(views.status, 'complete'); assert.equal(views.views.length, 3);
  assert.equal(new Set(views.views.map((view: any) => view.body.proposalSha256)).size, 1);
});
