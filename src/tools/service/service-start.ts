import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec, isValidName } from '../_shared/exec-wrapper.js';

export function registerServiceStartTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'service_start',
    category: 'service',
    description: 'Start a systemd service',
    risk_level: 'critical',
  });

  addToolDefinition({
    name: 'service_start',
    description: 'Start a systemd service',
    schema: {
      service: z.string().describe('Service name to start'),
    },
    async handler(args) {
      const service = args.service as string;
      if (!isValidName(service)) {
        return errorResult(`Invalid service name: ${service}`);
      }
      try {
        await safeExec(`sudo systemctl start ${service}`);
        const status = await safeExec(`systemctl status ${service} --no-pager`);
        return textResult(status);
      } catch (err) {
        return errorResult(`Failed to start service: ${(err as Error).message}`);
      }
    },
  });
}
