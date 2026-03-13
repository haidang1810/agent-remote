import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';

export function registerDockerComposeListTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'docker_compose_list',
    category: 'docker',
    description: 'List Docker Compose projects and their status',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'docker_compose_list',
    description: 'List Docker Compose projects and their status',
    schema: {
      projectDir: z.string().optional().describe('Optional project directory to filter results'),
    },
    async handler(args) {
      if (args.projectDir) {
        const check = isPathAllowed(args.projectDir as string);
        if (!check.allowed) {
          return errorResult(`Path not allowed: ${check.reason}`);
        }
      }

      try {
        const output = await safeExec('docker compose ls --format json');

        // Parse JSON array output
        let parsed: unknown;
        try {
          parsed = JSON.parse(output);
        } catch {
          // Fallback: return raw output if not valid JSON
          return textResult(output || '(no Docker Compose projects found)');
        }

        return textResult(JSON.stringify(parsed, null, 2));
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('not found') || msg.includes('No such file')) {
          return errorResult('Docker Compose is not available (not installed or not in PATH)');
        }
        if (msg.includes('ENOENT') || msg.includes('connect')) {
          return errorResult('Docker is not available (not installed or daemon not running)');
        }
        return errorResult(`docker_compose_list error: ${msg}`);
      }
    },
  });
}
