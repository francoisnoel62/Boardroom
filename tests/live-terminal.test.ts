import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTerminal } from './support/terminal.ts';
import { providerSetup } from './support/providers.ts';
import { createHash } from 'node:crypto';
import { liveSetup } from './support/live.ts';

test('real live PTY selects a question, approves framing, revises, decides and exports both artifacts', { timeout: 45000 }, async t => {
  let terminal: ReturnType<typeof openTerminal> | undefined, finished = false;
  t.after(async () => { if (terminal && !finished) { terminal.write('\x03'); await terminal.finish(); } });
  const { app, project, meeting, root } = providerSetup(t, async () => { throw new Error('PTY only'); });
  const references = meeting.context.passages;
  const proposal = { title: 'Pilot', items: [{ id: 'integration', text: 'Build five integrations', references }] };
  const revised = { ...proposal, items: [{ ...proposal.items[0], text: 'Build one integration' }] };
  const outputs = {
    framing: { decisionQuestion: 'Pilot?', summary: 'Scope', initialProposal: null, assumptions: [], references },
    analysis: { assertions: [{ id: 'capacity', kind: 'fact', text: 'Two engineers', references }], risks: [], assumptions: [], recommendations: ['Pilot'] }, proposal,
    confrontation: { 'claude-haiku-4-5-20251001': { objections: [{ id: 'capacity', target: { kind: 'proposal-item', adviserId: null, assertionId: null, itemId: 'integration' }, justification: 'Two engineers', impact: 'Capacity', amendment: 'One', references }] }, 'gpt-4.1-2025-04-14': { objections: [] } },
    revision: { proposal: revised, dispositions: [{ adviserId: 'dev', objectionId: 'capacity', action: 'accepted', reason: 'Staffing', changedItemIds: ['integration'] }] },
    views: { proposalVersion: 2, proposalSha256: createHash('sha256').update(JSON.stringify({ ...revised, items: revised.items.map(item => ({ ...item,
      references: references.map(({ evidenceId, revision, sha256, firstLine, lastLine }) => ({ evidenceId, revision, sha256, firstLine, lastLine })) })) })).digest('hex'),
      verdict: 'APPROVED', confidence: 72, justification: 'Pilot', criticalUncertainty: 'Demand', conditions: [], references },
  };
  const input = join(root, 'question.json'); writeFileSync(input, JSON.stringify({ question: 'Initial?', constraints: [], durationTargetSeconds: 600,
    costCeiling: { amount: 10, currency: 'USD' }, passages: meeting.context.passages.map(({ evidenceId, firstLine, lastLine }) => ({ evidenceId, firstLine, lastLine })) }));
  const out = join(root, 'out');
  terminal = openTerminal(t, ['--import', './tests/support/provider-http.mjs', 'dist/cli.js', 'live', '--data-dir', root, '--project', project.id,
    '--team', 'team', '--input', input, '--output', out, '--allow-provider', '--session'], { env: {
      BOARDROOM_SESSION_KEYS: JSON.stringify({ po: 'KEY', dev: 'KEY', marketing: 'KEY' }), TEST_OUTPUTS: JSON.stringify(outputs), CI: 'true' } });
  await terminal.waitFor(/BOARDROOM.*Live decision/);
  const command = async (text: string) => {
    terminal!.write(text); await terminal!.waitFor(screen => screen.includes(`Draft: ${text}`)); terminal!.write('\r');
    await terminal!.waitFor(screen => screen.split('\n').filter(line => line.startsWith('Draft:')).at(-1)?.trim() === 'Draft:');
  };
  await command('question Café 😀 pilot?'); await terminal.waitFor(/Question: Café 😀 pilot/);
  await command('select 1'); await terminal.waitFor(/Selected: 1/);
  await command('start'); await terminal.waitFor(/awaiting-human.*v1/);
  await command('approve 1'); await terminal.waitFor(/approved.*v1/);
  await command('analyse'); await terminal.waitFor(/Analyses: complete.*3/);
  await command('debate'); await terminal.waitFor(/Proposal: v2/);
  await command('views 2'); await terminal.waitFor(/Views: complete.*3/);
  await command('decide 2 deferred Check willingness to pay'); await terminal.waitFor(/Human: deferred/);
  await command('export'); await terminal.waitFor(/Export saved/);
  terminal.write('quit'); await terminal.waitFor(/Draft: quit/); terminal.write('\r'); assert.equal((await terminal.finish()).exitCode, 0); finished = true;
  const [directory] = readdirSync(out); assert.ok(directory);
  assert.match(readFileSync(join(out, directory, 'plan.md'), 'utf8'), /Build one integration/);
  assert.match(readFileSync(join(out, directory, 'memo.md'), 'utf8'), /deferred/);
  const saved = JSON.parse(readFileSync(join(out, directory, 'meeting.json'), 'utf8'));
  assert.equal(app.getMeeting(project.id, saved.meetingId).question, 'Café 😀 pilot?');
});

