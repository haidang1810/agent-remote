import type Database from 'better-sqlite3';
import { z } from 'zod';
import Dockerode from 'dockerode';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';

export function registerDockerContainerRestartTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'docker_container_restart',
    category: 'docker',
    description: 'Restart a Docker container',
    risk_level: 'high',
  });

  addToolDefinition({
    name: 'docker_container_restart',
    description: 'Restart a Docker container',
    schema: {
      container: z.string().describe('Container name or ID to restart'),
    },
    async handler(args) {
      try {
        const docker = new Dockerode();
        const container = docker.getContainer(args.container as string);
        await container.restart();

        // Fetch updated status
        const info = await container.inspect();
        const result = {
          container: args.container,
          action: 'restarted',
          state: info.State?.Status,
          running: info.State?.Running,
          startedAt: info.State?.StartedAt,
        };

        return textResult(JSON.stringify(result, null, 2));
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('No such container')) {
          return errorResult(`Container "${args.container}" not found`);
        }
        if (msg.includes('ENOENT') || msg.includes('connect')) {
          return errorResult('Docker is not available (not installed or daemon not running)');
        }
        return errorResult(`docker_container_restart error: ${msg}`);
      }
    },
  });
}
