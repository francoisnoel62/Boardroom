import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Boardroom } from '../src/application.ts';
import { liveSetup } from './support/live.ts';

test('a sourced objection revises the PO proposal and repeated objections end without unanimity', async t => {
  const { app, store, project, meeting, root, sent } = await liveSetup(t);
  await app.analyseMeeting(project.id, meeting.id, store);
  const result = await app.debateMeeting(project.id, meeting.id, store);
  assert.equal(result.status, 'complete'); assert.equal(result.stopReason, 'no-new-objections');
  assert.deepEqual(result.proposals.map((p: any) => p.version), [1, 2]);
  assert.ok(result.proposals.every((p: any) => p.authorId === 'po'));
  assert.equal(result.proposals[0].body.items[0].text, 'Build five integrations');
  assert.equal(result.proposals[1].body.items[0].text, 'Build one integration');
  const disposition = result.proposals[1].dispositions[0];
  assert.equal(disposition.objectionId, 'capacity'); assert.equal(disposition.adviserId, 'dev');
  assert.deepEqual(disposition.changedItemIds, ['integrations']);
  assert.deepEqual(result.proposals[1].body.items[0].references, meeting.context.passages);
  assert.equal(result.confrontations.length, 4); assert.equal(result.proposals[1].changes[0].itemId, 'integrations');
  assert.equal(sent.filter(s => s.phase === 'revision').length, 1);
  for (const payload of sent.filter(s => s.phase === 'confrontation')) assert.equal(payload.request.analyses.length, 3);
  assert.equal(app.callLedger(project.id, meeting.id).remainingConclusion, 2744084);
  const reopened = new Boardroom(root);
  try {
    assert.deepEqual((await reopened.inspectDebate(project.id, meeting.id)).proposals, result.proposals);
    await assert.rejects(reopened.debateMeeting(project.id, meeting.id, store), /already attempted/);
  } finally { reopened.close(); }
});

test('an accepted proposal-item objection must change its target, not an unrelated item', async t => {
  const { app, store, project, meeting } = await liveSetup(t, (phase, request, normal) => {
    if (phase === 'proposal') return { ...normal, items: [...normal.items, { id: 'billing', text: 'Manual billing', references: meeting.context.passages }] };
    if (phase === 'revision') return { proposal: { ...normal.proposal, items: [request.proposal.items[0], { id: 'billing', text: 'Automated billing', references: meeting.context.passages }] },
      dispositions: [{ ...normal.dispositions[0], changedItemIds: ['billing'] }] };
    return normal;
  });
  await app.analyseMeeting(project.id, meeting.id, store);
  const result = await app.debateMeeting(project.id, meeting.id, store);
  assert.equal(result.status, 'partial'); assert.equal(result.proposals.length, 1);
  assert.equal(result.confrontations.length, 2);
  assert.equal(app.callLedger(project.id, meeting.id).calls.filter(c => c.reason === 'invalid-output').length, 2);
});

test('early conclusion preserves the PO proposal and stops confrontation/revision while retaining approval', async t => {
  let requested = false;
  const { app, store, project, meeting, sent } = await liveSetup(t, (phase, _request, normal) => {
    if (phase === 'confrontation' && !requested) { requested = true; app.requestConclusion(project.id, meeting.id); }
    return normal;
  });
  await app.analyseMeeting(project.id, meeting.id, store);
  const result = await app.debateMeeting(project.id, meeting.id, store);
  assert.equal(result.status, 'partial'); assert.equal(result.stopReason, 'conclusion-requested');
  assert.equal(result.proposals.length, 1); assert.equal(result.current?.version, 1);
  assert.equal((await app.inspectMeeting(project.id, meeting.id)).status, 'approved');
  assert.equal(app.callLedger(project.id, meeting.id).execution.status, 'concluding');
  assert.equal(sent.filter(s => s.phase === 'revision').length, 0);
});

test('novel objections end at the internal bound and rejected amendments retain their reasons', async t => {
  const { app, store, project, meeting } = await liveSetup(t, (phase, request, normal) => {
    if (phase === 'confrontation' && request.model.startsWith('claude')) return { objections: normal.objections.map((o: any) => ({ ...o, justification: `${o.justification} Round ${request.round}` })) };
    if (phase === 'revision' && request.proposal.items[0].text === 'Build one integration') return {
      proposal: { ...normal.proposal, items: normal.proposal.items.map((i: any) => ({ ...i, text: 'Run a manual pilot' })) },
      dispositions: [{ ...normal.dispositions[0], reason: 'Investigate demand before engineering.' }],
    };
    return normal;
  });
  await app.analyseMeeting(project.id, meeting.id, store);
  const result = await app.debateMeeting(project.id, meeting.id, store);
  assert.equal(result.stopReason, 'round-bound'); assert.equal(result.proposals.length, 3);
  assert.equal(result.confrontations.length, 4);
  assert.equal(result.proposals[2].body.items[0].text, 'Run a manual pilot');
});

test('a rejected amendment keeps its objection and reason without inventing a change', async t => {
  const { app, store, project, meeting } = await liveSetup(t, (phase, request, normal) => phase === 'revision' ? {
    proposal: request.proposal, dispositions: [{ ...normal.dispositions[0], action: 'rejected', reason: 'Human constraint explicitly requires five integrations.', changedItemIds: [] }],
  } : normal);
  await app.analyseMeeting(project.id, meeting.id, store);
  const result = await app.debateMeeting(project.id, meeting.id, store);
  assert.equal(result.status, 'complete'); assert.equal(result.proposals[1].changes.length, 0);
  assert.equal(result.proposals[1].dispositions[0].action, 'rejected');
  assert.match(result.proposals[1].dispositions[0].reason, /requires five/);
  assert.equal(result.confrontations.find(c => c.adviserId === 'dev')?.body?.objections[0].id, 'capacity');
});

test('a revision of an older frame cannot complete after a rapid correction and new approval', async t => {
  const { app, store, project, meeting } = await liveSetup(t, async (phase, _request, normal) => {
    if (phase === 'proposal') {
      const frame = (await app.inspectMeeting(project.id, meeting.id)).versions[0].body;
      await app.correctFraming(project.id, meeting.id, 1, { ...frame, summary: 'Different approved direction' });
      await app.approveFraming(project.id, meeting.id, 2);
    }
    return normal;
  });
  await app.analyseMeeting(project.id, meeting.id, store);
  const result = await app.debateMeeting(project.id, meeting.id, store);
  assert.equal(result.proposals.length, 0);
  const receipt = app.callLedger(project.id, meeting.id).calls.find(c => c.phase === 'revision')!;
  assert.equal(receipt.reason, 'cancelled'); assert.ok(receipt.knownCostMicros! > 0);
});
