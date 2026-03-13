import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';

export function registerNginxTestConfigTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'nginx_test_config',
    category: 'nginx',
    description: 'Test nginx configuration syntax and report errors',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'nginx_test_config',
    description: 'Test nginx configuration syntax and report errors',
    schema: {
      _placeholder: z.undefined().optional(),
    },
    async handler(_args) {
      try {
        // Try without sudo first, fall back to sudo
        let output = await safeExec('nginx -t 2>&1');
        if (output.includes('permission denied') || output.includes('Permission denied')) {
          output = await safeExec('sudo nginx -t 2>&1');
        }

        const success =
          output.includes('syntax is ok') && output.includes('test is successful');

        if (success) {
          return textResult(`Nginx config OK:\n${output}`);
        }

        return errorResult(`Nginx config test failed:\n${output}`);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('command not found') || msg.includes('not found')) {
          return errorResult('Nginx is not installed or not in PATH');
        }
        return errorResult(`Failed to test nginx config: ${msg}`);
      }
    },
  });
}
