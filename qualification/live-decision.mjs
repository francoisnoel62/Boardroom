import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openTerminal } from './terminal.ts';

/** The hook is supplied outside the candidate by the test campaign, never by product configuration. */
export async function qualifyLiveDecision(t, { candidate, root, evidence, env, run }) {
  const hook = process.env.BOARDROOM_QUALIFICATION_HTTP_HOOK;
  assert.ok(hook && existsSync(hook), 'Full deterministic qualification requires an external HTTP test hook.');
  const hookLocation = relative(resolve(candidate), resolve(hook));
  assert.ok(isAbsolute(hookLocation) || hookLocation === '..' || hookLocation.startsWith(`..${sep}`), 'The HTTP fixture must remain outside the candidate.');
  const digest = value => createHash('sha256').update(value).digest('hex');
  const project = JSON.parse(run('project-create', '--name', 'Packaged café pilot', '--language', 'en', '--json'));
  const source = join(root, 'decision-context.md'), sourceText = 'Two engineers; four weeks.\nPRIVATE_UNSELECTED';
  writeFileSync(source, sourceText);
  const savedSource = JSON.parse(run('source', '--project', project.id, '--source', source, '--allow-source', '--json'));
  const config = join(root, 'live-route.json');
  for (const [id, providerId, modelId] of [['live-po', 'openai', 'gpt-4.1-mini-2025-04-14'],
    ['live-dev', 'anthropic', 'claude-haiku-4-5-20251001'], ['live-marketing', 'openai', 'gpt-4.1-2025-04-14']]) {
    writeFileSync(config, JSON.stringify({ id, providerId, modelId }));
    const route = JSON.parse(run('route-configure', '--catalog', '--input', config, '--json'));
    assert.equal(route.verification, 'unverified');
    // The shipped catalog's rates expire; the external fixture judges them on a day inside their window.
    env.TEST_UTC_NOW = `${route.pricing.asOf}T12:00:00.000Z`;
  }
  writeFileSync(config, JSON.stringify({ id: 'live-team', proposalAuthorId: 'po', advisers: [
    { id: 'po', role: 'Product Owner', routeId: 'live-po' }, { id: 'dev', role: 'Lead Developer', routeId: 'live-dev' },
    { id: 'marketing', role: 'Marketing Manager', routeId: 'live-marketing' },
  ] }));
  run('team-configure', '--input', config, '--json');
  const question = join(root, 'live-question.json');
  writeFileSync(question, JSON.stringify({ question: 'What pilot fits our staffing?', constraints: ['Four weeks'], durationTargetSeconds: 600,
    costCeiling: { amount: 10, currency: 'USD' }, passages: [{ evidenceId: savedSource.id, firstLine: 1, lastLine: 1 }] }));
  const meeting = JSON.parse(run('meeting-prepare', '--project', project.id, '--team', 'live-team', '--input', question, '--json'));
  const references = meeting.context.passages.map(({ evidenceId, revision, sha256, firstLine, lastLine }) => ({ evidenceId, revision, sha256, firstLine, lastLine }));
  const proposal = { title: 'Pilot', items: [{ id: 'integration', text: 'Build five integrations', references }] };
  const revised = { ...proposal, items: [{ ...proposal.items[0], text: 'Build one integration' }] };
  const view = { proposalVersion: 2, proposalSha256: digest(JSON.stringify(revised)), verdict: 'APPROVED', confidence: 72,
    justification: 'Limited pilot', criticalUncertainty: 'Demand', conditions: ['Test willingness to pay'], references };
  const outputs = {
    framing: { decisionQuestion: 'Pilot?', summary: 'Compare scope', initialProposal: null, assumptions: [], references },
    analysis: { assertions: [{ id: 'capacity', kind: 'fact', text: 'Two engineers', references }, { id: 'demand', kind: 'unknown', text: 'Demand untested', references: [] }], risks: ['Capacity'], assumptions: [], recommendations: ['Pilot'] },
    proposal, confrontation: { 'claude-haiku-4-5-20251001': { objections: [{ id: 'capacity', target: { kind: 'proposal-item', adviserId: null, assertionId: null, itemId: 'integration' },
      justification: 'Two engineers cannot build five integrations in four weeks.', impact: 'Missed deadline', amendment: 'One integration', references }] }, 'gpt-4.1-2025-04-14': { objections: [] } },
    revision: { proposal: revised, dispositions: [{ adviserId: 'dev', objectionId: 'capacity', action: 'accepted', reason: 'Staffing', changedItemIds: ['integration'] }] },
    views: { 'gpt-4.1-mini-2025-04-14': view, 'claude-haiku-4-5-20251001': { ...view, verdict: 'REJECTED' }, 'gpt-4.1-2025-04-14': { ...view, verdict: 'INSUFFICIENT_EVIDENCE', confidence: 35 } },
  };
  const reserves = join(root, 'reserves.json');
  writeFileSync(reserves, JSON.stringify({ revisionMicros: 1000000, conclusionMicros: 1000000, revisionMs: 10000, conclusionMs: 10000 }));
  run('execution-configure', '--project', project.id, '--id', meeting.id, '--input', reserves, '--json');
  const token = 'QUALIFICATION_PRIVATE_SENTINEL_6c2d', log = join(root, 'live-http.jsonl');
  const before = { ...env };
  let live, exited = false;
  try {
    env.NODE_OPTIONS = `--import=${pathToFileURL(resolve(hook)).href}`;
    env.BOARDROOM_SESSION_KEYS = JSON.stringify({ 'live-po': token, 'live-dev': token, 'live-marketing': token });
    env.TEST_OUTPUTS = JSON.stringify(outputs); env.TEST_HTTP_LOG = log;
    const args = ['--project', project.id, '--id', meeting.id];
    env.BOARDROOM_SESSION_KEY = token;
    run('meeting-start', ...args, '--session', '--allow-provider', '--json');
    delete env.BOARDROOM_SESSION_KEY;
    run('meeting-approve', ...args, '--version', '1', '--json');
    run('meeting-analyse', ...args, '--session', '--allow-provider', '--json');
    run('meeting-debate', ...args, '--session', '--allow-provider', '--json');
    run('meeting-views', ...args, '--version', '2', '--session', '--allow-provider', '--json');
    const choice = join(root, 'human-choice.json'); writeFileSync(choice, JSON.stringify({ proposalVersion: 2, action: 'deferred', rationale: 'Test demand before committing.' }));
    run('meeting-decide', ...args, '--input', choice, '--json');
    const decision = JSON.parse(run('meeting-decision', ...args, '--json'));
    assert.equal(decision.status, 'complete'); assert.equal(decision.analyses.current.length, 3);
    assert.equal(decision.debate.proposals[0].body.items[0].text, 'Build five integrations');
    assert.equal(decision.debate.proposals[1].body.items[0].text, 'Build one integration');
    assert.equal(decision.debate.proposals[1].dispositions[0].objectionId, 'capacity');
    assert.equal(decision.debate.proposals[1].changes[0].itemId, 'integration');
    assert.equal(decision.debate.confrontations.find(c => c.adviserId === 'dev').body.objections[0].references[0].sha256, savedSource.sha256);
    assert.equal(decision.analyses.current.find(a => a.adviserId === 'dev').body.assertions[0].kind, 'fact');
    assert.deepEqual(decision.finalViews.advisers.map(a => a.view.body.verdict), ['APPROVED', 'REJECTED', 'INSUFFICIENT_EVIDENCE']);
    assert.ok(decision.finalViews.views.every(v => v.body.proposalSha256 === decision.debate.proposals[1].sha256));
    assert.equal(decision.decision.reviewedSha256, decision.debate.proposals[1].sha256);
    assert.ok(decision.calls.knownCostMicros > 0); assert.equal(decision.calls.committedMicros, 0);
    assert.ok(decision.calls.calls.every(c => c.status === 'completed'));
    const requests = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(requests.length, 13);
    const analyses = requests.filter(({ body }) => (body.text?.format.schema ?? body.output_config?.format.schema)?.properties.assertions)
      .map(({ body }) => JSON.parse((body.input ?? body.messages[0].content).split('\n')[1]));
    assert.equal(analyses.length, 3); assert.equal(new Set(analyses.map(a => a.factsSha256)).size, 1);
    const common = analyses.map(({ adviserId, role, ...facts }) => facts); assert.deepEqual(common[0], common[1]); assert.deepEqual(common[1], common[2]);
    assert.ok(analyses.every(a => !('analyses' in a) && !('history' in a) && !('proposals' in a)));
    assert.equal(JSON.stringify(requests).includes('PRIVATE_UNSELECTED'), false);
    const result = JSON.parse(run('meeting-export', ...args, '--output', join(root, 'live-output'), '--with-json', '--session', '--json'));
    for (const [name, path] of [['live-plan.md', result.plan], ['live-memo.md', result.memo], ['live-meeting.json', result.json]]) {
      assert.equal(readFileSync(path, 'utf8').includes(token), false); copyFileSync(path, join(evidence, name));
    }
    assert.match(readFileSync(result.plan, 'utf8'), /Build one integration/);
    assert.match(readFileSync(result.memo, 'utf8'), /INSUFFICIENT_EVIDENCE/);
    const runtime = join(candidate, 'runtime', process.platform === 'win32' ? 'node.exe' : 'node');
    const dataArgs = process.platform === 'darwin' ? ['--data-dir', join(root, 'application-data')] : [];
    live = openTerminal(t, [join(candidate, 'dist', 'cli.js'), 'live', '--project', project.id, '--team', 'live-team', '--input', question,
      '--output', join(root, 'terminal-output'), '--session', '--allow-provider', ...dataArgs], { executable: runtime, cwd: root, env, cols: 110, rows: 34 });
    await live.waitFor(/Live decision/, 30000);
    const command = async text => { live.write(text); await live.waitFor(screen => screen.includes(`Draft: ${text}`)); live.write('\r');
      await live.waitFor(screen => screen.split('\n').filter(l => l.startsWith('Draft:')).at(-1)?.trim() === 'Draft:'); };
    await command('start'); await live.waitFor(/awaiting-human.*v1/); await command('approve 1'); await live.waitFor(/approved.*v1/);
    await command('analyse'); await live.waitFor(/Analyses: complete.*3/); await command('debate'); await live.waitFor(/Proposal: v2/);
    await command('views 2'); await live.waitFor(/Views: complete.*3/); await command('decide 2 deferred Test demand'); await live.waitFor(/Human: deferred/);
    await command('export'); await live.waitFor(/Export saved/); live.write('quit'); await live.waitFor(/Draft: quit/); live.write('\r'); assert.equal((await live.finish()).exitCode, 0); exited = true;
    const screen = live.snapshot(); assert.match(screen, /INSUFFICIENT_EVIDENCE/); assert.equal(screen.includes(token), false);
    writeFileSync(join(evidence, 'live-terminal-screen.txt'), screen);
    const recording = live.recording().map(([time, kind, bytes]) => [time, kind, bytes.replace(/\x1b\]0;[^\x07]*(?:\x07|\x1b\\)/g, '')]);
    assert.equal(JSON.stringify(recording).includes(token), false);
    writeFileSync(join(evidence, 'live-terminal.cast'), [JSON.stringify({ version: 2, width: 110, height: 34,
      title: 'BOARDROOM — packaged live workflow; external deterministic HTTP' }), ...recording.map(event => JSON.stringify(event))].join('\n') + '\n');
    const [terminalExport] = readdirSync(join(root, 'terminal-output'));
    assert.match(readFileSync(join(root, 'terminal-output', terminalExport, 'plan.md'), 'utf8'), /Build one integration/);
    for (const route of JSON.parse(run('configuration', '--json')).routes.filter(r => r.id.startsWith('live-'))) assert.equal(route.verification, 'unverified');
    assert.equal(digest(readFileSync(source)), digest(sourceText));
    const dataPath = process.platform === 'win32' ? join(env.LOCALAPPDATA, 'Boardroom')
      : process.platform === 'darwin' ? join(root, 'application-data') : join(env.XDG_DATA_HOME, 'boardroom');
    for (const name of readdirSync(dataPath).filter(name => /sqlite/.test(name))) assert.equal(readFileSync(join(dataPath, name)).includes(Buffer.from(token)), false);
    writeFileSync(join(evidence, 'live-analysis-payloads.json'), JSON.stringify(analyses, null, 2) + '\n');
    writeFileSync(join(evidence, 'live-decision.json'), JSON.stringify({ schemaVersion: 1, mode: 'deterministic-external-http', platform: process.platform, architecture: process.arch,
      runtime: process.version, hostNodeVisible: false, providers: [...new Set(meeting.advisers.map(a => a.providerId))], models: meeting.advisers.map(a => a.modelId),
      independentAnalyses: true, sourceObjectionRevisionChain: true, finalViews: decision.finalViews.advisers.map(a => a.view.body.verdict), humanDecision: decision.decision.action,
      originalPreserved: true, sentinelAbsent: true, knownCostMicros: decision.calls.knownCostMicros, uncertainCommitmentMicros: decision.calls.committedMicros,
      requestCount: requests.length, realAccountQualification: 'pending' }, null, 2) + '\n');
  } finally {
    if (live && !exited) { live.write('\x03'); await live.finish(); }
    for (const key of Object.keys(env)) delete env[key]; Object.assign(env, before);
  }
}
