import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { buildStory, readExportedSourceHash } from '../../src/data/story.ts';

const repo = resolve(import.meta.dirname, '../../..');
const read = (path: string) => readFileSync(resolve(repo, path), 'utf8');
const meeting = JSON.parse(read('assets/demo/meeting.json')) as unknown;
const context = read('assets/demo/context.md');

test('the story follows the recorded meeting in its saved order', () => {
  const story = buildStory(meeting, context);

  assert.deepEqual(story.steps.map(step => [step.phase, step.role]), [
    ['proposal', 'Product Owner'],
    ['objection', 'Lead Developer'],
    ['objection', 'Marketing Manager'],
    ['revision', 'Product Owner'],
    ['final-views', 'Marketing Manager'],
  ]);
  assert.ok(story.steps.every(step => step.model.endsWith('scripted fixture')), 'every step keeps its fictional label');
});

test('objections carry the exact cited lines of the fictional source', () => {
  const story = buildStory(meeting, context);
  const [, staffing, demand] = story.steps;

  assert.deepEqual(staffing?.evidence, {
    source: 'context.md', firstLine: 4, lastLine: 4,
    lines: ['Team: two engineers; four weeks available for the launch.'],
  });
  assert.deepEqual(demand?.evidence?.lines, ['Evidence gap: no paid acquisition channel has been validated.']);
});

test('both proposal versions are exposed for comparison', () => {
  const story = buildStory(meeting, context);

  assert.equal(story.proposals.v1, 'Launch five integrations and self-service billing in four weeks.');
  assert.equal(story.proposals.v2, 'One integration, supervised onboarding, and five design partners. Defer self-service billing and the public launch.');
});

test('final views preserve insufficient evidence and the pending human decision', () => {
  const story = buildStory(meeting, context);

  assert.deepEqual(story.finalViews, [
    { role: 'Product Owner', verdict: 'APPROVED' },
    { role: 'Lead Developer', verdict: 'APPROVED' },
    { role: 'Marketing Manager', verdict: 'INSUFFICIENT_EVIDENCE' },
  ]);
  assert.equal(story.openQuestion, 'Willingness to pay remains untested.');
  assert.equal(story.humanDecision, 'pending');
});

test('an unknown fixture version is refused instead of guessed', () => {
  assert.throws(() => buildStory({ schemaVersion: 2, messages: [] }, context), /schema version 2/);
});

test('a citation outside the source is refused', () => {
  const broken = structuredClone(meeting) as { messages: Array<{ citation?: { firstLine: number; lastLine: number } }> };
  broken.messages[1]!.citation = { firstLine: 40, lastLine: 41 };

  assert.throws(() => buildStory(broken, context), /lines 40-41 are outside context\.md/);
});

test('a final view without a stated verdict is refused rather than shown as approval', () => {
  const broken = structuredClone(meeting) as { messages: Array<{ phase: string; text: string }> };
  const final = broken.messages.find(message => message.phase === 'final-views')!;
  final.text = final.text.replace('Lead Developer APPROVED; ', '');

  assert.throws(() => buildStory(broken, context), /No final view for Lead Developer/);
});

test('the retained export cites the exact bytes of the bundled source', () => {
  const memo = read('docs/validation/recorded-export/memo.md');
  const actual = createHash('sha256').update(readFileSync(resolve(repo, 'assets/demo/context.md'))).digest('hex');

  assert.equal(readExportedSourceHash(memo), actual);
});
