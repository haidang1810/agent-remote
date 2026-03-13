import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec, isValidName } from '../_shared/exec-wrapper.js';

export function registerServiceStatusTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'service_status',
    category: 'service',
    description: 'Get systemd service status',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'service_status',
    description: 'Get systemd service status',
    schema: {
      service: z.string().describe('Service name (e.g. nginx, sshd)'),
    },
    async handler(args) {
      const service = args.service as string;
      if (!isValidName(service)) {
        return errorResult(`Invalid service name: ${service}`);
      }
      try {
        const output = await safeExec(`systemctl status ${service} --no-pager`);
        return textResult(output);
      } catch (err) {
        return errorResult(`Failed to get status: ${(err as Error).message}`);
      }
    },
  });
}
