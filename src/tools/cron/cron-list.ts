import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec, isValidName } from '../_shared/exec-wrapper.js';

export function registerCronListTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'cron_list',
    category: 'cron',
    description: 'List crontab entries for the current user or a specified user',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'cron_list',
    description: 'List crontab entries for the current user or a specified user',
    schema: {
      user: z.string().optional().describe('Username to list crontab for (default: current user)'),
    },
    async handler(args) {
      const user = args.user as string | undefined;

      if (user !== undefined && !isValidName(user)) {
        return errorResult(`Invalid username: ${user}`);
      }

      try {
        const userArg = user ? ` -u ${user}` : '';
        const raw = await safeExec(`crontab${userArg} -l`);

        // Parse lines: filter comments and blank lines, return schedule + command
        const entries = raw
          .split('\n')
          .filter((line) => line.trim() && !line.trim().startsWith('#'))
          .map((line) => {
            const parts = line.trim().split(/\s+/);
            const schedule = parts.slice(0, 5).join(' ');
            const command = parts.slice(5).join(' ');
            return { schedule, command };
          });

        return textResult(JSON.stringify(entries, null, 2));
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('no crontab for')) {
          return textResult(JSON.stringify([], null, 2));
        }
        return errorResult(`Failed to list crontab: ${msg}`);
      }
    },
  });
}
