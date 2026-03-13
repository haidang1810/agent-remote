import type { FastifyInstance } from 'fastify';
import os from 'node:os';
import si from 'systeminformation';
import { findAllKeys } from '../db/models/api-key-model.js';
import { findAllTools } from '../db/models/tool-model.js';
import { queryAuditLogs } from '../db/models/audit-log-model.js';

export async function registerOverviewRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);

  // GET /api/overview — aggregated dashboard stats
  app.get('/api/overview', async () => {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400;

    // Counts
    const keys = findAllKeys(app.db);
    const tools = findAllTools(app.db);
    const activeKeys = keys.filter((k) => k.active);
    const enabledTools = tools.filter((t) => t.enabled);

    // Last 24h logs
    const recentLogs = queryAuditLogs(app.db, { from: dayAgo, limit: 1000 });
    const totalCalls = recentLogs.length;
    const successCalls = recentLogs.filter((l) => l.status === 'success').length;
    const errorCalls = recentLogs.filter((l) => l.status === 'error').length;
    const deniedCalls = recentLogs.filter((l) => l.status === 'denied').length;

    // Recent activity feed
    const activity = queryAuditLogs(app.db, { limit: 10 });

    // System gauges
    const [cpu, mem] = await Promise.all([si.currentLoad(), si.mem()]);

    return {
      data: {
        keys: { total: keys.length, active: activeKeys.length },
        tools: { total: tools.length, enabled: enabledTools.length },
        calls24h: { total: totalCalls, success: successCalls, error: errorCalls, denied: deniedCalls },
        system: {
          cpuLoad: Math.round(cpu.currentLoad * 100) / 100,
          memoryPercent: Math.round((mem.used / mem.total) * 10000) / 100,
          uptime: os.uptime(),
        },
        recentActivity: activity,
      },
    };
  });
}
