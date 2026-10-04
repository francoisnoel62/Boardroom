// The CLI reference is derived from the CLI's own source: the help text it prints,
// the commands it accepts and the exit codes it sets.

export interface UsageEntry {
  command: string;
  synopsis: string;
  description: string;
}

export function parseHelp(source: string) {
  const text = /const help = `([\s\S]*?)`;/.exec(source)?.[1]?.replace(/\r\n?/g, '\n');
  if (!text) throw new Error('The CLI help text was not found in src/cli.ts.');
  const lines = text.split('\n');
  const start = lines.indexOf('Usage:');
  if (start < 0) throw new Error('The CLI help text has no Usage section.');
  const usage: UsageEntry[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) break;
    const [synopsis, description] = line.trim().split(/\s{2,}/) as [string, string | undefined];
    const command = synopsis.split(' ')[1];
    if (!command || !description) throw new Error(`Unreadable help line "${line}".`);
    usage.push({ command, synopsis, description });
  }
  const options = (/^Options: (.+)$/m.exec(text)?.[1] ?? '').split(', ');
  const status = lines.slice(1, start).filter(line => line.trim());
  return { title: lines[0]!, status, usage, options };
}

export function handledCommands(source: string) {
  const listed = /\[((?:'[a-z-]+',?\s*)+)\]\.includes\(command\)/.exec(source)?.[1];
  if (!listed) throw new Error('The list of accepted commands was not found in src/cli.ts.');
  const names = (list: string) => [...list.matchAll(/'([a-z-]+)'/g)].map(match => match[1]!);
  const compared = [...source.matchAll(/command === '([a-z-]+)'/g)].map(match => match[1]!);
  // A handler is a comparison, a group of commands sharing one branch, or a branch on a command-name prefix.
  // A list that only validates arguments (`if ([...].includes(command) && ...)`) is not a handler.
  const grouped = [...source.matchAll(/else if \(\[((?:'[a-z-]+',?\s*)+)\]\.includes\(command\)\)/g)].flatMap(match => names(match[1]!));
  const prefixes = [...source.matchAll(/else if \(command\.startsWith\('([a-z-]+)'\)\)/g)].map(match => match[1]!);
  const accepted = [...new Set([...names(listed), ...compared])];
  const handled = new Set([...compared, ...grouped]);
  const withoutHandler = accepted.filter(command => !handled.has(command) && !prefixes.some(prefix => command.startsWith(prefix)));
  return { accepted, withoutHandler };
}

export function exitCodesIn(sources: string[]): number[] {
  const codes = sources.flatMap(source => [...source.matchAll(/process\.exitCode = (\d+)/g)].map(match => Number(match[1])));
  return [...new Set(codes)].sort((a, b) => a - b);
}

export const documentedExitCodes = [
  { code: 0, meaning: 'The command completed.' },
  { code: 1, meaning: 'The command failed and printed the reason prefixed with “BOARDROOM:”, or a doctor probe did not verify.' },
  { code: 2, meaning: 'Document extraction, provider preflight or a live phase did not complete successfully. Inspect its structured result, warnings and receipts.' },
  { code: 130, meaning: 'terminal-check or the live terminal was cancelled with Escape or Ctrl+C; terminal modes are restored. Live cancellation attempts a partial export and retains uncertain costs.' },
];

export interface SchemaRow {
  path: string;
  type: string;
  required: boolean;
}

type JsonSchema = {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  format?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
};

function typeOf(schema: JsonSchema): string {
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map(value => JSON.stringify(value)).join(' | ');
  const variants = schema.anyOf ?? schema.oneOf;
  if (variants) return variants.map(typeOf).join(' | ');
  const type = Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type ?? 'any';
  return schema.format ? `${type} (${schema.format})` : type;
}

/** Flattens a JSON Schema object into one row per field, depth first. */
export function schemaRows(schema: JsonSchema, prefix = ''): SchemaRow[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).flatMap(([name, field]) => {
    const path = `${prefix}${name}`;
    const row = { path, type: field.items ? 'array' : field.properties ? 'object' : typeOf(field), required: required.has(name) };
    const items = field.items;
    const variants = items?.anyOf ?? items?.oneOf;
    const nested = field.properties ? schemaRows(field, `${path}.`)
      : items?.properties ? schemaRows(items, `${path}[].`)
      : variants ? variants.flatMap(variant => {
        const kind = variant.properties?.type?.const;
        return schemaRows(variant, kind === undefined ? `${path}[].` : `${path}[type=${JSON.stringify(kind)}].`)
          .filter(nestedRow => !nestedRow.path.endsWith('].type'));
      })
      : [];
    return [row, ...nested];
  });
}
