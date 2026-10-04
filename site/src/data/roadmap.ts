// Public view of the nine delivery plans. Tests compare each status with the
// "Statut" line of its plan file, so the site cannot announce unaccepted progress.

export type PlanStatus = 'accepted' | 'accepted-with-reservations' | 'planned';

export interface RoadmapPlan {
  id: string;
  title: string;
  outcome: string;
  status: PlanStatus;
  /** File name in boardroom-plans/ (French, like all design documents). */
  file: string;
  /** For accepted plans: the acceptance date from the plan status line, and its acceptance record. */
  acceptedOn?: string;
  evidence?: string;
}

export const roadmap: RoadmapPlan[] = [
  { id: '01', title: 'Installable local journey', outcome: 'Install, explore the recorded example, inspect sources and export a plan.', status: 'accepted-with-reservations', file: '01-PARCOURS-LOCAL-INSTALLABLE.md', acceptedOn: '2026-10-03', evidence: 'docs/plan-01-acceptance.md' },
  { id: '02', title: 'First real decision', outcome: 'Live workflow implemented; acceptance still requires the real three-model, two-provider campaign.', status: 'planned', file: '02-PREMIERE-DECISION-REELLE.md' },
  { id: '03', title: 'Human participation', outcome: 'Intervene, change the context, pause and ask for a conclusion.', status: 'planned', file: '03-PARTICIPATION-HUMAINE.md' },
  { id: '04', title: 'Recovery and incidents', outcome: 'Resume interrupted meetings without replaying completed actions.', status: 'planned', file: '04-REPRISE-ET-INCIDENTS.md' },
  { id: '05', title: 'Knowledge and memory', outcome: 'Work on your documents and reuse retained decisions.', status: 'planned', file: '05-CONNAISSANCE-ET-MEMOIRE.md' },
  { id: '06', title: 'Protected investigations', outcome: 'Grant narrow research and actions with originals preserved.', status: 'planned', file: '06-INVESTIGATIONS-ET-OUTILS-PROTEGES.md' },
  { id: '07', title: 'First use and connections', outcome: 'Go from the example to your own models without help.', status: 'planned', file: '07-PREMIERE-UTILISATION-ET-CONNEXIONS.md' },
  { id: '08', title: 'Optional observability', outcome: 'Diagnose latency, usage and incidents locally or in your own Langfuse.', status: 'planned', file: '08-OBSERVABILITE-FACULTATIVE.md' },
  { id: '09', title: 'Public beta', outcome: 'A reproducible, documented release for Windows, macOS and Linux.', status: 'planned', file: '09-BETA-PUBLIQUE.md' },
];

export function statusFromPlanFile(markdown: string): PlanStatus {
  const line = /^Statut : (.+)$/m.exec(markdown)?.[1] ?? '';
  if (line.startsWith('accepté avec réserves')) return 'accepted-with-reservations';
  if (line.startsWith('accepté')) return 'accepted';
  if (line.startsWith('à réaliser')) return 'planned';
  throw new Error(`Unrecognized plan status "${line}".`);
}

export const planFileName = (id: string) => {
  const plan = roadmap.find(candidate => candidate.id === id);
  if (!plan) throw new Error(`Unknown plan "${id}".`);
  return plan.file;
};

/** Accepted plans, oldest first: the product milestones reached so far. */
export const milestones = roadmap.filter(plan => plan.status !== 'planned');

const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function acceptedOnFromPlanFile(markdown: string): string | undefined {
  const match = /^Statut : accepté(?: avec réserves)? le (\d{1,2}) (\p{L}+) (\d{4})/mu.exec(markdown);
  if (!match) return undefined;
  const month = months.indexOf(match[2]!) + 1;
  if (month === 0) throw new Error(`Unrecognized month "${match[2]}".`);
  return `${match[3]}-${String(month).padStart(2, '0')}-${match[1]!.padStart(2, '0')}`;
}

export function publicStatus(plan: RoadmapPlan, index: number, plans: RoadmapPlan[]): string {
  if (plan.status === 'accepted') return 'Accepted';
  if (plan.status === 'accepted-with-reservations') return 'Accepted with reservations';
  return plans.findIndex(candidate => candidate.status === 'planned') === index ? 'Next' : 'Planned';
}
