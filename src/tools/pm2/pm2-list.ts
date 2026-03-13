import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';

interface Pm2Process {
  name: string;
  pm_id: number;
  pm2_env?: {
    status?: string;
    created_at?: number;
    restart_time?: number;
    pm_uptime?: number;
  };
  monit?: {
    cpu?: number;
    memory?: number;
  };
}

function formatMemory(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)}MB`;
}

function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function registerPm2ListTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'pm2_list',
    category: 'pm2',
    description: 'List all PM2 managed processes with their status, CPU, memory, and uptime',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'pm2_list',
    description: 'List all PM2 managed processes with their status, CPU, memory, and uptime',
    schema: {
      _placeholder: z.undefined().optional(),
    },
    async handler(_args) {
      try {
        const output = await safeExec('pm2 jlist');
        if (output.includes('command not found') || output.includes('not found')) {
          return errorResult('PM2 is not installed');
        }

        let processes: Pm2Process[];
        try {
          processes = JSON.parse(output) as Pm2Process[];
        } catch {
          // PM2 not installed or no output
          if (!output || output.trim() === '') {
            return textResult('No PM2 processes running');
          }
          return errorResult(`Failed to parse PM2 output: ${output}`);
        }

        if (processes.length === 0) {
          return textResult('No PM2 processes found');
        }

        const rows = processes.map((proc) => {
          const env = proc.pm2_env ?? {};
          const monit = proc.monit ?? {};
          const status = env.status ?? 'unknown';
          const cpu = monit.cpu !== undefined ? `${monit.cpu}%` : 'N/A';
          const memory = monit.memory !== undefined ? formatMemory(monit.memory) : 'N/A';
          const uptime =
            env.status === 'online' && env.pm_uptime !== undefined
              ? formatUptime(Date.now() - env.pm_uptime)
              : 'N/A';
          const restarts = env.restart_time ?? 0;

          return `  ${proc.pm_id}\t${proc.name}\t${status}\t${cpu}\t${memory}\tuptime:${uptime}\trestarts:${restarts}`;
        });

        const header = '  ID\tName\tStatus\tCPU\tMemory\tUptime\tRestarts';
        return textResult(`PM2 Processes:\n${header}\n${rows.join('\n')}`);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('command not found') || msg.includes('not found')) {
          return errorResult('PM2 is not installed');
        }
        return errorResult(`Failed to list PM2 processes: ${msg}`);
      }
    },
  });
}
