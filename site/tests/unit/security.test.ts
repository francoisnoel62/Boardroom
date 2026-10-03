import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const repo = resolve(import.meta.dirname, '../../..');

test('the security policy and the site give the same private reporting route', () => {
  const policy = readFileSync(resolve(repo, 'SECURITY.md'), 'utf8');
  assert.match(policy, /https:\/\/github\.com\/francoisnoel62\/Boardroom\/security\/advisories\/new/);
  assert.match(readFileSync(resolve(import.meta.dirname, '../../src/pages/security.astro'), 'utf8'), /security\/advisories\/new/);
});
