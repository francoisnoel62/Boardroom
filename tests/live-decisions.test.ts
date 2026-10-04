import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Boardroom } from '../src/application.ts';
import { liveSetup } from './support/live.ts';

test('three final views bind one proposal and a contrary human decision survives exclusive exports and reopen', async t => {
  const { app, store, project, meeting, root } = await liveSetup(t, (phase, _request, normal) => phase === 'views' ? { ...normal, verdict: 'REJECTED' } : normal);
  await app.analyseMeeting(project.id, meeting.id, store); await app.debateMeeting(project.id, meeting.id, store);
  const views = await app.collectFinalViews(project.id, meeting.id, 2, store);
  assert.equal(views.status, 'complete'); assert.equal(views.views.length, 3);
  assert.equal(new Set(views.views.map((v: any) => v.body.proposalSha256)).size, 1);
  assert.ok(views.views.every((v: any) => v.body.proposalVersion === 2 && v.body.verdict === 'REJECTED'));
  const decision = await app.recordHumanDecision(project.id, meeting.id, { proposalVersion: 2, action: 'accepted', rationale: 'I accept a monitored pilot despite the three rejections.' });
  assert.equal(decision.action, 'accepted'); assert.equal(decision.viewIds.length, 3);
  const first = await app.exportLiveMeeting(project.id, meeting.id, join(root, 'exports'), { json: true }, store);
  const second = await app.exportLiveMeeting(project.id, meeting.id, join(root, 'exports'), {}, store);
  assert.notEqual(first.directory, second.directory);
  assert.match(readFileSync(first.plan, 'utf8'), /Build one integration/);
  const memo = readFileSync(first.memo, 'utf8');
  assert.match(memo, /REJECTED/); assert.match(memo, /accepted/); assert.match(memo, /Staffing supports/);
  assert.match(memo, /two engineers/i); assert.equal(memo.includes('DUMMY_PRIVATE_KEY'), false);
  const output = JSON.parse(readFileSync(first.json!, 'utf8'));
  assert.equal(output.reviewBeforeSharing, true); assert.equal(output.decision.action, 'accepted');
  assert.equal(JSON.stringify(output).includes('credentialRef'), false);
  assert.equal(app.history(project.id).operations.filter(o => o.type === 'live.export').length, 2);
  const reopened = new Boardroom(root);
  try { assert.equal((await reopened.inspectLiveDecision(project.id, meeting.id)).decision?.id, decision.id); }
  finally { reopened.close(); }
});

test('missing views, insufficient evidence and stale views stay distinct after a human modification', async t => {
  const { app, store, project, meeting } = await liveSetup(t, (phase, request, normal) => phase === 'views' ? request.model.startsWith('claude')
    ? { ...normal, confidence: 101 } : { ...normal, verdict: 'INSUFFICIENT_EVIDENCE' } : normal);
  await app.analyseMeeting(project.id, meeting.id, store); await app.debateMeeting(project.id, meeting.id, store);
  const result = await app.collectFinalViews(project.id, meeting.id, 2, store);
  assert.equal(result.status, 'partial'); assert.equal(result.views.length, 2);
  assert.equal(result.advisers.find(a => a.adviserId === 'dev')?.status, 'missing');
  assert.equal(result.advisers.find(a => a.adviserId === 'po')?.view?.body.verdict, 'INSUFFICIENT_EVIDENCE');
  assert.equal(app.callLedger(project.id, meeting.id).calls.filter(c => c.phase === 'conclusion' && c.reason === 'invalid-output').length, 2);
  const proposal = (await app.inspectDebate(project.id, meeting.id)).current!.body;
  const modified = await app.recordHumanDecision(project.id, meeting.id, { proposalVersion: 2, action: 'modified', rationale: 'Manual pilot first',
    modifiedProposal: { ...proposal, title: 'Manual pilot' } });
  assert.equal(modified.reviewedVersion, 2); assert.equal(modified.resultingVersion, 3);
  const changed = await app.inspectFinalViews(project.id, meeting.id);
  assert.deepEqual(changed.advisers.map(a => a.status), ['stale', 'missing', 'stale']); assert.equal(changed.views.length, 2);
  await assert.rejects(app.collectFinalViews(project.id, meeting.id, 2, store), /current approved proposal/);
  for (const action of ['accepted', 'rejected', 'deferred', 'investigation-requested'] as const) {
    assert.equal((await app.recordHumanDecision(project.id, meeting.id, { proposalVersion: 3, action, rationale: 'Explicit human choice' })).action, action);
  }
});

