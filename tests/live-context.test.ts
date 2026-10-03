import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { Boardroom } from '../src/application.ts';

const preparation = (projectId: string, evidenceId: string) => ({
  projectId, question: 'Which integration should the pilot deliver?', constraints: ['Four weeks'],
  advisers: [
    { id: 'po', role: 'Product Owner', providerId: 'provider-a', modelId: 'model-a' },
    { id: 'dev', role: 'Lead Developer', providerId: 'provider-b', modelId: 'model-b' },
    { id: 'marketing', role: 'Marketing Manager', providerId: 'provider-a', modelId: 'model-c' },
  ],
  proposalAuthorId: 'po', durationTargetSeconds: 600, costCeiling: { amount: 1, currency: 'USD' },
  passages: [{ evidenceId, firstLine: 2, lastLine: 2 }],
});

test('text source capture is bounded to 4 MiB before publishing a revision', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom source limit '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(root);
  try {
    const project = app.createProject({ name: 'Bounded source', language: 'en' });
    const source = join(root, 'large.md');
    writeFileSync(source, Buffer.alloc(4194305, 'a'));
    assert.throws(() => app.captureSource(project.id, source, { authorized: true }), /4 MiB/);
    writeFileSync(source, Buffer.alloc(4194304, 'a'));
    assert.equal(app.captureSource(project.id, source, { authorized: true }).revision, 1);
  } finally { app.close(); }
});

test('a declared zero-cost ceiling can be saved while invalid meeting settings leave no event', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom live settings '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(root);
  try {
    const project = app.createProject({ name: 'No paid work', language: 'fr' });
    const source = join(root, 'context.md');
    writeFileSync(source, 'Introduction.\nContext.\n');
    const evidence = app.captureSource(project.id, source, { authorized: true });
    const input = preparation(project.id, evidence.id);
    for (const invalid of [
      { ...input, question: ' ' }, { ...input, durationTargetSeconds: 0 },
      { ...input, costCeiling: { amount: -1, currency: 'USD' } },
      { ...input, passages: [] }, { ...input, apiKey: 'not-a-config-field' },
    ]) assert.throws(() => app.prepareMeeting(invalid));
    assert.deepEqual(app.history(project.id), { events: [], operations: [] });
    const meeting = app.prepareMeeting({ ...input, costCeiling: { amount: 0, currency: 'USD' } });
    assert.equal(meeting.costCeiling.amount, 0);
    assert.equal(meeting.status, 'prepared');
  } finally { app.close(); }
});

test('recorded projects cannot become live meetings and selected evidence remains project-scoped', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom context scope '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(root);
  try {
    const recorded = app.openRecordedExample();
    assert.throws(() => app.prepareMeeting(preparation(recorded.projectId, recorded.evidenceId)), /real project/i);
    const project = app.createProject({ name: 'Real', language: 'en' });
    const other = app.createProject({ name: 'Other', language: 'fr' });
    const source = join(root, 'context.md');
    writeFileSync(source, 'Introduction.\nCapacity: two engineers.\n');
    assert.throws(() => app.captureSource(project.id, join(root, 'absent'), { authorized: false }), /authorization/);
    const evidence = app.captureSource(project.id, source, { authorized: true });
    assert.throws(() => app.prepareMeeting(preparation(other.id, evidence.id)), /outside this project/);
    assert.throws(() => app.prepareMeeting({ ...preparation(project.id, evidence.id), passages: [{ evidenceId: evidence.id, firstLine: 4, lastLine: 4 }] }), /range/);
    assert.deepEqual(app.history(project.id), { events: [], operations: [] });
    const input = { ...preparation(project.id, evidence.id), language: 'en', initialPlan: 'One integration first.' };
    const meeting = app.prepareMeeting(input);
    assert.throws(() => app.getMeeting(other.id, meeting.id), /outside this project/);
    assert.throws(() => app.readMeetingContext(other.id, meeting.id), /outside this project/);
    input.constraints.push('A new constraint');
    input.advisers[0].modelId = 'changed-model';
    const saved = app.getMeeting(project.id, meeting.id);
    assert.deepEqual(saved.constraints, ['Four weeks']);
    assert.equal(saved.advisers[0].modelId, 'model-a');
    assert.equal(saved.initialPlan, 'One integration first.');
    writeFileSync(join(root, 'snapshots', evidence.sha256), 'Altered snapshot.');
    assert.throws(() => app.readMeetingContext(project.id, meeting.id), /integrity/);
  } finally { app.close(); }
});

test('selected context has a 64 KiB UTF-8 ceiling and rejects overflow before saving anything', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom context limit '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(root);
  try {
    const project = app.createProject({ name: 'Limits', language: 'en' });
    const source = join(root, 'large.md');
    writeFileSync(source, `Introduction.\n${'é'.repeat(32769)}\n`);
    const tooLarge = app.captureSource(project.id, source, { authorized: true });
    assert.throws(() => app.prepareMeeting(preparation(project.id, tooLarge.id)), /64 KiB/);
    assert.deepEqual(app.history(project.id), { events: [], operations: [] });
    writeFileSync(source, `Introduction.\n${'é'.repeat(32768)}\n`);
    const boundary = app.captureSource(project.id, source, { authorized: true });
    const saved = app.prepareMeeting(preparation(project.id, boundary.id));
    assert.equal(app.readMeetingContext(project.id, saved.id).passages[0].text.length, 32768);
  } finally { app.close(); }
});

