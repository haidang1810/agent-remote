import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec, isValidName } from '../_shared/exec-wrapper.js';

interface Pm2Process {
  name: string;
  pm_id: number;
  pm2_env?: { status?: string; restart_time?: number };
}

function getProcessStatus(processes: Pm2Process[], appName: string): string {
  const proc = processes.find((p) => p.name === appName);
  if (!proc) return `App "${appName}" not found in PM2 list`;
  const status = proc.pm2_env?.status ?? 'unknown';
  const restarts = proc.pm2_env?.restart_time ?? 0;
  return `App: ${proc.name} | ID: ${proc.pm_id} | Status: ${status} | Restarts: ${restarts}`;
}

export function registerPm2StopTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'pm2_stop',
    category: 'pm2',
    description: 'Stop a PM2 managed application by name',
    risk_level: 'high',
  });

  addToolDefinition({
    name: 'pm2_stop',
    description: 'Stop a PM2 managed application by name',
    schema: {
      appName: z.string().describe('PM2 application name to stop'),
    },
    async handler(args) {
      const appName = args.appName as string;
      if (!isValidName(appName)) {
        return errorResult(`Invalid app name: "${appName}". Only alphanumeric, dots, dashes, underscores, @ allowed.`);
      }

      try {
        await safeExec(`pm2 stop ${appName}`);

        const listOutput = await safeExec('pm2 jlist');
        const processes = JSON.parse(listOutput) as Pm2Process[];
        const status = getProcessStatus(processes, appName);
        return textResult(`Stopped "${appName}" successfully.\n${status}`);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('command not found') || msg.includes('not found')) {
          return errorResult('PM2 is not installed');
        }
        return errorResult(`Failed to stop "${appName}": ${msg}`);
      }
    },
  });
}
