import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

test('CLI prepares and inspects a real frozen question across processes without touching originals', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom live CLI '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const invoke = (...args: string[]) => spawnSync(process.execPath, [cli, ...args, '--data-dir', join(root, 'data')], { encoding: 'utf8' });
  const run = (...args: string[]) => {
    const result = invoke(...args); assert.equal(result.status, 0, result.stdout + result.stderr); return result.stdout;
  };
  const project = JSON.parse(run('project-create', '--name', 'Pilot', '--language', 'fr', '--json'));
  assert.equal(project.recorded, false);
  assert.deepEqual(JSON.parse(run('project', '--id', project.id, '--json')), project);
  const source = join(root, 'context.md');
  const original = '# Project\nCapacity: two engineers.\nDo not send this appendix.\n';
  writeFileSync(source, original);
  const denied = invoke('source', '--project', project.id, '--source', source);
  assert.equal(denied.status, 1); assert.match(denied.stderr, /explicit source consent/);
  const evidence = JSON.parse(run('source', '--project', project.id, '--source', source, '--allow-source', '--json'));
  const inputFile = join(root, 'question.json');
  const input = {
    question: 'Which integration first?', constraints: ['Four weeks'],
    advisers: [
      { id: 'po', role: 'Product Owner', providerId: 'a', modelId: 'a1' },
      { id: 'dev', role: 'Lead Developer', providerId: 'b', modelId: 'b1' },
      { id: 'marketing', role: 'Marketing Manager', providerId: 'a', modelId: 'a2' },
    ], proposalAuthorId: 'po', durationTargetSeconds: 600, costCeiling: { amount: 1, currency: 'USD' },
    passages: [{ evidenceId: evidence.id, firstLine: 2, lastLine: 2 }],
  };
  writeFileSync(inputFile, JSON.stringify(input));
  const meeting = JSON.parse(run('meeting-prepare', '--project', project.id, '--input', inputFile, '--json'));
  assert.equal(meeting.language, 'fr'); assert.equal(meeting.status, 'prepared');
  assert.deepEqual(JSON.parse(run('meeting', '--project', project.id, '--id', meeting.id, '--json')), meeting);
  assert.equal(readFileSync(source, 'utf8'), original);
  unlinkSync(source);
  const context = JSON.parse(run('meeting-context', '--project', project.id, '--id', meeting.id, '--json'));
  assert.deepEqual(context.passages.map((passage: { text: string }) => passage.text), ['Capacity: two engineers.']);
  assert.equal(context.passages[0].originalChanged, true);
  assert.match(run('meeting-context', '--project', project.id, '--id', meeting.id), /Capacity: two engineers/);
  assert.match(run('meeting', '--project', project.id, '--id', meeting.id), /no model calls/i);
  const history = JSON.parse(run('history', '--project', project.id, '--json'));
  assert.deepEqual(history.events.map((event: { type: string }) => event.type), ['live.meeting-prepared']);
  assert.match(run('history', '--project', project.id), /live.meeting-prepared/);
  const trace = JSON.parse(run('trace', '--project', project.id, '--output', join(root, 'trace'), '--json'));
  assert.ok(!readFileSync(trace.path, 'utf8').includes(input.question));
  assert.equal(invoke('meeting-context', '--id', meeting.id).status, 1);
  writeFileSync(inputFile, JSON.stringify({ ...input, projectId: 'another-project' }));
  assert.equal(invoke('meeting-prepare', '--project', project.id, '--input', inputFile).status, 1);
  assert.equal(JSON.parse(run('history', '--project', project.id, '--json')).events.length, 1);
  assert.match(run('status'), /Live meetings: unavailable/);
  assert.match(run('demo', '--next'), /Recorded example/);
});
