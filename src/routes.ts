import { z } from 'zod';
import { PublicError } from './privacy.ts';

// Stable identifiers are metadata, never arbitrary request URLs or credentials.
export const RouteIdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/);
export const RouteInputSchema = z.strictObject({
  id: RouteIdSchema, providerId: RouteIdSchema, modelId: RouteIdSchema,
  capabilities: z.strictObject({
    streaming: z.boolean(), structuredOutput: z.enum(['none', 'json', 'json-schema']),
    tools: z.boolean(), cancellation: z.enum(['none', 'best-effort']), usage: z.enum(['none', 'tokens']),
  }),
  limitations: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
});
export const ProviderRouteSchema = RouteInputSchema.extend({
  revision: z.number().int().positive(), verification: z.literal('unverified'), credentialRef: z.uuid(),
});
export type RouteInput = z.input<typeof RouteInputSchema>;
export type ProviderRoute = z.infer<typeof ProviderRouteSchema>;

export const TeamInputSchema = z.strictObject({
  id: RouteIdSchema, proposalAuthorId: RouteIdSchema,
  advisers: z.array(z.strictObject({ id: RouteIdSchema,
    role: z.enum(['Product Owner', 'Lead Developer', 'Marketing Manager']), routeId: RouteIdSchema })).length(3),
}).refine(team => new Set(team.advisers.map(adviser => adviser.id)).size === 3
  && new Set(team.advisers.map(adviser => adviser.role)).size === 3
  && team.advisers.some(adviser => adviser.id === team.proposalAuthorId && adviser.role === 'Product Owner'),
'Plan 02 requires three distinct advisers and roles, with the Product Owner as proposal author.');
export const TeamSchema = TeamInputSchema.extend({ revision: z.number().int().positive() });
export const FrozenTeamSchema = TeamSchema.extend({ routes: z.array(ProviderRouteSchema).length(3) });
export type TeamInput = z.input<typeof TeamInputSchema>;
export type FrozenTeam = z.infer<typeof FrozenTeamSchema>;

export function validateTeamRoutes(routes: ProviderRoute[]) {
  if (new Set(routes.map(route => `${route.providerId}/${route.modelId}`)).size !== 3
    || new Set(routes.map(route => route.providerId)).size < 2) {
    throw new PublicError('Plan 02 requires three distinct model identities across at least two providers.');
  }
  if (routes.some(route => !route.capabilities.streaming || route.capabilities.structuredOutput === 'none'
    || route.capabilities.cancellation === 'none' || route.capabilities.usage === 'none')) {
    throw new PublicError('Plan 02 requires declared streaming, structured output, cancellation and token usage.');
  }
}
