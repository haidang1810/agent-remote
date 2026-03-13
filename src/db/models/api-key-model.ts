import type Database from 'better-sqlite3';
import type { ApiKey, ApiKeyPermission, CreateApiKeyInput } from '../types.js';

export function findAllKeys(db: Database.Database): ApiKey[] {
  return db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as ApiKey[];
}

export function findKeyById(db: Database.Database, id: number): ApiKey | null {
  return (db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as ApiKey) ?? null;
}

export function findKeyByHash(db: Database.Database, hash: string): ApiKey | null {
  return (db.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND active = 1').get(hash) as ApiKey) ?? null;
}

export function createKey(db: Database.Database, data: CreateApiKeyInput): ApiKey {
  const result = db.prepare(
    `INSERT INTO api_keys (name, key_hash, key_prefix, permission_group, expires_at, rate_limit)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    data.name,
    data.key_hash,
    data.key_prefix,
    data.permission_group ?? 'read',
    data.expires_at ?? null,
    data.rate_limit ?? 60,
  );
  return findKeyById(db, Number(result.lastInsertRowid))!;
}

export function updateKey(
  db: Database.Database,
  id: number,
  data: Partial<Pick<ApiKey, 'name' | 'permission_group' | 'active' | 'expires_at' | 'rate_limit'>>,
): ApiKey | null {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  if (fields.length === 0) return findKeyById(db, id);

  fields.push('updated_at = unixepoch()');
  values.push(id);

  db.prepare(`UPDATE api_keys SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findKeyById(db, id);
}

export function deleteKey(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  return result.changes > 0;
}

export function touchKeyUsage(db: Database.Database, id: number): void {
  db.prepare('UPDATE api_keys SET last_used_at = unixepoch() WHERE id = ?').run(id);
}

// --- Permissions ---

export function findPermissions(db: Database.Database, apiKeyId: number): ApiKeyPermission[] {
  return db.prepare('SELECT * FROM api_key_permissions WHERE api_key_id = ?').all(apiKeyId) as ApiKeyPermission[];
}

export function setPermission(db: Database.Database, apiKeyId: number, toolName: string, allowed: boolean): void {
  db.prepare(
    `INSERT INTO api_key_permissions (api_key_id, tool_name, allowed) VALUES (?, ?, ?)
     ON CONFLICT(api_key_id, tool_name) DO UPDATE SET allowed = excluded.allowed`,
  ).run(apiKeyId, toolName, allowed ? 1 : 0);
}

export function deletePermission(db: Database.Database, apiKeyId: number, toolName: string): void {
  db.prepare('DELETE FROM api_key_permissions WHERE api_key_id = ? AND tool_name = ?').run(apiKeyId, toolName);
}
