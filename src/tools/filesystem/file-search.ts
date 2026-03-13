import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';
import { safeExec } from '../_shared/exec-wrapper.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

export function registerFileSearchTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'file_search',
    category: 'filesystem',
    description: 'Search for files by name pattern within a directory',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'file_search',
    description: 'Search for files by name pattern within a directory',
    schema: {
      directory: z.string().describe('Absolute directory path to search in'),
      pattern: z.string().describe('Filename pattern (e.g. "*.log", "config.*")'),
      maxDepth: z.number().int().min(1).max(10).optional().describe('Max directory depth (default: 3)'),
      maxResults: z.number().int().min(1).max(200).optional().describe('Max results to return (default: 50)'),
    },
    async handler(args) {
      try {
        const dir = args.directory as string;
        const pattern = args.pattern as string;
        const maxDepth = (args.maxDepth as number) ?? 3;
        const maxResults = (args.maxResults as number) ?? 50;

        const check = isPathAllowed(dir);
        if (!check.allowed) return errorResult(check.reason!);

        // Validate pattern — no shell injection via semicolons, pipes, etc.
        if (/[;&|`$(){}]/.test(pattern)) {
          return errorResult('Pattern contains disallowed shell characters');
        }

        const cmd = `find ${dir} -maxdepth ${maxDepth} -name "${pattern}" | head -n ${maxResults}`;
        const output = await safeExec(cmd);
        return textResult(output || 'No files found');
      } catch (err) {
        return errorResult(`Failed to search files: ${(err as Error).message}`);
      }
    },
  });
}
