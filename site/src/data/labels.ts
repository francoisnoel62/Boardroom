import type { ClaimStatus } from './claims.ts';
import type { Phase, Verdict } from './story.ts';

export function statusLabel(status: ClaimStatus, plan?: string): string {
  switch (status) {
    case 'available': return 'Available';
    case 'preview': return 'Preview';
    case 'planned': return `Planned · Plan ${plan}`;
    case 'vision': return 'Vision · not yet scheduled';
  }
}

export const verdictLabel: Record<Verdict, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
};

export const phaseLabel: Record<Phase, string> = {
  proposal: 'Proposal',
  objection: 'Objection',
  revision: 'Revision',
  'final-views': 'Final views',
};

export const repository = 'https://github.com/francoisnoel62/Boardroom';
export const sourceUrl = (path: string) => `${repository}/blob/main/${path}`;
