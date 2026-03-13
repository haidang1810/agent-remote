import si from 'systeminformation';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

export function registerSystemDiskUsageTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'system_disk_usage',
    category: 'system',
    description: 'Get disk usage for all mount points or a specific path',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'system_disk_usage',
    description: 'Get disk usage for all mount points or a specific path',
    schema: {
      path: z.string().optional().describe('Filter to a specific mount point (e.g. /)'),
    },
    async handler(args) {
      try {
        const filterPath = args.path as string | undefined;
        let disks = await si.fsSize();

        if (filterPath) {
          disks = disks.filter((d) => d.mount === filterPath);
          if (disks.length === 0) {
            return errorResult(`No mount point found matching: ${filterPath}`);
          }
        }

        const result = disks.map((d) => ({
          mount: d.mount,
          type: d.type,
          totalGB: Math.round((d.size / 1073741824) * 100) / 100,
          usedGB: Math.round((d.used / 1073741824) * 100) / 100,
          availableGB: Math.round(((d.size - d.used) / 1073741824) * 100) / 100,
          usedPercent: Math.round(d.use * 100) / 100,
        }));

        return textResult(JSON.stringify(result, null, 2));
      } catch (err) {
        return errorResult(`Failed to get disk usage: ${(err as Error).message}`);
      }
    },
  });
}
