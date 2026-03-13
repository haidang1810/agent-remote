import type Database from 'better-sqlite3';
import { z } from 'zod';
import Dockerode from 'dockerode';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';

interface DockerStats {
  cpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number; online_cpus?: number };
  precpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number };
  memory_stats: { usage: number; limit: number };
  networks?: Record<string, { rx_bytes: number; tx_bytes: number }>;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GiB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MiB`;
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

function calcCpuPercent(stats: DockerStats): number {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const numCpus = stats.cpu_stats.online_cpus ?? 1;
  if (systemDelta <= 0 || cpuDelta < 0) return 0;
  return Math.round((cpuDelta / systemDelta) * numCpus * 10000) / 100;
}

export function registerDockerContainerStatsTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'docker_container_stats',
    category: 'docker',
    description: 'Get CPU, memory, and network I/O stats for Docker container(s)',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'docker_container_stats',
    description: 'Get CPU, memory, and network I/O stats for Docker container(s)',
    schema: {
      container: z.string().optional().describe('Container name or ID. Omit to get stats for all running containers.'),
    },
    async handler(args) {
      try {
        if (!args.container) {
          // All containers: use CLI for simplicity
          const output = await safeExec('docker stats --no-stream --format "{{json .}}"');
          const lines = output.split('\n').filter(Boolean);
          const parsed = lines.map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return { raw: line };
            }
          });
          return textResult(JSON.stringify(parsed, null, 2));
        }

        const docker = new Dockerode();
        const container = docker.getContainer(args.container as string);
        const rawStats = await container.stats({ stream: false });
        const stats = rawStats as unknown as DockerStats;

        const netIO = Object.values(stats.networks ?? {}).reduce(
          (acc, n) => ({ rx: acc.rx + n.rx_bytes, tx: acc.tx + n.tx_bytes }),
          { rx: 0, tx: 0 },
        );

        const result = {
          container: args.container,
          cpu: { percent: calcCpuPercent(stats) },
          memory: {
            usage: formatBytes(stats.memory_stats.usage),
            limit: formatBytes(stats.memory_stats.limit),
            percent: Math.round((stats.memory_stats.usage / stats.memory_stats.limit) * 10000) / 100,
          },
          network: {
            rxBytes: formatBytes(netIO.rx),
            txBytes: formatBytes(netIO.tx),
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
        return errorResult(`docker_container_stats error: ${msg}`);
      }
    },
  });
}
