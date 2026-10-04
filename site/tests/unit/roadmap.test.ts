import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { acceptedOnFromPlanFile, milestones, planFileName, publicStatus, roadmap, statusFromPlanFile } from '../../src/data/roadmap.ts';

const plans = resolve(import.meta.dirname, '../../../boardroom-plans');
// Each plan names its own file: a companion document may share the plan's number prefix.
const planFile = (id: string) => {
  const name = planFileName(id);
  assert.ok(readdirSync(plans).includes(name), `plan ${id} has no file`);
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

test('each plan links to its own plan file', () => {
  for (const plan of roadmap) assert.ok(existsSync(resolve(plans, planFileName(plan.id))), `plan ${plan.id}`);
});

test('an acceptance date is read from the plan status line', () => {
  assert.equal(acceptedOnFromPlanFile('Statut : accepté avec réserves le 3 octobre 2026 ; parcours.'), '2026-10-03');
  assert.equal(acceptedOnFromPlanFile('Statut : accepté le 21 janvier 2027.'), '2027-01-21');
  assert.equal(acceptedOnFromPlanFile('Statut : à réaliser.'), undefined);
});

test('milestones are the accepted plans, dated and backed by their acceptance record', () => {
  const repo = resolve(plans, '..');
  const accepted = roadmap.filter(plan => plan.status !== 'planned');
  assert.deepEqual(milestones.map(item => item.id), accepted.map(plan => plan.id));
  for (const item of milestones) {
    assert.equal(item.acceptedOn, acceptedOnFromPlanFile(planFile(item.id)), `plan ${item.id} date`);
    assert.ok(item.evidence && existsSync(resolve(repo, item.evidence)), `plan ${item.id} acceptance record`);
  }
});
