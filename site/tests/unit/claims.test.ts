import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { claims, getClaim } from '../../src/data/claims.ts';

const repo = resolve(import.meta.dirname, '../../..');
const planFiles = readdirSync(resolve(repo, 'boardroom-plans'));

test('every available claim points to evidence that exists in the repository', () => {
  for (const claim of claims.filter(claim => claim.status === 'available')) {
    assert.ok(claim.evidence.length > 0, `${claim.id} has no evidence`);
    for (const path of claim.evidence) assert.ok(existsSync(resolve(repo, path)), `${claim.id}: missing ${path}`);
  }
});

test('every planned claim names an existing delivery plan', () => {
  for (const claim of claims.filter(claim => claim.status === 'planned')) {
    assert.ok(claim.plan, `${claim.id} must name its plan`);
    assert.ok(planFiles.some(file => file.startsWith(`${claim.plan}-`)), `${claim.id}: no plan ${claim.plan}`);
  }
});

test('a vision claim cites the document that states the direction and names no plan', () => {
  const visions = claims.filter(claim => claim.status === 'vision');
  assert.ok(visions.length > 0);
  for (const claim of visions) {
    assert.equal(claim.plan, undefined, `${claim.id} is not scheduled in a plan`);
    assert.ok(claim.evidence.some(path => existsSync(resolve(repo, path))), `${claim.id} must cite its direction`);
  }
});

test('claim identifiers are unique', () => {
  assert.equal(new Set(claims.map(claim => claim.id)).size, claims.length);
});

test('an unknown claim cannot be rendered', () => {
  assert.throws(() => getClaim('does-not-exist'), /Unknown claim "does-not-exist"/);
});
