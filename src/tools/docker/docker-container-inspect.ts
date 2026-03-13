import type Database from 'better-sqlite3';
import { z } from 'zod';
import Dockerode from 'dockerode';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';

export function registerDockerContainerInspectTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'docker_container_inspect',
    category: 'docker',
    description: 'Inspect a Docker container: id, name, image, state, network, mounts, config',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'docker_container_inspect',
    description: 'Inspect a Docker container: id, name, image, state, network, mounts, config',
    schema: {
      container: z.string().describe('Container name or ID'),
    },
    async handler(args) {
      try {
        const docker = new Dockerode();
        const info = await docker.getContainer(args.container as string).inspect();

        const result = {
          id: info.Id?.slice(0, 12),
          name: info.Name?.replace(/^\//, ''),
          image: info.Config?.Image,
          created: info.Created,
          state: {
            status: info.State?.Status,
            running: info.State?.Running,
            paused: info.State?.Paused,
            restarting: info.State?.Restarting,
            startedAt: info.State?.StartedAt,
            finishedAt: info.State?.FinishedAt,
            exitCode: info.State?.ExitCode,
          },
          network: Object.entries(info.NetworkSettings?.Networks ?? {}).map(([name, net]) => ({
            name,
            ip: (net as { IPAddress?: string }).IPAddress,
            gateway: (net as { Gateway?: string }).Gateway,
          })),
          mounts: info.Mounts?.map((m) => ({
            type: m.Type,
            source: m.Source,
            destination: m.Destination,
            mode: m.Mode,
            rw: m.RW,
          })),
          config: {
            env: info.Config?.Env,
            cmd: info.Config?.Cmd,
            entrypoint: info.Config?.Entrypoint,
            workingDir: info.Config?.WorkingDir,
            labels: info.Config?.Labels,
          },
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
        return errorResult(`docker_container_inspect error: ${msg}`);
      }
    },
  });
}
