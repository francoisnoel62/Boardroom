import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { FinalViewBodySchema } from '../src/decision-domain.ts';
import { checksFor, preflightChecks } from '../src/providers/preflight.ts';
import { providerSchema } from '../src/providers/schema.ts';
import { liveSetup } from './support/live.ts';

// Independent expectation, written from the providers' documentation (reviewed 2026-10-04), not from the adapter:
// Anthropic structured outputs reject numerical constraints, string constraints and array bounds beyond minItems 0/1,
// and answer HTTP 400; OpenAI strict mode takes pattern/format/number/array bounds but not string lengths.
const unsupported = {
  anthropic: ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength', 'maxItems', 'pattern', 'format'],
  openai: ['minLength', 'maxLength', 'pattern', 'format'],
} as const;

/** Schema keywords only: names under `properties` are data, not keywords. */
function keywords(node: any, found = new Map<string, unknown[]>()) {
  if (Array.isArray(node)) { node.forEach(child => keywords(child, found)); return found; }
  if (!node || typeof node !== 'object') return found;
  for (const [key, value] of Object.entries(node)) {
    (found.get(key) ?? found.set(key, []).get(key)!).push(value);
    if (key === 'properties') Object.values(value as object).forEach(child => keywords(child, found));
    else if (key !== 'enum' && key !== 'required') keywords(value, found);
  }
  return found;
}
function closedObjects(node: any, path = 'root'): string[] {
  if (Array.isArray(node)) return node.flatMap((child, i) => closedObjects(child, `${path}[${i}]`));
  if (!node || typeof node !== 'object') return [];
  const problems: string[] = [];
  if (node.properties) {
    if (node.additionalProperties !== false) problems.push(`${path}: additionalProperties is not false`);
    const missing = Object.keys(node.properties).filter(name => !(node.required ?? []).includes(name));
    if (missing.length) problems.push(`${path}: optional properties ${missing}`);
    for (const [name, child] of Object.entries(node.properties)) problems.push(...closedObjects(child, `${path}.${name}`));
  }
  for (const key of ['items', 'anyOf']) if (node[key]) problems.push(...closedObjects(node[key], `${path}.${key}`));
  return problems;
}

test('every phase schema that goes on the wire stays inside its provider\'s documented structured-output subset', async t => {
  const { app, store, project, meeting, wires } = await liveSetup(t);
  await app.analyseMeeting(project.id, meeting.id, store);
  const debate = await app.debateMeeting(project.id, meeting.id, store);
  await app.collectFinalViews(project.id, meeting.id, debate.proposals.at(-1).version, store);
  assert.deepEqual([...new Set(wires.map(wire => wire.phase))].sort(), ['analysis', 'confrontation', 'framing', 'proposal', 'revision', 'views']);
  assert.deepEqual([...new Set(wires.map(wire => wire.providerId))].sort(), ['anthropic', 'openai']);
  for (const { phase, providerId, schema } of wires) {
    const used = keywords(schema);
    for (const name of unsupported[providerId]) assert.equal(used.has(name), false, `${providerId} ${phase}: ${name} is not supported by the provider`);
    if (providerId === 'anthropic') for (const bound of used.get('minItems') ?? []) assert.ok(bound === 0 || bound === 1, `${phase}: minItems ${bound}`);
    assert.equal(used.has('const'), false, `${providerId} ${phase}: const is sent as a one-value enum`);
    assert.deepEqual(closedObjects(schema), [], `${providerId} ${phase}`);
  }
});

const deepFreeze = <T>(value: T): T => { if (value && typeof value === 'object') Object.values(value).forEach(deepFreeze); return Object.freeze(value); };
const view = { proposalVersion: 1, proposalSha256: '0'.repeat(64), verdict: 'APPROVED', confidence: 70, justification: 'j', criticalUncertainty: 'u', conditions: [], references: [] };

