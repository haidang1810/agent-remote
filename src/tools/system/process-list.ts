import si from 'systeminformation';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

export function registerProcessListTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'process_list',
    category: 'system',
    description: 'List running processes sorted by CPU or memory usage',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'process_list',
    description: 'List running processes sorted by CPU or memory usage',
    schema: {
      sortBy: z.enum(['cpu', 'memory']).optional().describe('Sort field: cpu or memory (default: cpu)'),
      limit: z.number().min(1).max(100).optional().describe('Max processes to return (default: 20)'),
      filter: z.string().optional().describe('Filter by process name (case-insensitive substring)'),
    },
    async handler(args) {
      try {
        const sortBy = (args.sortBy as string) ?? 'cpu';
        const limit = (args.limit as number) ?? 20;
        const filter = args.filter as string | undefined;

        const data = await si.processes();
        let procs = data.list;

        if (filter) {
          procs = procs.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));
        }

        procs.sort((a, b) => sortBy === 'cpu' ? b.cpu - a.cpu : b.mem - a.mem);
        procs = procs.slice(0, limit);

        const lines = procs.map(
          (p) => `PID:${p.pid} CPU:${p.cpu.toFixed(1)}% MEM:${p.mem.toFixed(1)}% ${p.name}  ${p.command ?? ''}`.trimEnd(),
        );
        return textResult(lines.join('\n') || 'No processes found');
      } catch (err) {
        return errorResult(`Failed to list processes: ${(err as Error).message}`);
      }
    },
  });
}
