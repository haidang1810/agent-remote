import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec, isValidName } from '../_shared/exec-wrapper.js';

export function registerLogJournaldTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'log_journald',
    category: 'logs',
    description: 'Read systemd journal logs for a service unit',
    risk_level: 'medium',
  });

  addToolDefinition({
    name: 'log_journald',
    description: 'Read systemd journal logs for a service unit',
    schema: {
      unit: z.string().describe('Systemd unit name (e.g. "nginx.service")'),
      lines: z.number().min(1).max(1000).optional().describe('Number of lines to return (default: 100, max: 1000)'),
      since: z.string().optional().describe('Show logs since time (e.g. "1h", "30m", "2024-01-01")'),
      priority: z.number().min(0).max(7).optional().describe('Log priority filter 0-7 (0=emerg, 7=debug)'),
    },
    async handler(args) {
      const unit = args.unit as string;
      if (!isValidName(unit)) {
        return errorResult(`Invalid unit name: "${unit}". Only alphanumeric, dots, dashes, underscores, @ allowed.`);
      }

      const lines = Math.min((args.lines as number) ?? 100, 1000);
      let cmd = `journalctl -u ${unit} -n ${lines} --no-pager`;

      if (args.since) {
        // Escape single quotes for shell safety
        const since = (args.since as string).replace(/'/g, '');
        cmd += ` --since '${since}'`;
      }

      if (args.priority !== undefined) {
        cmd += ` -p ${args.priority as number}`;
      }

      try {
        const output = await safeExec(cmd);
        return textResult(output || '(no log output)');
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('timed out')) {
          return errorResult('journalctl command timed out');
        }
        return errorResult(`journalctl error: ${msg}`);
      }
    },
  });
}
