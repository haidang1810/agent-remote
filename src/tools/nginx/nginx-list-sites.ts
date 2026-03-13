import type Database from 'better-sqlite3';
import { z } from 'zod';
import { readdirSync, lstatSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';

export function registerNginxListSitesTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'nginx_list_sites',
    category: 'nginx',
    description: 'List nginx sites from sites-enabled or sites-available directory',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'nginx_list_sites',
    description: 'List nginx sites from sites-enabled or sites-available directory',
    schema: {
      type: z
        .enum(['enabled', 'available'])
        .optional()
        .default('enabled')
        .describe('Which directory to list: sites-enabled (default) or sites-available'),
    },
    async handler(args) {
      const type = (args.type as string) ?? 'enabled';
      const dir = `/etc/nginx/sites-${type}`;

      try {
        const entries = readdirSync(dir);

        if (entries.length === 0) {
          return textResult(`No sites found in ${dir}`);
        }

        const rows = entries.map((entry) => {
          const fullPath = join(dir, entry);
          let size = 'N/A';
          let isSymlink = false;

          try {
            const lstat = lstatSync(fullPath);
            isSymlink = lstat.isSymbolicLink();
            // For symlinks get the real file size; for regular files use lstat
            const stat = isSymlink ? statSync(fullPath) : lstat;
            size = `${stat.size}B`;
          } catch {
            // File may have been removed between readdir and stat
          }

          const symFlag = isSymlink ? ' (symlink)' : '';
          return `  ${entry}  [${size}]${symFlag}`;
        });

        return textResult(`Nginx sites in ${dir}:\n${rows.join('\n')}`);
      } catch (err) {
        const msg = (err as NodeJS.ErrnoException).message;
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          return errorResult(`Directory not found: ${dir}`);
        }
        if ((err as NodeJS.ErrnoException).code === 'EACCES') {
          return errorResult(`Permission denied reading: ${dir}`);
        }
        return errorResult(`Failed to list nginx sites: ${msg}`);
      }
    },
  });
}
