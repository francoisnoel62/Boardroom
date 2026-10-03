import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { publicStatus, roadmap, statusFromPlanFile } from '../../src/data/roadmap.ts';

const plans = resolve(import.meta.dirname, '../../../boardroom-plans');
const planFile = (id: string) => {
  const name = readdirSync(plans).find(file => file.startsWith(`${id}-`));
  assert.ok(name, `plan ${id} has no file`);
  return readFileSync(resolve(plans, name), 'utf8');
};

test('the public roadmap lists the nine delivery plans in order', () => {
  assert.deepEqual(roadmap.map(plan => plan.id), ['01', '02', '03', '04', '05', '06', '07', '08', '09']);
});

test('each public status matches the status line of its plan', () => {
  for (const plan of roadmap) assert.equal(plan.status, statusFromPlanFile(planFile(plan.id)), `plan ${plan.id}`);
});

test('an acceptance with reservations is never shown as a clean acceptance', () => {
  assert.equal(statusFromPlanFile('# Plan\nStatut : accepté avec réserves le 3 octobre 2026.'), 'accepted-with-reservations');
  assert.equal(statusFromPlanFile('# Plan\nStatut : à réaliser.'), 'planned');
});

test('an unreadable status is refused rather than presented as progress', () => {
  assert.throws(() => statusFromPlanFile('# Plan\nStatut : en réflexion.'), /Unrecognized plan status/);
});

test('the first plan that is not accepted is presented as next, later ones as planned', () => {
  assert.deepEqual(roadmap.map(publicStatus), [
    'Accepted with reservations', 'Next', 'Planned', 'Planned', 'Planned', 'Planned', 'Planned', 'Planned', 'Planned',
  ]);
});
