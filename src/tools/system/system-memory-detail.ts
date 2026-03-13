import si from 'systeminformation';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

const toGB = (bytes: number) => Math.round((bytes / 1073741824) * 100) / 100;

export function registerSystemMemoryDetailTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'system_memory_detail',
    category: 'system',
    description: 'Get detailed memory usage: RAM and swap breakdown in GB',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'system_memory_detail',
    description: 'Get detailed memory usage: RAM and swap breakdown in GB',
    schema: {},
    async handler() {
      try {
        const mem = await si.mem();
        const result = {
          total: toGB(mem.total),
          used: toGB(mem.used),
          free: toGB(mem.free),
          active: toGB(mem.active),
          available: toGB(mem.available),
          buffers: toGB(mem.buffers),
          cached: toGB(mem.cached),
          swapTotal: toGB(mem.swaptotal),
          swapUsed: toGB(mem.swapused),
          swapFree: toGB(mem.swapfree),
        };
        return textResult(JSON.stringify(result, null, 2));
      } catch (err) {
        return errorResult(`Failed to get memory detail: ${(err as Error).message}`);
      }
    },
  });
}
