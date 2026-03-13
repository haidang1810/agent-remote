import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec, isValidName } from '../_shared/exec-wrapper.js';

export function registerLogPm2Tool(db: Database.Database): void {
  upsertTool(db, {
    name: 'log_pm2',
    category: 'logs',
    description: 'Read PM2 process logs (stdout or stderr) for a named application',
    risk_level: 'medium',
  });

  addToolDefinition({
    name: 'log_pm2',
    description: 'Read PM2 process logs (stdout or stderr) for a named application',
    schema: {
      appName: z.string().describe('PM2 application name or ID'),
      lines: z.number().min(1).max(1000).optional().describe('Number of lines to return (default: 100)'),
      logType: z.enum(['out', 'err']).optional().describe('Log stream to read: "out" (stdout) or "err" (stderr), default: "out"'),
    },
    async handler(args) {
      const appName = args.appName as string;
      if (!isValidName(appName)) {
        return errorResult(`Invalid app name: "${appName}". Only alphanumeric, dots, dashes, underscores, @ allowed.`);
      }

      const lines = Math.min((args.lines as number) ?? 100, 1000);
      const logType = (args.logType as string) ?? 'out';

      // Check PM2 is available
      try {
        await safeExec('which pm2');
      } catch {
        return errorResult('PM2 is not installed or not in PATH');
      }

      try {
        // pm2 logs outputs to stderr; --nostream exits after printing existing logs
        const cmd = `pm2 logs ${appName} --lines ${lines} --nostream --raw`;
        const output = await safeExec(cmd, { timeout: 15_000 });

        if (!output) {
          return textResult('(no PM2 log output)');
        }

        // Filter by log type: PM2 prefixes out lines with app name, err with app name|err
        const allLines = output.split('\n');
        let filtered: string[];

        if (logType === 'err') {
          filtered = allLines.filter((line) => line.includes('|error') || line.includes('[err]') || line.includes('err:'));
          if (filtered.length === 0) {
            // Fallback: return all if we can't distinguish
            filtered = allLines;
          }
        } else {
          filtered = allLines.filter((line) => !line.includes('|error') && !line.includes('[err]') && !line.includes('err:'));
          if (filtered.length === 0) {
            filtered = allLines;
          }
        }

        return textResult(filtered.slice(-lines).join('\n') || '(no log output)');
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('not found') || msg.includes('doesn\'t exist')) {
          return errorResult(`PM2 app "${appName}" not found. Run "pm2 list" to see available apps.`);
        }
        if (msg.includes('timed out')) {
          return errorResult('PM2 logs command timed out');
        }
        return errorResult(`PM2 logs error: ${msg}`);
      }
    },
  });
}
