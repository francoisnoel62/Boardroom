import { PublicError } from './privacy.ts';
import { tokenCost, type Reserves } from './call-domain.ts';
import { supportedModel } from './providers/catalog.ts';
import type { FrozenTeam } from './routes.ts';

/** Output cap and time limit of every kind of call. The phases and the reserves read the same figures. */
export const phaseBounds = {
  preflight: { maxOutputTokens: 1024, maxDurationMs: 30_000 },
  framing: { maxOutputTokens: 4096, maxDurationMs: 60_000 },
  'framing-correction': { maxOutputTokens: 4096, maxDurationMs: 60_000 },
  analysis: { maxOutputTokens: 4096, maxDurationMs: 60_000 },
  confrontation: { maxOutputTokens: 4096, maxDurationMs: 60_000 },
  revision: { maxOutputTokens: 4096, maxDurationMs: 60_000 },
  conclusion: { maxOutputTokens: 2048, maxDurationMs: 30_000 },
} as const;
export type BoundedPhase = keyof typeof phaseBounds;

export function phaseLimits(phase: BoundedPhase, route: { providerId: string; modelId: string }) {
  return { maxInputTokens: supportedModel(route.providerId, route.modelId).context, ...phaseBounds[phase] };
}

export interface ReserveRequirement {
  reserves: Reserves;
  /** Money held back from ordinary work. */
  totalMicros: number;
  /** The smallest ceiling that protects the reserves and still admits the largest concurrent batch of work. */
  minimumCeilingMicros: number;
  minimumDurationMs: number;
}

type Team = Pick<FrozenTeam, 'advisers' | 'proposalAuthorId' | 'routes'>;

/**
 * What a team's meeting must keep protected, from its own routes and the bounds above:
 * - conclusion: one final view per adviser. A correction is funded from the same pool once the failed attempt's cost is
 *   known; if that cost is unknown its reservation stays committed, the correction is refused and the view stays missing;
 * - revision: a proposal and one revision by the proposal author, with the same correction rule.
 * Undefined when a route is outside the catalog: such a route cannot reach a provider, so its reserves stay the caller's.
 */
export function reserveRequirement(team: Team): ReserveRequirement | undefined {
  try {
    const cost = (adviserId: string, phase: BoundedPhase) => {
      const route = team.routes.find(candidate => candidate.id === team.advisers.find(adviser => adviser.id === adviserId)?.routeId);
      if (!route?.pricing) throw new PublicError('A dated pricing bound is required.');
      const limits = phaseLimits(phase, route);
      return tokenCost(route.pricing, limits.maxInputTokens, limits.maxOutputTokens);
    };
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    const everyone = team.advisers.map(adviser => adviser.id), reviewers = everyone.filter(id => id !== team.proposalAuthorId);
    const revisionMicros = 2 * cost(team.proposalAuthorId, 'revision'), conclusionMicros = sum(everyone.map(id => cost(id, 'conclusion')));
    const reserves = { revisionMicros, conclusionMicros, revisionMs: 2 * phaseBounds.revision.maxDurationMs,
      conclusionMs: everyone.length * phaseBounds.conclusion.maxDurationMs };
    const peakMicros = Math.max(cost(team.proposalAuthorId, 'framing'), sum(everyone.map(id => cost(id, 'analysis'))), sum(reviewers.map(id => cost(id, 'confrontation'))));
    const peakMs = Math.max(phaseBounds.framing.maxDurationMs, everyone.length * phaseBounds.analysis.maxDurationMs, reviewers.length * phaseBounds.confrontation.maxDurationMs);
    return { reserves, totalMicros: revisionMicros + conclusionMicros, minimumCeilingMicros: revisionMicros + conclusionMicros + peakMicros,
      minimumDurationMs: reserves.revisionMs + reserves.conclusionMs + peakMs };
  } catch (error) { if (error instanceof PublicError) return undefined; throw error; }
}

/** Refuse, with the figures, a ceiling or duration that cannot hold the protected reserves and the largest batch. */
export function assertFundable(requirement: ReserveRequirement, ceiling: { amount: number; currency: string }, durationTargetSeconds: number) {
  const ceilingMicros = Math.round(ceiling.amount * 1e6);
  if (ceiling.currency === 'USD' && ceilingMicros < requirement.minimumCeilingMicros) {
    const needed = (Math.ceil(requirement.minimumCeilingMicros / 10_000) / 100).toFixed(2);
    throw new PublicError(`Budget refused before any request: at least ${needed} USD is needed, ceiling is ${ceiling.amount} USD (protected reserves plus the largest batch; calls reserve whole context windows, far above the expected charge).`);
  }
  if (durationTargetSeconds * 1000 < requirement.minimumDurationMs) {
    throw new PublicError(`Duration refused before any request: at least ${Math.ceil(requirement.minimumDurationMs / 1000)} s is needed, target is ${durationTargetSeconds} s (protected reserves plus the largest batch).`);
  }
}
