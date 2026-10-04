import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Boardroom } from '../src/application.ts';

const route = (id = 'first', providerId = 'provider-a', modelId = 'model-a') => ({
  id, providerId, modelId,
  capabilities: { streaming: true, structuredOutput: 'json-schema' as const, tools: false,
    cancellation: 'best-effort' as const, usage: 'tokens' as const },
  limitations: ['Declared only; account availability has not been checked.'],
});

const team = { id: 'decision', proposalAuthorId: 'po', advisers: [
  { id: 'po', role: 'Product Owner', routeId: 'first' },
  { id: 'dev', role: 'Lead Developer', routeId: 'second' },
  { id: 'marketing', role: 'Marketing Manager', routeId: 'third' },
] };

test('the selected Plan 02 team freezes route and profile revisions independently of later edits', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom team '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let app = new Boardroom(root);
  try {
    app.configureRoute(route()); app.configureRoute(route('second', 'provider-b', 'model-b'));
    app.configureRoute(route('third', 'provider-a', 'model-c'));
    app.configureTeam(team);
    const project = app.createProject({ name: 'Pilot', language: 'fr' });
    const source = join(root, 'context.md'); writeFileSync(source, 'Two engineers.');
    const evidence = app.captureSource(project.id, source, { authorized: true });
    const input = { projectId: project.id, teamId: 'decision', question: 'What first?',
      durationTargetSeconds: 600, costCeiling: { amount: 0, currency: 'USD' },
      passages: [{ evidenceId: evidence.id, firstLine: 1, lastLine: 1 }] };
    const first = app.prepareTeamMeeting(input);
    assert.equal(first.team?.revision, 1);
    assert.equal(first.advisers[0].modelId, 'model-a');
    assert.equal(first.team?.routes[0].revision, 1);
    app.configureRoute(route('first', 'provider-a', 'model-a-new'));
    app.configureTeam({ ...team, advisers: team.advisers.map(adviser => adviser.id === 'dev'
      ? { ...adviser, role: 'Lead Developer' } : adviser) });
    const second = app.prepareTeamMeeting(input);
    assert.equal(second.team?.revision, 2); assert.equal(second.advisers[0].modelId, 'model-a-new');
    app.close(); app = new Boardroom(root);
    assert.deepEqual(app.getMeeting(project.id, first.id), first);
    assert.equal(app.configuration().teams[0].revision, 2);
    assert.equal(app.history(project.id).events.length, 2);
  } finally { app.close(); }
});

test('declared routes reopen without credentials in the shareable configuration', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom routes '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let app = new Boardroom(root);
  try {
    const saved = app.configureRoute(route());
    assert.equal(saved.verification, 'unverified');
    assert.equal(saved.revision, 1);
    assert.match(saved.credentialRef, /^[a-f0-9-]{36}$/);
    app.close(); app = new Boardroom(root);
    assert.deepEqual(app.getRoute('first'), saved);
    assert.deepEqual(app.configuration(), { schemaVersion: 1, routes: [{ ...route(), revision: 1,
      verification: 'unverified' }], teams: [] });
    assert.ok(!JSON.stringify(app.configuration()).includes(saved.credentialRef));
  } finally { app.close(); }
});

test('incompatible teams and route changes are rejected before preparing a meeting', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom route rejection '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(root);
  try {
    app.configureRoute(route()); app.configureRoute(route('second', 'provider-b', 'model-b'));
    app.configureRoute(route('third', 'provider-a', 'model-c'));
    assert.throws(() => app.configureTeam({ ...team, proposalAuthorId: 'dev' }));
    assert.throws(() => app.configureTeam({ ...team, advisers: team.advisers.slice(0, 2) }));
    assert.throws(() => app.configureRoute({ ...route(), apiKey: 'forbidden' }));
    assert.throws(() => app.configureRoute(route('first', 'different-provider')), /identity/);
    app.configureRoute(route('third', 'provider-a', 'model-a'));
    assert.throws(() => app.configureTeam(team), /distinct model/);
    app.configureRoute(route('third', 'provider-a', 'model-c'));
    app.configureRoute({ ...route('second', 'provider-b', 'model-b'), capabilities: {
      ...route().capabilities, structuredOutput: 'none' } });
    assert.throws(() => app.configureTeam(team), /structured output/);
    app.configureRoute(route('second', 'provider-b', 'model-b')); app.configureTeam(team);
    app.configureRoute({ ...route(), capabilities: { ...route().capabilities, usage: 'none' } });
    assert.throws(() => app.prepareTeamMeeting({ projectId: 'absent', teamId: 'decision', question: 'First?',
      durationTargetSeconds: 1, costCeiling: { amount: 0, currency: 'USD' },
      passages: [{ evidenceId: '00000000-0000-4000-8000-000000000000', firstLine: 1, lastLine: 1 }] }), /token usage/);
  } finally { app.close(); }
});
