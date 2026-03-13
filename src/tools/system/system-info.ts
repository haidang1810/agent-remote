import os from 'node:os';
import si from 'systeminformation';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

export function registerSystemInfoTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'system_info',
    category: 'system',
    description: 'Get system info: hostname, platform, uptime, CPU, memory, disks, load average',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'system_info',
    description: 'Get system info: hostname, platform, uptime, CPU, memory, disks, load average',
    schema: {},
    async handler() {
      try {
        const [cpu, mem, disk] = await Promise.all([
          si.currentLoad(),
          si.mem(),
          si.fsSize(),
        ]);
        const info = {
          hostname: os.hostname(),
          platform: `${os.type()} ${os.release()}`,
          uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`,
          cpu: {
            model: os.cpus()[0]?.model ?? 'unknown',
            cores: os.cpus().length,
            loadPercent: Math.round(cpu.currentLoad * 100) / 100,
          },
          memory: {
            totalGB: Math.round((mem.total / 1073741824) * 100) / 100,
            usedGB: Math.round((mem.used / 1073741824) * 100) / 100,
            usedPercent: Math.round((mem.used / mem.total) * 10000) / 100,
          },
          disks: disk.map((d) => ({
            mount: d.mount,
            totalGB: Math.round((d.size / 1073741824) * 100) / 100,
            usedGB: Math.round((d.used / 1073741824) * 100) / 100,
            usedPercent: Math.round(d.use * 100) / 100,
          })),
          loadAverage: os.loadavg().map((l) => Math.round(l * 100) / 100),
        };
        return textResult(JSON.stringify(info, null, 2));
      } catch (err) {
        return errorResult(`Failed to get system info: ${(err as Error).message}`);
      }
    },
  });
}
