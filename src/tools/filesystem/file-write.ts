import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

export function registerFileWriteTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'file_write',
    category: 'filesystem',
    description: 'Write or overwrite a file with the given content',
    risk_level: 'high',
  });

  addToolDefinition({
    name: 'file_write',
    description: 'Write or overwrite a file with the given content',
    schema: {
      path: z.string().describe('Absolute file path to write'),
      content: z.string().describe('File content to write'),
      createDirs: z.boolean().optional().describe('Create parent directories if missing (default: false)'),
    },
    async handler(args) {
      try {
        const filePath = resolve(args.path as string);

        const check = isPathAllowed(filePath);
        if (!check.allowed) return errorResult(check.reason!);

        const content = args.content as string;

        if (args.createDirs) {
          mkdirSync(dirname(filePath), { recursive: true });
        }

        writeFileSync(filePath, content, 'utf-8');
        const bytes = Buffer.byteLength(content, 'utf-8');
        return textResult(`Written ${bytes} bytes to ${filePath}`);
      } catch (err) {
        return errorResult(`Failed to write file: ${(err as Error).message}`);
      }
    },
  });
}
