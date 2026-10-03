import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { providerSetup } from './support/providers.ts';

test('actual CLI completes question, approval, analyses, revision, individual views, human decision and live exports', t => {
  const { app, project, meeting, root } = providerSetup(t, async () => { throw new Error('CLI only'); });
  const references = meeting.context.passages, log = join(root, 'http.jsonl');
  const proposal = { title: 'Pilot', items: [{ id: 'integration', text: 'Build five integrations', references }] };
  const outputs: any = {
    framing: { decisionQuestion: 'Pilot?', summary: 'Scope', initialProposal: null, assumptions: [], references },
    analysis: { assertions: [{ id: 'capacity', kind: 'fact', text: 'Two engineers', references }], risks: [], assumptions: [], recommendations: ['Pilot'] }, proposal,
    confrontation: { 'claude-haiku-4-5-20251001': { objections: [{ id: 'capacity', target: { kind: 'proposal-item', adviserId: null, assertionId: null, itemId: 'integration' }, justification: 'Two engineers', impact: 'Capacity', amendment: 'One', references }] }, 'gpt-4.1-2025-04-14': { objections: [] } },
    revision: { proposal: { ...proposal, items: [{ ...proposal.items[0], text: 'Build one integration' }] }, dispositions: [{ adviserId: 'dev', objectionId: 'capacity', action: 'accepted', reason: 'Staffing', changedItemIds: ['integration'] }] },
  };
  const run = (command: string, ...args: string[]) => spawnSync(process.execPath, ['--import', './tests/support/provider-http.mjs', 'dist/cli.js', command,
    '--data-dir', root, '--project', project.id, '--id', meeting.id, '--json', ...args], { encoding: 'utf8', env: { ...process.env, BOARDROOM_SESSION_KEY: 'PRIVATE_KEY',
      BOARDROOM_SESSION_KEYS: JSON.stringify({ po: 'PRIVATE_KEY', dev: 'PRIVATE_KEY', marketing: 'PRIVATE_KEY' }), TEST_OUTPUTS: JSON.stringify(outputs), TEST_HTTP_LOG: log } });
  const succeed = (command: string, ...args: string[]) => { const r = run(command, ...args); assert.equal(r.status, 0, r.stderr + r.stdout); return JSON.parse(r.stdout); };
  succeed('meeting-start', '--session', '--allow-provider'); succeed('meeting-approve', '--version', '1');
  succeed('meeting-analyse', '--session', '--allow-provider'); const debated = succeed('meeting-debate', '--session', '--allow-provider');
  const current = debated.current;
  const view = { proposalVersion: 2, proposalSha256: current.sha256, verdict: 'APPROVED', confidence: 72, justification: 'Pilot', criticalUncertainty: 'Demand', conditions: [], references };
  outputs.views = { 'gpt-4.1-mini-2025-04-14': view, 'gpt-4.1-2025-04-14': { ...view, verdict: 'INSUFFICIENT_EVIDENCE' }, 'claude-haiku-4-5-20251001': { ...view, verdict: 'REJECTED' } };
  assert.equal(run('meeting-views', '--session', '--version', '2').status, 1);
  const views = succeed('meeting-views', '--session', '--version', '2', '--allow-provider'); assert.equal(views.views.length, 3);
  const input = join(root, 'decision.json'); writeFileSync(input, JSON.stringify({ proposalVersion: 2, action: 'deferred', rationale: 'Investigate demand first' }));
  succeed('meeting-decide', '--input', input);
  assert.equal(succeed('meeting-decision').decision.action, 'deferred');
  const exported = succeed('meeting-export', '--output', join(root, 'out'), '--with-json', '--session');
  assert.match(readFileSync(exported.plan, 'utf8'), /Build one integration/);
  const memo = readFileSync(exported.memo, 'utf8'); assert.match(memo, /INSUFFICIENT_EVIDENCE/); assert.match(memo, /REJECTED/); assert.match(memo, /deferred/);
  assert.equal(memo.includes('PRIVATE_KEY'), false); assert.equal(memo.includes('PRIVATE_UNSELECTED'), false);
  assert.equal(readFileSync(log, 'utf8').trim().split('\n').length, 13);
});
