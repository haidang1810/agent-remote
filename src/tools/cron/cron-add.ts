import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec, isValidName } from '../_shared/exec-wrapper.js';

/** Patterns for commands that are always blocked */
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  /\bshutdown\b/,
  /\breboot\b/,
  /\bmkfs\b/,
];

function isDangerousCommand(command: string): boolean {
  return DANGEROUS_PATTERNS.some((re) => re.test(command));
}

export function registerCronAddTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'cron_add',
    category: 'cron',
    description: 'Add a new crontab entry with a schedule and command',
    risk_level: 'critical',
  });

  addToolDefinition({
    name: 'cron_add',
    description: 'Add a new crontab entry with a schedule and command',
    schema: {
      schedule: z.string().describe('Cron expression with 5 fields (e.g. "0 2 * * *")'),
      command: z.string().describe('Command to run'),
      user: z.string().optional().describe('Username to add crontab for (default: current user)'),
    },
    async handler(args) {
      const schedule = args.schedule as string;
      const command = args.command as string;
      const user = args.user as string | undefined;

      // Validate cron schedule: must have exactly 5 whitespace-delimited fields
      if (!/^(\S+\s+){4}\S+$/.test(schedule.trim())) {
        return errorResult('Invalid cron schedule: must have exactly 5 fields (e.g. "0 2 * * *")');
      }

      if (user !== undefined && !isValidName(user)) {
        return errorResult(`Invalid username: ${user}`);
      }

      if (isDangerousCommand(command)) {
        return errorResult('Command contains dangerous operations and is not allowed');
      }

      try {
        const userArg = user ? ` -u ${user}` : '';
        const entry = `${schedule} ${command}`;
        const cmd = `(crontab${userArg} -l 2>/dev/null; echo ${JSON.stringify(entry)}) | crontab${userArg} -`;
        await safeExec(cmd);
        return textResult(`Cron job added: ${entry}`);
      } catch (err) {
        return errorResult(`Failed to add cron job: ${(err as Error).message}`);
      }
    },
  });
}
