import si from 'systeminformation';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

export function registerPortListTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'port_list',
    category: 'system',
    description: 'List open network ports with protocol, state, and PID',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'port_list',
    description: 'List open network ports with protocol, state, and PID',
    schema: {
      port: z.number().int().min(1).max(65535).optional().describe('Filter to a specific port number'),
    },
    async handler(args) {
      try {
        const filterPort = args.port as number | undefined;
        const conns = await si.networkConnections();

        let filtered = conns.filter((c) => c.state === 'LISTEN' || c.state === 'ESTABLISHED');

        if (filterPort !== undefined) {
          filtered = filtered.filter((c) => Number(c.localPort) === filterPort);
        }

        const result = filtered.map((c) => ({
          protocol: c.protocol,
          localPort: c.localPort,
          localAddress: c.localAddress,
          state: c.state,
          pid: c.pid,
        }));

        return textResult(JSON.stringify(result, null, 2));
      } catch (err) {
        return errorResult(`Failed to list ports: ${(err as Error).message}`);
      }
    },
  });
}
