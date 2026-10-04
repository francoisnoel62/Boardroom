// Every public statement about what BOARDROOM does is registered here with its evidence.
// Tests refuse an available claim without an existing proof and a planned claim without its plan.

// A vision is a stated product direction that no delivery plan schedules yet.
export type ClaimStatus = 'available' | 'preview' | 'planned' | 'vision';

export interface Claim {
  id: string;
  text: string;
  status: ClaimStatus;
  evidence: string[];
  plan?: string;
}

export const claims: Claim[] = [
  {
    id: 'three-platforms',
    text: 'Qualified on macOS (Apple silicon), Windows x64 and Linux x64',
    status: 'available',
    evidence: ['docs/installation-qualification.md', '.github/workflows/ci.yml'],
  },
  {
    id: 'no-node-required',
    text: 'Runs with its own bundled runtime — no Node.js installation required',
    status: 'available',
    evidence: ['docs/installation-qualification.md'],
  },
  {
    id: 'example-without-account',
    text: 'The recorded example needs no account, API key or model download',
    status: 'available',
    evidence: ['docs/getting-started.md', 'docs/plan-01-acceptance.md'],
  },
  {
    id: 'exact-citations',
    text: 'Citations resolve to the exact saved revision of a text, PDF or DOCX source',
    status: 'available',
    evidence: ['docs/architecture.md', 'docs/plan-01-acceptance.md'],
  },
  {
    id: 'separate-exports',
    text: 'Every export writes a new plan and decision memo; originals stay untouched',
    status: 'available',
    evidence: ['docs/plan-01-acceptance.md', 'docs/validation/recorded-export/memo.md'],
  },
  {
    id: 'no-telemetry',
    text: 'No BOARDROOM account, hosted backend or cloud telemetry',
    status: 'available',
    evidence: ['boardroom-plans/BOARDROOM_V1_SPEC.md', 'docs/getting-started.md'],
  },
  {
    id: 'live-meetings',
    text: 'Live workflow implemented for three distinct models from two providers; real-account qualification pending',
    status: 'preview',
    evidence: ['docs/plan-02-acceptance.md', 'docs/live-quickstart.md'],
    plan: '02',
  },
  {
    id: 'human-interventions',
    text: 'Intervene, add context, pause or ask for a conclusion during a meeting',
    status: 'planned',
    evidence: [],
    plan: '03',
  },
  {
    id: 'open-source-license',
    text: 'Open source under the Apache License 2.0',
    status: 'available',
    evidence: ['LICENSE', 'package.json'],
  },
  {
    id: 'configurable-room',
    text: 'Choose the size, roles and models of your advisory team',
    status: 'vision',
    evidence: ['docs/contributing.md', 'README.md'],
  },
];

export function getClaim(id: string): Claim {
  const claim = claims.find(candidate => candidate.id === id);
  if (!claim) throw new Error(`Unknown claim "${id}".`);
  return claim;
}
