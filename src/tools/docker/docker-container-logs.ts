import type Database from 'better-sqlite3';
import { z } from 'zod';
import Dockerode from 'dockerode';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';

/** Strip Docker log multiplexed stream headers (8-byte header per chunk) */
function stripDockerLogHeaders(buf: Buffer): string {
  const lines: string[] = [];
  let offset = 0;

  while (offset < buf.length) {
    // Each chunk: 1 byte stream type, 3 bytes padding, 4 bytes big-endian size
    if (offset + 8 > buf.length) break;
    const size = buf.readUInt32BE(offset + 4);
    offset += 8;

    if (size > 0 && offset + size <= buf.length) {
      lines.push(buf.subarray(offset, offset + size).toString('utf-8'));
    }
    offset += size;
  }

  // Fallback: if parsing failed or output looks like plain text, return as-is
  return lines.length > 0 ? lines.join('') : buf.toString('utf-8');
}

export function registerDockerContainerLogsTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'docker_container_logs',
    category: 'docker',
    description: 'Retrieve stdout/stderr logs from a Docker container',
    risk_level: 'medium',
  });

  addToolDefinition({
    name: 'docker_container_logs',
    description: 'Retrieve stdout/stderr logs from a Docker container',
    schema: {
      container: z.string().describe('Container name or ID'),
      lines: z.number().min(1).max(1000).optional().describe('Number of log lines to return (default: 100)'),
      since: z.string().optional().describe('Show logs since timestamp or duration (e.g. "2024-01-01T00:00:00Z", "1h")'),
    },
    async handler(args) {
      try {
        const docker = new Dockerode();
        const container = docker.getContainer(args.container as string);
        const lines = Math.min((args.lines as number) ?? 100, 1000);

        const opts = {
          stdout: true,
          stderr: true,
          tail: lines,
          follow: false as const,
          ...(args.since ? { since: args.since as string } : {}),
        };

        const logBuffer = await container.logs(opts);
        const logText = stripDockerLogHeaders(logBuffer as unknown as Buffer);

        return textResult(logText.trim() || '(no logs)');
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('No such container')) {
          return errorResult(`Container "${args.container}" not found`);
        }
        if (msg.includes('ENOENT') || msg.includes('connect')) {
          return errorResult('Docker is not available (not installed or daemon not running)');
        }
        return errorResult(`docker_container_logs error: ${msg}`);
      }
    },
  });
}
