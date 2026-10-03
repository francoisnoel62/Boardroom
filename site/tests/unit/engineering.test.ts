import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { countTests, decisions, limits, platformsFromWorkflow } from '../../src/data/engineering.ts';

const repo = resolve(import.meta.dirname, '../../..');
const testSources = readdirSync(resolve(repo, 'tests'))
  .filter(name => name.endsWith('.test.ts'))
  .map(name => readFileSync(resolve(repo, 'tests', name), 'utf8'));

test('the application test count is read from the test files themselves', () => {
  // The CI log of the application workflow reports "tests 48" for this suite.
  assert.equal(countTests(testSources), 48);
});

test('only top-level test declarations are counted', () => {
  const source = "test('a', () => {});\ntest('b', { timeout: 1 }, async () => {\n  test('nested', () => {});\n});\nconst notATest = 'test(';\n";
  assert.equal(countTests([source]), 2);
});

test('qualified platforms come from the application CI matrix, without duplicates', () => {
  const workflow = readFileSync(resolve(repo, '.github/workflows/ci.yml'), 'utf8');
  assert.deepEqual(platformsFromWorkflow(workflow), ['Windows x64', 'Linux x64', 'macOS arm64']);
});

test('an unknown runner is refused rather than presented as a supported platform', () => {
  assert.throws(() => platformsFromWorkflow('          - os: freebsd-13\n            arch: x64\n'), /Unknown runner "freebsd-13"/);
});

test('every engineering decision and limit cites evidence that exists in the repository', () => {
  assert.ok(decisions.length >= 5);
  assert.ok(limits.length >= 3);
  for (const item of [...decisions, ...limits]) {
    assert.ok(item.evidence.length > 0, `${item.title} has no evidence`);
    for (const path of item.evidence) assert.ok(existsSync(resolve(repo, path.split('#')[0]!)), `${item.title}: missing ${path}`);
  }
});
