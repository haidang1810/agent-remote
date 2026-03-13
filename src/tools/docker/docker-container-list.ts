import type Database from 'better-sqlite3';
import { z } from 'zod';
import Dockerode from 'dockerode';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';

export function registerDockerContainerListTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'docker_container_list',
    category: 'docker',
    description: 'List Docker containers with name, image, status, state, and port mappings',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'docker_container_list',
    description: 'List Docker containers with name, image, status, state, and port mappings',
    schema: {
      all: z.boolean().optional().describe('Include stopped containers (default: false)'),
    },
    async handler(args) {
      try {
        const docker = new Dockerode();
        const containers = await docker.listContainers({ all: (args.all as boolean) ?? false });

        const result = containers.map((c) => ({
          name: c.Names?.[0]?.replace(/^\//, '') ?? 'unknown',
          image: c.Image,
          status: c.Status,
          state: c.State,
          ports: c.Ports?.map((p) =>
            p.PublicPort ? `${p.IP ?? '0.0.0.0'}:${p.PublicPort}->${p.PrivatePort}/${p.Type}` : `${p.PrivatePort}/${p.Type}`,
          ).filter(Boolean),
        }));

        return textResult(JSON.stringify(result, null, 2));
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('ENOENT') || msg.includes('EACCES') || msg.includes('connect')) {
          return errorResult('Docker is not available (not installed or daemon not running)');
        }
        return errorResult(`docker_container_list error: ${msg}`);
      }
    },
  });
}
