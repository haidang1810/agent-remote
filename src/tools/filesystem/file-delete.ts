import { statSync, unlinkSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

export function registerFileDeleteTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'file_delete',
    category: 'filesystem',
    description: 'Delete a file (directories are not supported)',
    risk_level: 'high',
  });

  addToolDefinition({
    name: 'file_delete',
    description: 'Delete a file (directories are not supported)',
    schema: {
      path: z.string().describe('Absolute path to the file to delete'),
    },
    async handler(args) {
      try {
        const filePath = resolve(args.path as string);

        const check = isPathAllowed(filePath);
        if (!check.allowed) return errorResult(check.reason!);

        const stat = statSync(filePath);
        if (!stat.isFile()) {
          return errorResult(`Not a file: ${filePath} — only files can be deleted`);
        }

        const { size } = stat;
        unlinkSync(filePath);

        return textResult(`Deleted ${basename(filePath)} (${size} bytes)`);
      } catch (err) {
        return errorResult(`Failed to delete file: ${(err as Error).message}`);
      }
    },
  });
}
