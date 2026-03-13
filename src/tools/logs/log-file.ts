import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';

export function registerLogFileTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'log_file',
    category: 'logs',
    description: 'Read lines from a log file with optional grep filter',
    risk_level: 'medium',
  });

  addToolDefinition({
    name: 'log_file',
    description: 'Read lines from a log file with optional grep filter',
    schema: {
      path: z.string().describe('Absolute path to log file (must be in allowed directories, e.g. /var/log)'),
      lines: z.number().min(1).max(1000).optional().describe('Number of lines to return (default: 100, max: 1000)'),
      filter: z.string().optional().describe('Grep filter string to apply to log output'),
    },
    async handler(args) {
      const filePath = args.path as string;
      const check = isPathAllowed(filePath);
      if (!check.allowed) {
        return errorResult(`Path not allowed: ${check.reason}`);
      }

      const lines = Math.min((args.lines as number) ?? 100, 1000);

      // Escape path for shell — wrap in single quotes, escape existing single quotes
      const escapedPath = `'${filePath.replace(/'/g, "'\\''")}'`;
      let cmd = `tail -n ${lines} ${escapedPath}`;

      if (args.filter) {
        // Escape filter for shell safety — strip control chars, wrap in single quotes
        const filter = (args.filter as string).replace(/['\0\r\n]/g, '');
        cmd += ` | grep -F '${filter}'`;
      }

      try {
        const output = await safeExec(cmd);
        return textResult(output || '(no log output)');
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('No such file')) {
          return errorResult(`Log file not found: ${filePath}`);
        }
        if (msg.includes('Permission denied')) {
          return errorResult(`Permission denied reading: ${filePath}`);
        }
        return errorResult(`log_file error: ${msg}`);
      }
    },
  });
}
