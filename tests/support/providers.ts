import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { Boardroom } from '../../src/application.ts';
import { SessionSecretStore } from '../../src/secrets.ts';

export function providerSetup(t: TestContext, fetch: typeof globalThis.fetch, monotonicNow?: () => number) {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom provider '));
  const app = new Boardroom(root, { fetch, ...(monotonicNow ? { monotonicNow } : {}) });
  t.after(() => { app.close(); rmSync(root, { recursive: true, force: true }); });
  const store = new SessionSecretStore();
  for (const [id, providerId, modelId] of [['po', 'openai', 'gpt-4.1-mini-2025-04-14'],
    ['dev', 'anthropic', 'claude-haiku-4-5-20251001'], ['marketing', 'openai', 'gpt-4.1-2025-04-14']]) {
    app.configureSupportedRoute({ id, providerId, modelId });
  }
  app.configureTeam({ id: 'team', proposalAuthorId: 'po', advisers: [
    { id: 'po', role: 'Product Owner', routeId: 'po' }, { id: 'dev', role: 'Lead Developer', routeId: 'dev' },
    { id: 'marketing', role: 'Marketing Manager', routeId: 'marketing' },
  ] });
  const project = app.createProject({ name: 'Pilot', language: 'fr' });
  const source = join(root, 'source.md'); writeFileSync(source, 'Two engineers.\nPRIVATE_UNSELECTED');
  const evidence = app.captureSource(project.id, source, { authorized: true });
  const meeting = app.prepareTeamMeeting({ projectId: project.id, teamId: 'team', question: 'First?',
    constraints: ['Four weeks'], durationTargetSeconds: 600, costCeiling: { amount: 10, currency: 'USD' },
    passages: [{ evidenceId: evidence.id, firstLine: 1, lastLine: 1 }] });
  app.configureExecution(project.id, meeting.id, { revisionMicros: 1000000, conclusionMicros: 1000000,
    revisionMs: 10000, conclusionMs: 10000 });
  return { app, store, project, meeting, root, evidence };
}

export function streamResponse(events: unknown[]): Response {
  const bytes = new TextEncoder().encode(events.map(event => `data: ${JSON.stringify(event)}\r\n\r\n`).join(''));
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close();
  } }), { headers: { 'Content-Type': 'text/event-stream' } });
}
export function openaiEvents(text: string, overrides: Record<string, unknown> = {}) {
  return [{ type: 'response.output_text.delta', delta: text.slice(0, 5) },
    { type: 'response.output_text.delta', delta: text.slice(5) }, { type: 'response.completed', response: {
      status: 'completed', model: 'gpt-4.1-mini-2025-04-14', usage: { input_tokens: 100, output_tokens: 10 },
      output: [{ type: 'message', content: [{ type: 'output_text', text }] }], ...overrides } }];
}


