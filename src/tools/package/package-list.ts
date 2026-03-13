import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';

export function registerPackageListTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'package_list',
    category: 'package',
    description: 'List installed packages using dpkg or rpm, with optional filter',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'package_list',
    description: 'List installed packages using dpkg or rpm, with optional filter',
    schema: {
      filter: z.string().optional().describe('Optional string to filter package names'),
    },
    async handler(args) {
      const filter = args.filter as string | undefined;
      try {
        let output: string;
        try {
          const cmd = filter
            ? `dpkg --list | grep -i ${JSON.stringify(filter)}`
            : 'dpkg --list';
          output = await safeExec(cmd);
        } catch {
          // fallback to rpm
          const cmd = filter
            ? `rpm -qa | grep -i ${JSON.stringify(filter)}`
            : 'rpm -qa';
          output = await safeExec(cmd);
        }
        return textResult(output || 'No packages found');
      } catch (err) {
        return errorResult(`Failed to list packages: ${(err as Error).message}`);
      }
    },
  });
}