test('preparation rejects an ambiguous or missing proposal author without journaling a meeting', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom live adviser selection '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(root);
  try {
    const project = app.createProject({ name: 'Roles', language: 'fr' });
    const source = join(root, 'roles.md');
    writeFileSync(source, 'Introduction.\nTwo engineers.\n');
    const evidence = app.captureSource(project.id, source, { authorized: true });
    const input = preparation(project.id, evidence.id);
    assert.throws(() => app.prepareMeeting({ ...input, proposalAuthorId: 'absent' }), /author/i);
    assert.throws(() => app.prepareMeeting({ ...input, advisers: [input.advisers[0], input.advisers[0]] }), /unique/i);
    assert.deepEqual(app.history(project.id), { events: [], operations: [] });
  } finally { app.close(); }
});

test('a real named project reopens with its language without changing the recorded project', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom live project '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let app = new Boardroom(root);
  const demo = app.openDemo();
  const project = app.createProject({ name: 'Hotel decision', language: 'fr' });
  assert.equal(project.recorded, false);
  assert.equal(project.name, 'Hotel decision');
  assert.equal(project.language, 'fr');
  assert.notEqual(project.id, demo.id);
  app.close();
  app = new Boardroom(root);
  try {
    assert.deepEqual(app.getProject(project.id), project);
    assert.deepEqual(app.openDemo(), demo);
    assert.throws(() => app.getProject('missing'), /Project unavailable/);
    assert.throws(() => app.createProject({ name: ' ', language: 'fr' }));
    assert.throws(() => app.createProject({ name: 'Hotel', language: '' }));
    assert.equal(app.capabilities().liveMeetings, 'available');
    assert.equal(app.capabilities().liveQualification, 'real-account qualification pending');
  } finally { app.close(); }
});

test('a question without an initial plan freezes only selected source lines and survives changes and deletion', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom frozen context '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const data = join(root, 'data');
  const source = join(root, 'notes.md');
  writeFileSync(source, 'Unselected introduction.\nCapacity: two engineers.\nUnselected appendix.\n');
  let app = new Boardroom(data);
  const project = app.createProject({ name: 'Pilot', language: 'fr' });
  const evidence = app.captureSource(project.id, source, { authorized: true });
  const meeting = app.prepareMeeting(preparation(project.id, evidence.id));
  assert.equal(meeting.mode, 'live');
  assert.equal(meeting.status, 'prepared');
  assert.equal(meeting.language, 'fr');
  assert.equal(meeting.initialPlan, undefined);
  assert.equal(meeting.context.version, 1);
  assert.equal(meeting.context.passages[0].sha256, evidence.sha256);
  assert.equal(meeting.context.passages[0].revision, 1);
  writeFileSync(source, 'A completely different original.\n');
  app.captureSource(project.id, source, { authorized: true });
  app.close();
  app = new Boardroom(data);
  try {
    assert.deepEqual(app.getMeeting(project.id, meeting.id), meeting);
    const context = app.readMeetingContext(project.id, meeting.id);
    assert.deepEqual(context.passages.map(passage => passage.text), ['Capacity: two engineers.']);
    assert.equal(context.passages[0].originalChanged, true);
    unlinkSync(source);
    assert.deepEqual(app.readMeetingContext(project.id, meeting.id).passages.map(passage => passage.text), ['Capacity: two engineers.']);
    const history = app.history(project.id);
    assert.deepEqual(history.events.map(event => event.type), ['live.meeting-prepared']);
    assert.equal(history.events[0].meetingId, meeting.id);
    assert.ok(!JSON.stringify(history).includes('Capacity: two engineers.'));
    const trace = app.exportFilteredTrace(project.id, join(root, 'trace'));
    assert.ok(!readFileSync(trace, 'utf8').includes(source));
    assert.ok(!readFileSync(trace, 'utf8').includes(meeting.question));
  } finally { app.close(); }
});

test('simultaneous text captures reuse one evidence identity and allocate the next revision once', { timeout: 20000 }, async t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom live concurrent '));
  const data = join(root, 'data');
  const source = join(root, 'context.md');
  writeFileSync(source, 'Initial context.\n'.repeat(100000));
  const app = new Boardroom(data);
  const project = app.createProject({ name: 'Concurrent sources', language: 'en' });
  const program = `
    import { Boardroom } from ${JSON.stringify(new URL('../src/application.ts', import.meta.url).href)};
    const app = new Boardroom(process.argv[1]);
    process.send('ready');
    process.once('message', () => {
      try { process.send(app.captureSource(process.argv[2], process.argv[3], { authorized: true })); }
      catch (error) { process.send({ error: error.message }); }
      finally { app.close(); process.disconnect(); }
    });
  `;
  const children = Array.from({ length: 8 }, () => spawn(process.execPath,
    ['--input-type=module', '-e', program, data, project.id, source], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] }));
  t.after(async () => {
    await Promise.all(children.map(async child => {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
      }
    }));
    app.close(); rmSync(root, { recursive: true, force: true });
  });
  const reply = (child: typeof children[number]) => Promise.race([
    once(child, 'message').then(([message]) => message),
    once(child, 'exit').then(([code]) => { throw new Error(`Capture exited without replying (${code}).`); }),
  ]);
  await Promise.all(children.map(reply));
  const pending = children.map(reply);
  for (const child of children) child.send('capture');
  const results = await Promise.all(pending);
  assert.ok(results.every(result => !result.error), JSON.stringify(results));
  assert.equal(new Set(results.map(result => result.id)).size, 1);
  assert.ok(results.every(result => result.revision === 1));
  writeFileSync(source, 'Changed context.\n');
  const revised = app.captureSource(project.id, source, { authorized: true });
  assert.equal(revised.revision, 2);
  assert.equal(app.resolveCitation(project.id, results[0].id, 1, 1).text, 'Initial context.');
});
