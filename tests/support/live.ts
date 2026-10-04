import type { TestContext } from 'node:test';
import { providerSetup, streamResponse, openaiEvents } from './providers.ts';

export function providerResponse(model: string, body: unknown) {
  const text = JSON.stringify(body);
  return streamResponse(model.startsWith('claude') ? [
    { type: 'message_start', message: { model, usage: { input_tokens: 100 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', delta: { type: 'text_delta', text } },
    { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 10 } }, { type: 'message_stop' },
  ] : openaiEvents(text, { model }));
}
const syntheticMarker = 'Return exactly this JSON object and nothing else: ';
/** The reply of a provider that obeys a preflight: it returns the synthetic instance the request carries. */
export function echoSynthetic(init: RequestInit | undefined) {
  const wire = JSON.parse(String(init?.body)), prompt: string = wire.input ?? wire.messages[0].content;
  return providerResponse(wire.model, JSON.parse(prompt.slice(prompt.indexOf(syntheticMarker) + syntheticMarker.length)));
}
export async function liveSetup(t: TestContext, override?: (phase: string, request: any, normal: any) => unknown | Promise<unknown>, ceiling?: number) {
  let references: any;
  const sent: { phase: string; request: any }[] = [];
  const wires: { phase: string; providerId: 'openai' | 'anthropic'; schema: any }[] = [];
  const fixture = providerSetup(t, async (_url, init) => {
    const wire = JSON.parse(String(init?.body)), prompt = wire.input ?? wire.messages[0].content;
    const request = JSON.parse(prompt.split('\n')[1]);
    const schema = (wire.text?.format.schema ?? wire.output_config.format.schema).properties;
    const phase = schema.assertions ? 'analysis' : schema.objections ? 'confrontation' : schema.dispositions ? 'revision' : schema.items ? 'proposal' : schema.verdict ? 'views' : 'framing';
    const initial = { title: 'Pilot', items: [{ id: 'integrations', text: 'Build five integrations', references }] };
    const revised = { title: 'Pilot', items: [{ id: 'integrations', text: 'Build one integration', references }] };
    const normal = phase === 'framing' ? { decisionQuestion: 'Pilot?', summary: 'Compare scope', initialProposal: null, assumptions: [], references }
      : phase === 'analysis' ? { assertions: [{ id: 'capacity', kind: 'fact', text: 'Two engineers', references }, { id: 'demand', kind: 'unknown', text: 'Demand untested', references: [] }], risks: ['Capacity'], assumptions: [], recommendations: ['Pilot'] }
      : phase === 'proposal' ? initial
      : phase === 'confrontation' ? { objections: wire.model.startsWith('claude') ? [{ id: 'capacity', target: { kind: 'proposal-item', adviserId: null, assertionId: null, itemId: 'integrations' }, justification: 'Two engineers cannot build five integrations in four weeks.', impact: 'Missed deadline', amendment: 'One integration', references }] : [] }
      : phase === 'revision' ? { proposal: revised, dispositions: [{ adviserId: 'dev', objectionId: 'capacity', action: 'accepted', reason: 'Staffing supports a smaller pilot.', changedItemIds: ['integrations'] }] }
      : { proposalVersion: request.proposalVersion, proposalSha256: request.proposalSha256, verdict: wire.model.startsWith('claude') ? 'REJECTED' : 'APPROVED', confidence: 70, justification: 'Limited pilot', criticalUncertainty: 'Demand', conditions: ['Measure willingness to pay'], references };
    sent.push({ phase, request });
    wires.push({ phase, providerId: wire.messages ? 'anthropic' : 'openai', schema: wire.text?.format.schema ?? wire.output_config.format.schema });
    return providerResponse(wire.model, override ? await override(phase, { ...request, model: wire.model }, normal) : normal);
  }, undefined, undefined, ceiling);
  references = fixture.meeting.context.passages;
  for (const id of ['po', 'dev', 'marketing']) await fixture.app.setRouteCredential(id, 'DUMMY_PRIVATE_KEY', fixture.store);
  await fixture.app.startMeeting(fixture.project.id, fixture.meeting.id, fixture.store);
  await fixture.app.approveFraming(fixture.project.id, fixture.meeting.id, 1);
  return { ...fixture, sent, wires };
}