// One scenario, run for each way of cancelling; declared as two tests so each is counted where the suite is published.
const streamingScenario = (cancelName: string, cancelKey: string) => async (t: TestContext) => {
  let terminal: ReturnType<typeof openTerminal> | undefined, finished = false;
  t.after(async () => { if (terminal && !finished) { terminal.write('\x03'); await terminal.finish(); } });
  const { app, project, meeting, root } = providerSetup(t, async () => { throw new Error('PTY only'); });
  const references = meeting.context.passages, out = join(root, 'out');
  const outputs = { framing: { decisionQuestion: 'Pilot?', summary: 'Scope\u001b]2;MODEL_TITLE\u0007', initialProposal: null, assumptions: [], references },
    analysis: { assertions: [{ id: 'capacity', kind: 'fact', text: 'STREAM_SENTINEL', references }], risks: [], assumptions: [], recommendations: ['Pilot'] } };
  terminal = openTerminal(t, ['--import', './tests/support/provider-http.mjs', 'dist/cli.js', 'live', '--data-dir', root, '--project', project.id,
    '--id', meeting.id, '--output', out, '--allow-provider', '--session'], { env: {
      BOARDROOM_SESSION_KEYS: JSON.stringify({ po: 'PRIVATE_KEY', dev: 'PRIVATE_KEY', marketing: 'PRIVATE_KEY' }), TEST_OUTPUTS: JSON.stringify(outputs), TEST_STREAM_DELAY_MS: '15000', TEST_DELAY_PHASE: 'analysis' } });
  await terminal.waitFor(/BOARDROOM.*Live decision/);
  const command = async (text: string) => { terminal!.write(text); await terminal!.waitFor(new RegExp(`Draft: ${text}`)); terminal!.write('\r');
    await terminal!.waitFor(screen => screen.split('\n').filter(l => l.startsWith('Draft:')).at(-1)?.trim() === 'Draft:'); };
  await command('start'); await terminal.waitFor(/awaiting-human.*v1/); await command('approve 1'); await terminal.waitFor(/approved.*v1/);
  await command('analyse'); await terminal.waitFor(/provisional.*STREAM_SENTINEL|STREAM_SENTINEL/);
  terminal.write('\x1b[200~inspect café e\u0301 😀\r\nsecond line\x1b[201~'); await terminal.waitFor(/Draft: inspect café é 😀\nsecond line/);
  terminal.resize(44, 18); await terminal.waitFor(/Window: 44x18/);
  assert.match(terminal.viewport(), /Window: 44x18/); assert.match(terminal.viewport(), /Draft: inspect café/);
  terminal.resize(100, 30);
  await terminal.waitFor(/Draft: inspect café é 😀\nsecond line/);
  terminal.write(cancelKey); assert.equal((await terminal.finish()).exitCode, 130); finished = true;
  assert.equal(terminal.raw().includes('\u001b]2;MODEL_TITLE'), false); assert.match(terminal.raw(), /\u001b\[\?2004l/); assert.match(terminal.raw(), /\u001b\[\?25h/);
  const calls = app.callLedger(project.id, meeting.id).calls.filter(c => c.phase === 'analysis');
  assert.equal(calls.length, 3); assert.ok(calls.every(c => c.status === 'uncertain' && c.knownCostMicros === undefined));
  const [directory] = readdirSync(out); assert.ok(directory);
  assert.match(readFileSync(join(out, directory, 'plan.md'), 'utf8'), /No final plan has been established/);
};
test(`live streaming preserves multiline Unicode drafts across resize and Ctrl+C saves uncertain partial work`, { timeout: 30000 }, streamingScenario('Ctrl+C', '\x03'));
test(`live streaming preserves multiline Unicode drafts across resize and Escape saves uncertain partial work`, { timeout: 30000 }, streamingScenario('Escape', '\x1b'));

test('live PTY refuses a ceiling that could never reach the final views, before any meeting or request', { timeout: 30000 }, async t => {
  let terminal: ReturnType<typeof openTerminal> | undefined, finished = false;
  t.after(async () => { if (terminal && !finished) { terminal.write('\x03'); await terminal.finish(); } });
  const { app, project, meeting, root } = providerSetup(t, async () => { throw new Error('PTY only'); });
  const input = join(root, 'question.json'), out = join(root, 'out'), log = join(root, 'http.jsonl');
  writeFileSync(log, '');
  writeFileSync(input, JSON.stringify({ question: 'Unfunded?', durationTargetSeconds: 600, costCeiling: { amount: 0, currency: 'USD' },
    passages: meeting.context.passages.map(({ evidenceId, firstLine, lastLine }) => ({ evidenceId, firstLine, lastLine })) }));
  terminal = openTerminal(t, ['--import', './tests/support/provider-http.mjs', 'dist/cli.js', 'live', '--data-dir', root, '--project', project.id,
    '--team', 'team', '--input', input, '--output', out, '--allow-provider', '--session'], { env: {
      BOARDROOM_SESSION_KEYS: JSON.stringify({ po: 'KEY', dev: 'KEY', marketing: 'KEY' }), TEST_HTTP_LOG: log } });
  await terminal.waitFor(/Live decision/);
  const command = async (text: string) => { terminal!.write(text); await terminal!.waitFor(screen => screen.includes(`Draft: ${text}`)); terminal!.write('\r');
    await terminal!.waitFor(screen => screen.split('\n').filter(l => l.startsWith('Draft:')).at(-1)?.trim() === 'Draft:'); };
  await command('start'); await terminal.waitFor(/Budget refused before any request: at least 6\.37 USD is needed, ceiling is 0 USD/); await terminal.waitFor(/Budget 0 USD/);
  await command('export'); await terminal.waitFor(/Start the question first/);
  terminal.write('quit'); await terminal.waitFor(/Draft: quit/); terminal.write('\r'); assert.equal((await terminal.finish()).exitCode, 0); finished = true;
  assert.equal(readFileSync(log, 'utf8'), '');
  assert.equal(app.callLedger(project.id, meeting.id).calls.length, 0);
  assert.equal(existsSync(out), false, 'no meeting was created, so nothing is exported');
});

test('live PTY concludes explicitly and preserves a missing view beside insufficient evidence', { timeout: 30000 }, async t => {
  let terminal: ReturnType<typeof openTerminal> | undefined, finished = false;
  t.after(async () => { if (terminal && !finished) { terminal.write('\x03'); await terminal.finish(); } });
  const { app, project, meeting, root, store } = await liveSetup(t);
  await app.analyseMeeting(project.id, meeting.id, store); await app.debateMeeting(project.id, meeting.id, store);
  const proposal = (await app.inspectDebate(project.id, meeting.id)).current!;
  const view = { proposalVersion: proposal.version, proposalSha256: proposal.sha256, verdict: 'INSUFFICIENT_EVIDENCE', confidence: 35,
    justification: 'Demand untested', criticalUncertainty: 'Demand', conditions: [], references: meeting.context.passages };
  const out = join(root, 'out');
  terminal = openTerminal(t, ['--import', './tests/support/provider-http.mjs', 'dist/cli.js', 'live', '--data-dir', root, '--project', project.id,
    '--id', meeting.id, '--output', out, '--allow-provider', '--session'], { env: { BOARDROOM_SESSION_KEYS: JSON.stringify({ po: 'KEY', dev: 'KEY', marketing: 'KEY' }),
      TEST_OUTPUTS: JSON.stringify({ views: { 'gpt-4.1-mini-2025-04-14': view, 'gpt-4.1-2025-04-14': view, 'claude-haiku-4-5-20251001': { ...view, confidence: 101 } } }) } });
  await terminal.waitFor(/Proposal: v2/);
  const command = async (text: string) => { terminal!.write(text); await terminal!.waitFor(screen => screen.includes(`Draft: ${text}`)); terminal!.write('\r');
    await terminal!.waitFor(screen => screen.split('\n').filter(l => l.startsWith('Draft:')).at(-1)?.trim() === 'Draft:'); };
  await command('conclude'); await terminal.waitFor(/concluding/);
  await command('views 2'); await terminal.waitFor(/Views: partial.*2\/3/); await terminal.waitFor(/dev: missing/);
  await command('decide 2 investigation-requested Test demand'); await terminal.waitFor(/Human: investigation-requested/);
  await command('history'); await terminal.waitFor(/bounded view/);
  terminal.write('\x1b[200~question café é 😀\x1b[201~'); await terminal.waitFor(/Draft: question café é 😀/);
  terminal.write('\x7f'); await terminal.waitFor(screen => screen.split('\n').filter(l => l.startsWith('Draft:')).at(-1)?.trim() === 'Draft: question café é');
  terminal.write('\r'); await terminal.waitFor(/frozen after start/);
  await command('export'); await terminal.waitFor(/Export saved/); terminal.write('quit'); await terminal.waitFor(/Draft: quit/); terminal.write('\r'); assert.equal((await terminal.finish()).exitCode, 0); finished = true;
  const saved = await app.inspectFinalViews(project.id, meeting.id); assert.equal(saved.status, 'partial');
  assert.equal(saved.advisers.find(a => a.adviserId === 'dev')?.status, 'missing');
  const [directory] = readdirSync(out), memo = readFileSync(join(out, directory!, 'memo.md'), 'utf8');
  assert.match(memo, /INSUFFICIENT_EVIDENCE/); assert.match(memo, /missing/); assert.match(memo, /investigation-requested/);
});
