import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LINES = 2000;
const DEFAULT_LINES = 500;

export function registerFileReadTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'file_read',
    category: 'filesystem',
    description: 'Read file content with optional line range and line numbers',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'file_read',
    description: 'Read file content with optional line range and line numbers',
    schema: {
      path: z.string().describe('Absolute file path to read'),
      startLine: z.number().int().min(1).optional().describe('Start line number (default: 1)'),
      maxLines: z.number().int().min(1).max(MAX_LINES).optional().describe(`Max lines to read (default: ${DEFAULT_LINES}, max: ${MAX_LINES})`),
    },
    async handler(args) {
      try {
        const filePath = resolve(args.path as string);

        const check = isPathAllowed(filePath);
        if (!check.allowed) return errorResult(check.reason!);

        const stat = statSync(filePath);
        if (!stat.isFile()) return errorResult(`Not a file: ${filePath}`);
        if (stat.size > MAX_FILE_SIZE) {
          return errorResult(`File too large: ${stat.size} bytes (max ${MAX_FILE_SIZE})`);
        }

        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const startIdx = ((args.startLine as number) ?? 1) - 1;
        const max = (args.maxLines as number) ?? DEFAULT_LINES;
        const slice = lines.slice(startIdx, startIdx + max);

        const numbered = slice.map((line, i) => `${startIdx + i + 1}: ${line}`).join('\n');
        return textResult(numbered);
      } catch (err) {
        return errorResult(`Failed to read file: ${(err as Error).message}`);
      }
    },
  });
}
