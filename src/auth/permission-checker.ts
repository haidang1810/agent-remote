import type Database from 'better-sqlite3';
import { findPermissions } from '../db/models/api-key-model.js';
import { findToolByName } from '../db/models/tool-model.js';
import type { ApiKey } from '../db/types.js';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Group → allowed risk levels mapping */
const GROUP_PERMISSIONS: Record<string, Set<RiskLevel>> = {
  read: new Set(['low']),
  write: new Set(['low', 'medium', 'high']),
  admin: new Set(['low', 'medium', 'high', 'critical']),
};

export interface PermissionResult {
  allowed: boolean;
  reason: string;
}

/** 3-tier permission resolution */
export function canExecuteTool(
  db: Database.Database,
  key: ApiKey,
  toolName: string,
): PermissionResult {
  // Tier 1: Is tool globally enabled?
  const tool = findToolByName(db, toolName);
  if (!tool) {
    return { allowed: false, reason: `Tool '${toolName}' not found` };
  }
  if (!tool.enabled) {
    return { allowed: false, reason: `Tool '${toolName}' is globally disabled` };
  }

  // Tier 2: Is key active and not expired?
  if (!key.active) {
    return { allowed: false, reason: 'API key is deactivated' };
  }
  if (key.expires_at && key.expires_at < Math.floor(Date.now() / 1000)) {
    return { allowed: false, reason: 'API key has expired' };
  }

  // Tier 3: Check per-key override, then group default
  const overrides = findPermissions(db, key.id);
  const override = overrides.find((p) => p.tool_name === toolName);
  if (override) {
    return override.allowed
      ? { allowed: true, reason: 'Allowed by per-key override' }
      : { allowed: false, reason: 'Denied by per-key override' };
  }

  // Group default
  const allowedRisks = GROUP_PERMISSIONS[key.permission_group];
  if (!allowedRisks) {
    return { allowed: false, reason: `Unknown permission group '${key.permission_group}'` };
  }

  const riskLevel = tool.risk_level as RiskLevel;
  if (allowedRisks.has(riskLevel)) {
    return { allowed: true, reason: `Allowed by group '${key.permission_group}'` };
  }

  return {
    allowed: false,
    reason: `Group '${key.permission_group}' cannot access '${riskLevel}' risk tools`,
  };
}
