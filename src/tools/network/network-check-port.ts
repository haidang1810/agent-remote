import type Database from 'better-sqlite3';
import { z } from 'zod';
import { createConnection } from 'node:net';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';

/** Allow only alphanumeric, dots, dashes, colons (IPv6) */
function isValidHost(host: string): boolean {
  return /^[a-zA-Z0-9.\-:]+$/.test(host) && host.length <= 253;
}

function checkPort(host: string, port: number, timeout: number): Promise<{ status: 'open' | 'closed'; responseTimeMs: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = createConnection({ host, port });

    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ status: 'closed', responseTimeMs: Date.now() - start });
    }, timeout);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ status: 'open', responseTimeMs: Date.now() - start });
    });

    socket.on('error', () => {
      clearTimeout(timer);
      resolve({ status: 'closed', responseTimeMs: Date.now() - start });
    });
  });
}

export function registerNetworkCheckPortTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'network_check_port',
    category: 'network',
    description: 'Check if a TCP port is open on a remote host',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'network_check_port',
    description: 'Check if a TCP port is open on a remote host',
    schema: {
      host: z.string().describe('Hostname or IP address'),
      port: z.number().int().min(1).max(65535).describe('TCP port number to check'),
      timeout: z
        .number()
        .int()
        .min(1000)
        .max(10000)
        .optional()
        .default(5000)
        .describe('Connection timeout in milliseconds (default 5000, max 10000)'),
    },
    async handler(args) {
      const host = args.host as string;
      const port = args.port as number;
      const timeout = (args.timeout as number) ?? 5000;

      if (!isValidHost(host)) {
        return errorResult(`Invalid host: ${host}`);
      }
      try {
        const result = await checkPort(host, port, timeout);
        return textResult(
          JSON.stringify({ host, port, ...result }, null, 2),
        );
      } catch (err) {
        return errorResult(`Port check failed: ${(err as Error).message}`);
      }
    },
  });
}