test('partial exports before any proposal keep known source secrets out and persist failure without replay', async t => {
  const { app, store, project, meeting, root } = await liveSetup(t);
  const original = readFileSync(join(root, 'source.md'));
  const source = join(root, 'private.md'); writeFileSync(source, 'Credential accidentally in source: DUMMY_PRIVATE_KEY and sk-test_12345678901234567890');
  const evidence = app.captureSource(project.id, source, { authorized: true });
  const prepared = app.prepareTeamMeeting({ projectId: project.id, teamId: 'team', question: 'Partial?', durationTargetSeconds: 600,
    costCeiling: { amount: 0, currency: 'USD' }, passages: [{ evidenceId: evidence.id, firstLine: 1, lastLine: 1 }] });
  const result = await app.exportLiveMeeting(project.id, prepared.id, join(root, 'out'), { json: true }, store);
  for (const path of [result.plan, result.memo, result.json!]) {
    const text = readFileSync(path, 'utf8'); assert.equal(text.includes('DUMMY_PRIVATE_KEY'), false); assert.equal(text.includes('sk-test_'), false);
  }
  assert.match(readFileSync(result.plan, 'utf8'), /No final plan has been established/);
  assert.match(readFileSync(result.memo, 'utf8'), /missing/); assert.deepEqual(readFileSync(join(root, 'source.md')), original);
  const failedRoot = join(root, 'file'); writeFileSync(failedRoot, 'Preserve me');
  const intent = await app.prepareLiveExport(project.id, prepared.id, failedRoot, {}, store);
  assert.throws(() => intent.execute(), /failed/); assert.throws(() => intent.execute(), /already attempted/);
  assert.equal(app.history(project.id).operations.find(o => o.id === intent.operation.id)?.status, 'failed');
  assert.equal(readFileSync(failedRoot, 'utf8'), 'Preserve me');
});

test('final views cannot freeze a proposal while ordinary debate can still revise it', async t => {
  let entered!: () => void, release!: () => void, first = true;
  const ready = new Promise<void>(r => { entered = r; }), blocked = new Promise<void>(r => { release = r; });
  const { app, store, project, meeting } = await liveSetup(t, async (phase, _request, normal) => {
    if (phase === 'confrontation' && first) { first = false; entered(); await blocked; }
    return normal;
  });
  await app.analyseMeeting(project.id, meeting.id, store);
  const debate = app.debateMeeting(project.id, meeting.id, store); await ready;
  try { await assert.rejects(app.collectFinalViews(project.id, meeting.id, 1, store), /finish debate|conclusion/i); }
  finally { release(); await debate; }
  assert.equal(app.callLedger(project.id, meeting.id).calls.filter(c => c.phase === 'conclusion').length, 0);
});

test('stopping after completed final views preserves their currency on the unchanged proposal', async t => {
  const { app, store, project, meeting } = await liveSetup(t);
  await app.analyseMeeting(project.id, meeting.id, store); await app.debateMeeting(project.id, meeting.id, store);
  await app.collectFinalViews(project.id, meeting.id, 2, store); app.stopExecution(project.id, meeting.id);
  const inspected = await app.inspectFinalViews(project.id, meeting.id);
  assert.deepEqual(inspected.advisers.map(a => a.status), ['current', 'current', 'current']);
  await app.recordHumanDecision(project.id, meeting.id, { proposalVersion: 2, action: 'rejected', rationale: 'Explicit choice after stopping.' });
});
