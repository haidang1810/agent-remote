import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';
import { safeExec } from '../_shared/exec-wrapper.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

/** Shell metacharacters that could allow injection */
const SHELL_META = /[;&|`$(){}\\]/;

export function registerFileGrepTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'file_grep',
    category: 'filesystem',
    description: 'Search file contents using grep pattern within a directory',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'file_grep',
    description: 'Search file contents using grep pattern within a directory',
    schema: {
      pattern: z.string().describe('Text or regex pattern to search for'),
      directory: z.string().describe('Absolute directory path to search in'),
      fileGlob: z.string().optional().describe('Glob to filter files (e.g. "*.ts", "*.log")'),
      maxResults: z.number().int().min(1).max(200).optional().describe('Max matching lines to return (default: 50)'),
    },
    async handler(args) {
      try {
        const pattern = args.pattern as string;
        const dir = args.directory as string;
        const fileGlob = (args.fileGlob as string | undefined) ?? '*';
        const maxResults = (args.maxResults as number) ?? 50;

        const check = isPathAllowed(dir);
        if (!check.allowed) return errorResult(check.reason!);

        if (SHELL_META.test(pattern)) {
          return errorResult('Pattern contains disallowed shell metacharacters');
        }
        if (SHELL_META.test(fileGlob)) {
          return errorResult('fileGlob contains disallowed shell metacharacters');
        }

        const cmd = `grep -rn --include="${fileGlob}" "${pattern}" ${dir} | head -n ${maxResults}`;
        const output = await safeExec(cmd);
        return textResult(output || 'No matches found');
      } catch (err) {
        return errorResult(`Failed to grep files: ${(err as Error).message}`);
      }
    },
  });
}
