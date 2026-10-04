// Campaign tool, loaded from outside the candidate: node --import ./qualification/record-http.mjs <candidate launcher...>
// It keeps what the application sends to the providers so a real meeting's inputs can be inspected afterwards (for
// example, that the three initial analyses carried no other adviser's conclusion). Request bodies only: headers,
// including every credential, are never read or written. The request itself is passed through untouched.
import { appendFileSync } from 'node:fs';

const log = process.env.BOARDROOM_QUALIFICATION_RECORD;
if (!log) throw new Error('Set BOARDROOM_QUALIFICATION_RECORD to the JSONL file that receives the request bodies.');
const send = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const text = typeof init?.body === 'string' ? init.body : undefined;
  let body = '[non-text body not recorded]';
  if (text !== undefined) { try { body = JSON.parse(text); } catch { body = '[unparseable body not recorded]'; } }
  appendFileSync(log, `${JSON.stringify({ at: new Date().toISOString(), url: String(input instanceof Request ? input.url : input), method: init?.method ?? 'GET', body })}\n`);
  return send(input, init);
};
