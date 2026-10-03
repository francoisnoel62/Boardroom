import { z } from 'zod';
import { PublicError } from './privacy.ts';

export interface SecretStore {
  readonly source?: 'host' | 'session';
  set(reference: string, secret: string): Promise<void>;
  get(reference: string): Promise<string | undefined>;
  delete(reference: string): Promise<void>;
}

export function validateSecret(secret: string): string {
  // Generic errors deliberately do not echo input, validation issues or host errors.
  if (typeof secret !== 'string' || !secret.length || Buffer.byteLength(secret) > 2560 || /[\x00-\x20\x7f]/.test(secret)) {
    throw new PublicError('Credential must be a nonempty token without whitespace, at most 2560 UTF-8 bytes.');
  }
  return secret;
}

/** Explicit, process-local injection. Never writes to the data directory or an OS fallback. */
export class SessionSecretStore implements SecretStore {
  readonly source = 'session';
  private readonly values = new Map<string, string>();
  async set(reference: string, secret: string) { this.values.set(z.uuid().parse(reference), validateSecret(secret)); }
  async get(reference: string) { return this.values.get(z.uuid().parse(reference)); }
  async delete(reference: string) { this.values.delete(z.uuid().parse(reference)); }
  clear() { this.values.clear(); }
}

/** Windows Credential Manager, macOS Keychain, or Linux Secret Service (no keyutils fallback). */
export class HostSecretStore implements SecretStore {
  readonly source = 'host';
  private async entry(reference: string) {
    const ref = z.uuid().safeParse(reference);
    if (!ref.success) throw new PublicError('Invalid credential reference.');
    try {
      const { Entry } = await import('@napi-rs/keyring');
      return new Entry('Boardroom', ref.data, { linux: { store: 'secret-service' } });
    } catch { throw new PublicError('Protected credential store unavailable. Use explicit session injection.'); }
  }
  async set(reference: string, secret: string) {
    const token = validateSecret(secret);
    try { (await this.entry(reference)).setPassword(token); }
    catch { throw new PublicError('Protected credential store unavailable. Use explicit session injection.'); }
  }
  async get(reference: string) {
    try { return (await this.entry(reference)).getPassword() ?? undefined; }
    catch { throw new PublicError('Protected credential store unavailable. Use explicit session injection.'); }
  }
  async delete(reference: string) {
    try { (await this.entry(reference)).deletePassword(); }
    catch { throw new PublicError('Protected credential store unavailable. Use explicit session injection.'); }
  }
}
