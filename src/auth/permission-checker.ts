import type Database from 'better-sqlite3';
import { findPermissions } from '../db/models/api-key-model.js';
import { findToolByName } from '../db/models/tool-model.js';
import type { ApiKey } from '../db/types.js';

export interface PermissionResult {
  allowed: boolean;
  reason: string;
}

/**
 * Per-key permission check:
 * 1. Tool must exist and be globally enabled
 * 2. Key must be active and not expired
 * 3. If key has explicit permission for this tool → use it
 * 4. Otherwise → allowed by default
 */
export function canExecuteTool(
  db: Database.Database,
  key: ApiKey,
  toolName: string,
): PermissionResult {
  const tool = findToolByName(db, toolName);
  if (!tool) {
    return { allowed: false, reason: `Tool '${toolName}' not found` };
  }
  if (!tool.enabled) {
    return { allowed: false, reason: `Tool '${toolName}' is globally disabled` };
  }

  if (!key.active) {
    return { allowed: false, reason: 'API key is deactivated' };
  }
  if (key.expires_at && key.expires_at < Math.floor(Date.now() / 1000)) {
    return { allowed: false, reason: 'API key has expired' };
  }

  // Per-key tool permission (explicit deny/allow)
  const overrides = findPermissions(db, key.id);
  const override = overrides.find((p) => p.tool_name === toolName);
  if (override) {
    return override.allowed
      ? { allowed: true, reason: 'Allowed by key permission' }
      : { allowed: false, reason: 'Denied by key permission' };
  }

  // No explicit permission → allowed by default
  return { allowed: true, reason: 'Allowed (default)' };
}
