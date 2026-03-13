import type Database from 'better-sqlite3';
import { z } from 'zod';
import Dockerode from 'dockerode';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';

export function registerDockerContainerStopTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'docker_container_stop',
    category: 'docker',
    description: 'Stop a running Docker container with optional timeout',
    risk_level: 'high',
  });

  addToolDefinition({
    name: 'docker_container_stop',
    description: 'Stop a running Docker container with optional timeout',
    schema: {
      container: z.string().describe('Container name or ID to stop'),
      timeout: z.number().min(0).max(300).optional().describe('Seconds to wait before killing container (default: 10)'),
    },
    async handler(args) {
      try {
        const docker = new Dockerode();
        const container = docker.getContainer(args.container as string);
        const timeout = (args.timeout as number) ?? 10;

        await container.stop({ t: timeout });

        // Fetch updated status
        const info = await container.inspect();
        const result = {
          container: args.container,
          action: 'stopped',
          state: info.State?.Status,
          running: info.State?.Running,
          finishedAt: info.State?.FinishedAt,
          exitCode: info.State?.ExitCode,
        };

        return textResult(JSON.stringify(result, null, 2));
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('No such container')) {
          return errorResult(`Container "${args.container}" not found`);
        }
        if (msg.includes('not running') || msg.includes('304')) {
          return errorResult(`Container "${args.container}" is not running`);
        }
        if (msg.includes('ENOENT') || msg.includes('connect')) {
          return errorResult('Docker is not available (not installed or daemon not running)');
        }
        return errorResult(`docker_container_stop error: ${msg}`);
      }
    },
  });
}
