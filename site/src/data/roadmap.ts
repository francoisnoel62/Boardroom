// Public view of the nine delivery plans. Tests compare each status with the
// "Statut" line of its plan file, so the site cannot announce unaccepted progress.

export type PlanStatus = 'accepted' | 'accepted-with-reservations' | 'planned';

export interface RoadmapPlan {
  id: string;
  title: string;
  outcome: string;
  status: PlanStatus;
}

export const roadmap: RoadmapPlan[] = [
  { id: '01', title: 'Installable local journey', outcome: 'Install, explore the recorded example, inspect sources and export a plan.', status: 'accepted-with-reservations' },
  { id: '02', title: 'First real decision', outcome: 'Three distinct models from two providers produce an argued plan.', status: 'planned' },
  { id: '03', title: 'Human participation', outcome: 'Intervene, change the context, pause and ask for a conclusion.', status: 'planned' },
  { id: '04', title: 'Recovery and incidents', outcome: 'Resume interrupted meetings without replaying completed actions.', status: 'planned' },
  { id: '05', title: 'Knowledge and memory', outcome: 'Work on your documents and reuse retained decisions.', status: 'planned' },
  { id: '06', title: 'Protected investigations', outcome: 'Grant narrow research and actions with originals preserved.', status: 'planned' },
  { id: '07', title: 'First use and connections', outcome: 'Go from the example to your own models without help.', status: 'planned' },
  { id: '08', title: 'Optional observability', outcome: 'Diagnose latency, usage and incidents locally or in your own Langfuse.', status: 'planned' },
  { id: '09', title: 'Public beta', outcome: 'A reproducible, documented release for Windows, macOS and Linux.', status: 'planned' },
];

export function statusFromPlanFile(markdown: string): PlanStatus {
  const line = /^Statut : (.+)$/m.exec(markdown)?.[1] ?? '';
  if (line.startsWith('accepté avec réserves')) return 'accepted-with-reservations';
  if (line.startsWith('accepté')) return 'accepted';
  if (line.startsWith('à réaliser')) return 'planned';
  throw new Error(`Unrecognized plan status "${line}".`);
}

export function publicStatus(plan: RoadmapPlan, index: number, plans: RoadmapPlan[]): string {
  if (plan.status === 'accepted') return 'Accepted';
  if (plan.status === 'accepted-with-reservations') return 'Accepted with reservations';
  return plans.findIndex(candidate => candidate.status === 'planned') === index ? 'Next' : 'Planned';
}
