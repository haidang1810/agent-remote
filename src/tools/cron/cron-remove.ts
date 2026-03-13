import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec, isValidName } from '../_shared/exec-wrapper.js';

export function registerCronRemoveTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'cron_remove',
    category: 'cron',
    description: 'Remove crontab entries matching a pattern',
    risk_level: 'critical',
  });

  addToolDefinition({
    name: 'cron_remove',
    description: 'Remove crontab entries matching a pattern',
    schema: {
      pattern: z.string().describe('Pattern to match crontab entries for removal'),
      user: z.string().optional().describe('Username to modify crontab for (default: current user)'),
    },
    async handler(args) {
      const pattern = args.pattern as string;
      const user = args.user as string | undefined;

      if (user !== undefined && !isValidName(user)) {
        return errorResult(`Invalid username: ${user}`);
      }

      const userArg = user ? ` -u ${user}` : '';
      const escapedPattern = pattern.replace(/'/g, "'\\''");

      try {
        // First: show matching lines
        const matchCmd = `crontab${userArg} -l 2>/dev/null | grep -F '${escapedPattern}'`;
        let matchedLines: string;
        try {
          matchedLines = await safeExec(matchCmd);
        } catch {
          matchedLines = '';
        }

        if (!matchedLines.trim()) {
          return textResult('No matching crontab entries found');
        }

        // Then: remove matching lines
        const removeCmd = `crontab${userArg} -l 2>/dev/null | grep -vF '${escapedPattern}' | crontab${userArg} -`;
        await safeExec(removeCmd);

        const removedLines = matchedLines
          .split('\n')
          .filter(Boolean)
          .map((line) => line.trim());

        return textResult(
          JSON.stringify({ removed: removedLines, count: removedLines.length }, null, 2),
        );
      } catch (err) {
        return errorResult(`Failed to remove cron entries: ${(err as Error).message}`);
      }
    },
  });
}
