import { emitKeypressEvents, type Key } from 'node:readline';
import { PublicError } from './privacy.ts';
import { validateSecret } from './secrets.ts';

export async function readCredential(explicitStdin: boolean): Promise<string> {
  if (!process.stdin.isTTY) {
    if (!explicitStdin) throw new PublicError('Piped credentials require explicit --secret-stdin.');
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of process.stdin) {
      const buffer = Buffer.from(chunk); bytes += buffer.length;
      if (bytes > 2562) throw new PublicError('Credential input exceeds the size limit.');
      chunks.push(buffer);
    }
    return validateSecret(Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, ''));
  }
  if (explicitStdin) throw new PublicError('--secret-stdin requires piped input.');
  const wasRaw = process.stdin.isRaw;
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdout.write('Credential (masked; Escape cancels): ');
  try {
    return await new Promise<string>((resolve, reject) => {
      let value = '';
      const finish = (error?: Error) => {
        process.stdin.off('keypress', onKey);
        if (error) reject(error);
        else { try { resolve(validateSecret(value)); } catch (invalid) { reject(invalid); } }
      };
      const onKey = (text: string | undefined, key: Key) => {
        if ((key.ctrl && key.name === 'c') || key.name === 'escape') return finish(new PublicError('Credential input cancelled.'));
        if (key.name === 'return' || key.name === 'enter') return finish();
        if (key.name === 'backspace') {
          if (value) { value = Array.from(value).slice(0, -1).join(''); process.stdout.write('\b \b'); }
        } else if (text && !key.ctrl && !key.meta) {
          try { validateSecret(value + text); }
          catch { return finish(new PublicError('Credential input is invalid.')); }
          value += text; process.stdout.write('*'.repeat(Array.from(text).length));
        }
      };
      process.stdin.on('keypress', onKey); process.stdin.resume();
    });
  } finally {
    process.stdin.setRawMode(wasRaw ?? false); process.stdin.pause(); process.stdout.write('\n');
  }
}
