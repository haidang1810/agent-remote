import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec, isValidName } from '../_shared/exec-wrapper.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';

export function registerDockerComposeUpTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'docker_compose_up',
    category: 'docker',
    description: 'Start Docker Compose services in detached mode (docker compose up -d)',
    risk_level: 'high',
  });

  addToolDefinition({
    name: 'docker_compose_up',
    description: 'Start Docker Compose services in detached mode (docker compose up -d)',
    schema: {
      projectDir: z.string().describe('Absolute path to directory containing docker-compose.yml'),
      service: z.string().optional().describe('Specific service name to start (omit to start all services)'),
    },
    async handler(args) {
      const projectDir = args.projectDir as string;
      const check = isPathAllowed(projectDir);
      if (!check.allowed) {
        return errorResult(`Path not allowed: ${check.reason}`);
      }

      if (args.service && !isValidName(args.service as string)) {
        return errorResult(`Invalid service name: "${args.service}". Only alphanumeric, dots, dashes, underscores, @ allowed.`);
      }

      // Escape project dir for shell
      const escapedDir = `'${projectDir.replace(/'/g, "'\\''")}'`;
      let cmd = `docker compose -f ${escapedDir}/docker-compose.yml up -d`;

      if (args.service) {
        cmd += ` ${args.service as string}`;
      }

      try {
        const output = await safeExec(cmd, { timeout: 60_000, cwd: projectDir });
        return textResult(output || 'Docker Compose up completed successfully');
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('No such file') && msg.includes('docker-compose.yml')) {
          return errorResult(`docker-compose.yml not found in: ${projectDir}`);
        }
        if (msg.includes('timed out')) {
          return errorResult('docker compose up timed out after 60 seconds');
        }
        if (msg.includes('ENOENT') || msg.includes('connect')) {
          return errorResult('Docker is not available (not installed or daemon not running)');
        }
        return errorResult(`docker_compose_up error: ${msg}`);
      }
    },
  });
}
