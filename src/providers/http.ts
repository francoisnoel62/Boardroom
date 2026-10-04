import type { CallReceipt, ProviderBoundary, ProviderResult } from '../call-domain.ts';
import type { ProviderRoute } from '../routes.ts';
import { PublicError } from '../privacy.ts';
import { validateSecret } from '../secrets.ts';
import { pricingIsCurrent, supportedModel } from './catalog.ts';

async function* events(response: Response, signal: AbortSignal) {
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('Invalid stream.');
  const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '', bytes = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) { buffer += decoder.decode(); break; }
      bytes += value.byteLength; if (bytes > 8388608) throw new Error('Stream exceeds bound.');
      buffer += decoder.decode(value, { stream: true });
      // Normalize complete lines only: CRLF may itself cross chunks.
      for (;;) {
        const delimiter = /\r?\n\r?\n/.exec(buffer); if (!delimiter) break;
        const frame = buffer.slice(0, delimiter.index); buffer = buffer.slice(delimiter.index + delimiter[0].length);
        const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (data && data !== '[DONE]') yield JSON.parse(data);
      }
      if (buffer.length > 1048576) throw new Error('Event exceeds bound.');
    }
    if (buffer.trim()) throw new Error('Incomplete stream event.');
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

// Only the application service creates this boundary, then passes it to a durable handle.
export function providerBoundary(route: ProviderRoute, receipt: CallReceipt, secret: string, http: typeof fetch, utcDay: string): ProviderBoundary {
  const model = supportedModel(route.providerId, route.modelId);
  if (JSON.stringify(route.pricing) !== JSON.stringify(model.pricing) || !pricingIsCurrent(model.pricing, utcDay)
    || receipt.limits.maxInputTokens < model.context || receipt.limits.maxOutputTokens > model.output) {
    throw new PublicError('Provider call requires the current catalog price and full-context input bound.');
  }
  const key = validateSecret(secret);
  return async (request, signal, emit) => {
    const openai = route.providerId === 'openai';
    const body = openai ? { model: route.modelId, input: request.text, stream: true, store: false, tools: [], tool_choice: 'none',
      service_tier: 'default', max_output_tokens: receipt.limits.maxOutputTokens,
      text: { format: { type: 'json_schema', name: 'boardroom_output', strict: true, schema: request.jsonSchema } } }
      : { model: route.modelId, messages: [{ role: 'user', content: request.text }], stream: true,
        max_tokens: receipt.limits.maxOutputTokens, thinking: { type: 'disabled' },
        output_config: { format: { type: 'json_schema', schema: request.jsonSchema } } };
    signal.throwIfAborted();
    const response = await http(openai ? 'https://api.openai.com/v1/responses' : 'https://api.anthropic.com/v1/messages', {
      method: 'POST', redirect: 'error', signal,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(openai
        ? { Authorization: `Bearer ${key}` } : { 'x-api-key': key, 'anthropic-version': '2023-06-01' }) }, body: JSON.stringify(body),
    });
    if (!response.ok) { await response.body?.cancel(); return { text: '', failure: response.status === 401 || response.status === 403
      ? 'authentication' : response.status === 429 ? 'quota' : 'provider-error' }; }
    let text = '', input: number | undefined, output: number | undefined, terminal = false, failed: ProviderResult['failure'];
    let started = false, stopReceived = false;
    for await (const event of events(response, signal)) {
      if (terminal) throw new Error('Events after terminal.');
      if (openai) {
        if (event.type === 'response.output_text.delta') { if (typeof event.delta !== 'string') throw new Error('Invalid delta.'); text += event.delta; emit(event.delta); }
        if (event.type === 'response.refusal.delta') failed = 'refusal';
        if (event.type === 'error') throw new Error('Provider stream error.');
        if (['response.completed', 'response.incomplete', 'response.failed'].includes(event.type)) {
          const result = event.response; terminal = true;
          if (result.model !== route.modelId) failed = 'identity-mismatch';
          else if (result.status !== 'completed') failed = result.status === 'incomplete' ? 'truncated' : 'provider-error';
          const content = result.output?.flatMap((item: any) => {
            if (item.type !== 'message') { failed = 'tool-blocked'; return []; }
            return item.content ?? [];
          }) ?? [];
          if (content.some((item: any) => item.type === 'refusal')) failed = 'refusal';
          if (content.some((item: any) => !['output_text', 'refusal'].includes(item.type))) failed = 'tool-blocked';
          const finalText = content.filter((item: any) => item.type === 'output_text').map((item: any) => item.text).join('');
          if (!failed && text !== finalText) throw new Error('Stream/final mismatch.');
          input = result.usage?.input_tokens; output = result.usage?.output_tokens;
        }
      } else {
        if (event.type === 'message_start') {
          if (started) throw new Error('Duplicate message start.'); started = true;
          if (event.message.model !== route.modelId) failed = 'identity-mismatch';
          input = event.message.usage?.input_tokens;
          // Cache writes are never requested. Unexpected writes cannot be settled at the base rate.
          if (event.message.usage?.cache_creation_input_tokens) throw new Error('Unexpected cache write.');
          if (input !== undefined) input += event.message.usage?.cache_read_input_tokens ?? 0;
        }
        if (event.type === 'content_block_start' && event.content_block.type !== 'text') failed = 'tool-blocked';
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta' && typeof event.delta.text === 'string') { text += event.delta.text; emit(event.delta.text); }
          else failed = 'tool-blocked';
        }
        if (event.type === 'message_delta') {
          if (!started || typeof event.delta.stop_reason !== 'string') throw new Error('Missing message/stop identity.');
          stopReceived = true;
          output = event.usage?.output_tokens;
          if (event.delta.stop_reason !== 'end_turn') failed = event.delta.stop_reason === 'refusal' ? 'refusal'
            : event.delta.stop_reason === 'tool_use' ? 'tool-blocked' : 'truncated';
        }
        if (event.type === 'error') throw new Error('Provider stream error.');
        if (event.type === 'message_stop') {
          if (!started || !stopReceived) throw new Error('Incomplete message.'); terminal = true;
        }
      }
      if (Buffer.byteLength(text) > 1048576) throw new Error('Output exceeds bound.');
    }
    if (!terminal) throw new Error('Stream ended before terminal receipt.');
    return { text, ...(failed ? { failure: failed } : {}), ...(input !== undefined && output !== undefined
      && failed !== 'tool-blocked' && failed !== 'identity-mismatch'
      ? { usage: { inputTokens: input, outputTokens: output } } : {}) };
  };
}
