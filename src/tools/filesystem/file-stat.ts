import { statSync, lstatSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

/** Format bytes to human-readable string */
function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)}MB`;
  return `${(bytes / 1073741824).toFixed(2)}GB`;
}

export function registerFileStatTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'file_stat',
    category: 'filesystem',
    description: 'Get file or directory metadata: size, permissions, owner, timestamps',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'file_stat',
    description: 'Get file or directory metadata: size, permissions, owner, timestamps',
    schema: {
      path: z.string().describe('Absolute path to the file or directory'),
    },
    async handler(args) {
      try {
        const filePath = resolve(args.path as string);

        const check = isPathAllowed(filePath);
        if (!check.allowed) return errorResult(check.reason!);

        const stat = lstatSync(filePath);

        let type: string;
        if (stat.isSymbolicLink()) type = 'symlink';
        else if (stat.isDirectory()) type = 'dir';
        else type = 'file';

        const result = {
          name: basename(filePath),
          path: filePath,
          size: humanSize(stat.size),
          permissions: `0${(stat.mode & 0o777).toString(8)}`,
          owner: { uid: stat.uid, gid: stat.gid },
          type,
          mtime: stat.mtime.toISOString(),
          atime: stat.atime.toISOString(),
          ctime: stat.ctime.toISOString(),
        };

        return textResult(JSON.stringify(result, null, 2));
      } catch (err) {
        return errorResult(`Failed to stat path: ${(err as Error).message}`);
      }
    },
  });
}
