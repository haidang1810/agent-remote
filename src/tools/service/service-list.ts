import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';

export function registerServiceListTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'service_list',
    category: 'service',
    description: 'List systemd services filtered by state (running, failed, or all)',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'service_list',
    description: 'List systemd services filtered by state (running, failed, or all)',
    schema: {
      filter: z
        .enum(['running', 'failed', 'all'])
        .optional()
        .default('running')
        .describe('Filter services by state'),
    },
    async handler(args) {
      const filter = (args.filter as string) ?? 'running';
      const stateFlag =
        filter === 'all' ? '' : `--state=${filter}`;
      const cmd = `systemctl list-units --type=service ${stateFlag} --no-pager --plain`.trim();
      try {
        const output = await safeExec(cmd);
        return textResult(output);
      } catch (err) {
        return errorResult(`Failed to list services: ${(err as Error).message}`);
      }
    },
  });
}
