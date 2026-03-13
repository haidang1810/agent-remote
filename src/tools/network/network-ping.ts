import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';

/** Allow only alphanumeric, dots, dashes, colons (IPv6) */
function isValidHost(host: string): boolean {
  return /^[a-zA-Z0-9.\-:]+$/.test(host) && host.length <= 253;
}

export function registerNetworkPingTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'network_ping',
    category: 'network',
    description: 'Ping a host and return round-trip statistics',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'network_ping',
    description: 'Ping a host and return round-trip statistics',
    schema: {
      host: z.string().describe('Hostname or IP address to ping'),
      count: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .default(4)
        .describe('Number of ping packets to send (default 4, max 10)'),
    },
    async handler(args) {
      const host = args.host as string;
      const count = (args.count as number) ?? 4;
      if (!isValidHost(host)) {
        return errorResult(`Invalid host: ${host}`);
      }
      try {
        const output = await safeExec(`ping -c ${count} -W 3 ${host}`, { timeout: 15000 });
        return textResult(output);
      } catch (err) {
        return errorResult(`Ping failed: ${(err as Error).message}`);
      }
    },
  });
}
