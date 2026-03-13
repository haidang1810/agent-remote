import { randomBytes, createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { findKeyByHash, touchKeyUsage } from '../db/models/api-key-model.js';
import type { ApiKey } from '../db/types.js';

const KEY_PREFIX = 'ar_k_';

export function generateApiKey(): string {
  return KEY_PREFIX + randomBytes(16).toString('hex');
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export interface ValidatedKey {
  key: ApiKey;
  valid: boolean;
  reason?: string;
}

export function validateApiKey(db: Database.Database, rawKey: string): ValidatedKey {
  const hash = hashApiKey(rawKey);
  const key = findKeyByHash(db, hash);

  if (!key) {
    return { key: null as unknown as ApiKey, valid: false, reason: 'Key not found' };
  }

  if (!key.active) {
    return { key, valid: false, reason: 'Key is deactivated' };
  }

  if (key.expires_at && key.expires_at < Math.floor(Date.now() / 1000)) {
    return { key, valid: false, reason: 'Key has expired' };
  }

  touchKeyUsage(db, key.id);
  return { key, valid: true };
}

/** Extract API key from request headers */
export function extractApiKey(headers: Record<string, string | string[] | undefined>): string | null {
  // Check x-api-key header
  const xApiKey = headers['x-api-key'];
  if (typeof xApiKey === 'string' && xApiKey.startsWith(KEY_PREFIX)) {
    return xApiKey;
  }

  // Check Authorization: Bearer ar_k_*
  const auth = headers['authorization'];
  if (typeof auth === 'string') {
    const bearer = auth.replace(/^Bearer\s+/i, '');
    if (bearer.startsWith(KEY_PREFIX)) {
      return bearer;
    }
  }

  return null;
}
