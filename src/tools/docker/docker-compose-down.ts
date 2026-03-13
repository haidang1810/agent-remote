import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';

export function registerDockerComposeDownTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'docker_compose_down',
    category: 'docker',
    description: 'Stop and remove Docker Compose services (docker compose down)',
    risk_level: 'high',
  });

  addToolDefinition({
    name: 'docker_compose_down',
    description: 'Stop and remove Docker Compose services (docker compose down)',
    schema: {
      projectDir: z.string().describe('Absolute path to directory containing docker-compose.yml'),
      volumes: z.boolean().optional().describe('Also remove named volumes declared in the compose file (default: false)'),
    },
    async handler(args) {
      const projectDir = args.projectDir as string;
      const check = isPathAllowed(projectDir);
      if (!check.allowed) {
        return errorResult(`Path not allowed: ${check.reason}`);
      }

      // Escape project dir for shell
      const escapedDir = `'${projectDir.replace(/'/g, "'\\''")}'`;
      let cmd = `docker compose -f ${escapedDir}/docker-compose.yml down`;

      if (args.volumes === true) {
        cmd += ' --volumes';
      }

      try {
        const output = await safeExec(cmd, { timeout: 60_000, cwd: projectDir });
        return textResult(output || 'Docker Compose down completed successfully');
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('No such file') && msg.includes('docker-compose.yml')) {
          return errorResult(`docker-compose.yml not found in: ${projectDir}`);
        }
        if (msg.includes('timed out')) {
          return errorResult('docker compose down timed out after 60 seconds');
        }
        if (msg.includes('ENOENT') || msg.includes('connect')) {
          return errorResult('Docker is not available (not installed or daemon not running)');
        }
        return errorResult(`docker_compose_down error: ${msg}`);
      }
    },
  });
}
