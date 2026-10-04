import { PublicError } from '../privacy.ts';

export type ProviderId = 'openai' | 'anthropic';

// What each provider documents for strict structured outputs (reviewed 2026-10-04; see docs/providers/*.md).
// The schema sent on the wire only constrains shape. The local Zod schema keeps enforcing every value bound after
// receipt, so dropping a keyword here never loosens what Boardroom accepts.
const structural = new Set(['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'anyOf', 'description', 'title', '$defs', '$ref']);
const bounds: Record<ProviderId, ReadonlySet<string>> = {
  // pattern, format and string lengths are left out: the regex dialect OpenAI compiles is not specified for our patterns.
  openai: new Set(['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minItems', 'maxItems']),
  // Numerical constraints, string constraints and array bounds other than minItems 0/1 answer HTTP 400.
  anthropic: new Set(['minItems']),
};
const limits = { depth: 5, properties: 100, unions: 16 } as const;

function adapt(node: unknown, provider: ProviderId): unknown {
  if (Array.isArray(node)) return node.map(child => adapt(child, provider));
  if (!node || typeof node !== 'object') return node;
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'properties' || key === '$defs') {
      kept[key] = Object.fromEntries(Object.entries(value as object).map(([name, child]) => [name, adapt(child, provider)]));
    } else if (key === 'const') kept.enum = [value];
    else if (key === 'enum' || key === 'required') kept[key] = value;
    else if (key === 'minItems') { if (bounds[provider].has(key) && (provider === 'openai' || value === 0 || value === 1)) kept[key] = value; }
    else if (key === 'additionalProperties') kept[key] = typeof value === 'object' ? adapt(value, provider) : value;
    else if (structural.has(key) || bounds[provider].has(key)) kept[key] = adapt(value, provider);
  }
  return kept;
}

function audit(node: any, depth: number, totals: { properties: number; unions: number; deepest: number }, problems: string[], path: string) {
  if (!node || typeof node !== 'object') return;
  totals.deepest = Math.max(totals.deepest, depth);
  if (node.properties) {
    const names = Object.keys(node.properties);
    totals.properties += names.length;
    if (node.additionalProperties !== false) problems.push(`${path}: objects must set additionalProperties to false`);
    for (const name of names.filter(item => !(node.required ?? []).includes(item))) problems.push(`${path}.${name}: every property must be required`);
    for (const [name, child] of Object.entries(node.properties)) audit(child, depth + 1, totals, problems, `${path}.${name}`);
  }
  if (node.items) audit(node.items, depth, totals, problems, `${path}[]`);
  if (node.anyOf) { totals.unions++; node.anyOf.forEach((child: unknown, i: number) => audit(child, depth, totals, problems, `${path}|${i}`)); }
}

/** The JSON Schema a provider is sent for one phase's Zod schema: its documented subset, closed and fully required. */
export function providerSchema(providerId: string, schema: Record<string, unknown>): Record<string, unknown> {
  if (providerId !== 'openai' && providerId !== 'anthropic') throw new PublicError('No structured-output contract for this provider.');
  const wire = adapt(schema, providerId) as Record<string, any>;
  const problems: string[] = [], totals = { properties: 0, unions: 0, deepest: 0 };
  if (wire.type !== 'object') problems.push('root: structured output must be an object');
  audit(wire, 1, totals, problems, 'root');
  if (totals.deepest > limits.depth) problems.push(`nesting depth ${totals.deepest} exceeds ${limits.depth}`);
  if (totals.properties > limits.properties) problems.push(`${totals.properties} properties exceed ${limits.properties}`);
  if (totals.unions > limits.unions) problems.push(`${totals.unions} unions exceed ${limits.unions}`);
  if (problems.length) throw new PublicError(`Phase schema violates the ${providerId} structured-output contract: ${problems.join('; ')}.`);
  return wire;
}
