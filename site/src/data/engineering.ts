// Engineering figures shown on the site, derived from the repository at build time.

/** Counts top-level `test(...)` declarations, the unit Node's test runner reports as "tests". */
export function countTests(sources: string[]): number {
  return sources.reduce((total, source) => total + (source.match(/^test\(/gm)?.length ?? 0), 0);
}

const runners: Record<string, string> = {
  'windows-latest': 'Windows',
  'ubuntu-latest': 'Linux',
  'macos-14': 'macOS',
};

/** Reads the `os`/`arch` pairs of a GitHub Actions matrix into display names, in order of appearance. */
export function platformsFromWorkflow(yaml: string): string[] {
  const platforms = [...yaml.matchAll(/- os: (\S+)\s+arch: (\S+)/g)].map(([, os, arch]) => {
    const name = runners[os!];
    if (!name) throw new Error(`Unknown runner "${os}" in the CI matrix.`);
    return `${name} ${arch}`;
  });
  return [...new Set(platforms)];
}

export interface EngineeringNote {
  title: string;
  text: string;
  evidence: string[];
}

/** Choices a reviewer can check against the repository, each with its tradeoff. */
export const decisions: Array<EngineeringNote & { tradeoff: string }> = [
  {
    title: 'A bundled Node runtime, not a single binary',
    text: 'The official LangGraph SQLite checkpointer depends on better-sqlite3 12, whose native code targets Node’s V8 interfaces. Each package therefore ships its own pinned Node 24.12.0 and prepared native modules, so users install nothing.',
    tradeoff: 'Larger packages built per platform, instead of an unproven compile step.',
    evidence: ['boardroom-plans/BOARDROOM_V1_SPEC.md', 'docs/architecture.md'],
  },
  {
    title: 'Exports that never pretend to be atomic',
    text: 'An export records its intent and planned paths before writing anything, claims a single attempt, then stores a receipt with the hash of every file written. A process killed mid-way leaves an unconfirmed operation that is never replayed automatically.',
    tradeoff: 'Uncertain outcomes ask for inspection rather than silently retrying.',
    evidence: ['docs/architecture.md', 'tests/journal.test.ts'],
  },
  {
    title: 'Citations that cannot drift',
    text: 'Original bytes and extracted text are saved under their SHA-256. Citations point to text lines, physical PDF pages or saved DOCX blocks, and a missing or altered snapshot is refused instead of being replaced.',
    tradeoff: 'DOCX blocks are not Word page numbers, and scanned PDFs need OCR that is not offered.',
    evidence: ['docs/architecture.md', 'tests/document-evidence.test.ts'],
  },
  {
    title: 'Real terminals in the test suite',
    text: 'Terminal tests drive the actual CLI in OS pseudoterminals and read a headless VT screen: three window sizes, accents, emoji, multiline paste, and Escape or Ctrl+C exiting with code 130 and restoring the terminal.',
    tradeoff: 'A pinned beta of node-pty, chosen after the stable release kept Windows workers alive.',
    evidence: ['docs/architecture.md', 'tests/terminal.test.ts'],
  },
  {
    title: 'Installation proven on clean machines',
    text: 'CI builds a package on each platform, then installs it on a separate machine with Node removed — and, on Linux, an offline image with no Node at all — into a path with spaces and accents.',
    tradeoff: 'Qualifies three platforms only; other architectures are not implied.',
    evidence: ['docs/installation-qualification.md', '.github/workflows/ci.yml'],
  },
  {
    title: 'Tests first, with the evidence kept',
    text: 'Each behaviour starts from a failing test at a public boundary — service, CLI or installed package — and the observed red and green results are recorded alongside the code.',
    tradeoff: 'Some integrity guards gained characterization tests during acceptance review; the record says so.',
    evidence: ['docs/plan-01-progress.md', 'docs/plan-01-acceptance.md'],
  },
];

/** Reservations and gaps stated by the acceptance evidence. */
export const limits: EngineeringNote[] = [
  {
    title: 'No live model call yet',
    text: 'Provider streaming and cloud traces were blocked without authorized accounts. The first real meeting is Plan 02.',
    evidence: ['docs/plan-01-acceptance.md'],
  },
  {
    title: 'No tool isolation demonstrated',
    text: 'Isolation candidates were measured, none demonstrated protection, so commands and MCP servers stay unavailable.',
    evidence: ['docs/plan-01-acceptance.md', 'docs/technical-qualification.md'],
  },
  {
    title: 'Semantic retrieval not attempted',
    text: 'No embedding runtime or model assets are packaged; lexical search is the only retrieval checked.',
    evidence: ['docs/plan-01-acceptance.md'],
  },
  {
    title: 'Input tested against a fictional stream',
    text: 'Typing during output was proven against a 200 ms fictional tick, not a long provider transcript.',
    evidence: ['docs/plan-01-acceptance.md'],
  },
  {
    title: 'Release engineering still ahead',
    text: 'Signed installers, production dependency pruning and reproducible release builds remain to be done.',
    evidence: ['docs/architecture.md'],
  },
];
