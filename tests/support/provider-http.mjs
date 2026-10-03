// External HTTP boundary for spawned CLI tests only. Never packaged as a product provider.
import { appendFileSync } from 'node:fs';
globalThis.fetch = async (url, init) => {
  if (!['https://api.openai.com/v1/responses', 'https://api.anthropic.com/v1/messages'].includes(String(url))) throw new Error('Unexpected test origin.');
  const body = JSON.parse(init.body);
  if (process.env.TEST_HTTP_LOG) appendFileSync(process.env.TEST_HTTP_LOG, JSON.stringify({ url: String(url), body }) + '\n');
  const text = process.env.TEST_OUTPUT ?? '{"ok":true}';
  const events = [{ type: 'response.output_text.delta', delta: text }, { type: 'response.completed', response: {
    status: 'completed', model: body.model, usage: { input_tokens: 100, output_tokens: 10 },
    output: [{ type: 'message', content: [{ type: 'output_text', text }] }],
  } }];
  return new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } });
};