test('adaptation is explicit per provider, leaves its input alone and never loosens the local schema', () => {
  const json = z.toJSONSchema(FinalViewBodySchema) as Record<string, any>;
  const frozen = deepFreeze(structuredClone(json));
  const openai = providerSchema('openai', frozen) as any, anthropic = providerSchema('anthropic', frozen) as any;
  assert.equal(openai.properties.proposalVersion.exclusiveMinimum, 0, 'OpenAI documents number bounds, so they are kept');
  assert.equal('exclusiveMinimum' in anthropic.properties.proposalVersion, false, 'Anthropic answers 400 on numerical constraints');
  assert.equal('pattern' in openai.properties.proposalSha256, false);
  assert.equal(FinalViewBodySchema.safeParse(view).success, true);
  assert.equal(FinalViewBodySchema.safeParse({ ...view, confidence: 101 }).success, false);
  assert.equal(FinalViewBodySchema.safeParse({ ...view, proposalVersion: 0 }).success, false);
  assert.equal(FinalViewBodySchema.safeParse({ ...view, proposalSha256: 'not-a-hash' }).success, false);
});

test('property names that look like keywords survive, and a literal is sent as a one-value enum', () => {
  const wire = providerSchema('anthropic', { type: 'object', additionalProperties: false, required: ['format', 'pattern', 'minimum', 'ok'],
    properties: { format: { type: 'string' }, pattern: { type: 'string', pattern: '^a$' }, minimum: { type: 'integer', minimum: 0 }, ok: { type: 'boolean', const: true } } }) as any;
  assert.deepEqual(Object.keys(wire.properties), ['format', 'pattern', 'minimum', 'ok']);
  assert.deepEqual(wire.properties.pattern, { type: 'string' }); assert.deepEqual(wire.properties.minimum, { type: 'integer' });
  assert.deepEqual(wire.properties.ok, { type: 'boolean', enum: [true] });
});

test('a schema outside the contract is refused before any request is built', () => {
  const base = { type: 'object', additionalProperties: false, required: ['a'], properties: { a: { type: 'string' } } };
  assert.throws(() => providerSchema('openai', { ...base, required: [] }), /every property must be required/);
  assert.throws(() => providerSchema('openai', { ...base, additionalProperties: true }), /additionalProperties/);
  assert.throws(() => providerSchema('openai', { type: 'array', items: { type: 'string' } }), /must be an object/);
  assert.throws(() => providerSchema('someone-else', base), /No structured-output contract/);
  let nested: any = { type: 'string' };
  for (let i = 0; i < 5; i++) nested = { type: 'object', additionalProperties: false, required: ['n'], properties: { n: nested } };
  assert.throws(() => providerSchema('anthropic', nested), /nesting depth 6/);
});

test('preflight covers every phase schema for both providers, with synthetic instances the local schemas accept', () => {
  assert.deepEqual(preflightChecks.map(check => check.name), ['framing', 'analysis', 'proposal', 'confrontation', 'revision', 'final-view']);
  for (const check of preflightChecks) {
    assert.equal(check.schema.safeParse(check.instance).success, true, `${check.name}: the synthetic instance must satisfy its own schema`);
    for (const provider of ['openai', 'anthropic']) assert.doesNotThrow(() => providerSchema(provider, z.toJSONSchema(check.schema) as Record<string, unknown>), `${provider} ${check.name}`);
  }
  assert.deepEqual(checksFor(true).map(check => check.name), ['framing', 'analysis', 'proposal', 'revision', 'final-view']);
  assert.deepEqual(checksFor(false).map(check => check.name), ['analysis', 'confrontation', 'final-view']);
});

test('every schema a live phase sends to a provider is one the preflight checks', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const checked = new Set(['FramingBodySchema', 'AnalysisBodySchema', 'ProposalBodySchema', 'ConfrontationBodySchema', 'RevisionBodySchema', 'FinalViewBodySchema']);
  const used = new Set<string>();
  for (const file of readdirSync('src').filter(name => /^live-.*\.ts$/.test(name))) {
    for (const match of readFileSync(`src/${file}`, 'utf8').matchAll(/schema: (\w+)/g)) used.add(match[1]!);
  }
  assert.ok(used.size >= 6, 'the scan must find the phase schemas');
  assert.deepEqual([...used].filter(name => !checked.has(name)), [], 'a new phase schema must be added to the preflight checks');
});
