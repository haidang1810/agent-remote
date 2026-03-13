import type Database from 'better-sqlite3';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';

export function registerPackageCheckUpdatesTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'package_check_updates',
    category: 'package',
    description: 'Check for available package updates using apt or yum',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'package_check_updates',
    description: 'Check for available package updates using apt or yum',
    schema: {},
    async handler() {
      try {
        let output: string;
        try {
          output = await safeExec('apt list --upgradable 2>/dev/null');
        } catch {
          // fallback to yum
          output = await safeExec('yum check-update');
        }
        return textResult(output || 'No updates available');
      } catch (err) {
        return errorResult(`Failed to check updates: ${(err as Error).message}`);
      }
    },
  });
}
