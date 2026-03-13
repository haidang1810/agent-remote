import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec, isValidName } from '../_shared/exec-wrapper.js';

export function registerServiceStopTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'service_stop',
    category: 'service',
    description: 'Stop a systemd service',
    risk_level: 'critical',
  });

  addToolDefinition({
    name: 'service_stop',
    description: 'Stop a systemd service',
    schema: {
      service: z.string().describe('Service name to stop'),
    },
    async handler(args) {
      const service = args.service as string;
      if (!isValidName(service)) {
        return errorResult(`Invalid service name: ${service}`);
      }
      try {
        await safeExec(`sudo systemctl stop ${service}`);
        const status = await safeExec(`systemctl status ${service} --no-pager`);
        return textResult(status);
      } catch (err) {
        return errorResult(`Failed to stop service: ${(err as Error).message}`);
      }
    },
  });
}
