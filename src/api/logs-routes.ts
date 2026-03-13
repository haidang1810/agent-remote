import type { FastifyInstance } from 'fastify';
import { queryAuditLogs, cleanupAuditLogs } from '../db/models/audit-log-model.js';
import type { AuditLog } from '../db/types.js';

export async function registerLogsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);

  // GET /api/logs — paginated, filterable
  app.get<{
    Querystring: {
      keyId?: string; tool?: string; status?: string;
      from?: string; to?: string; page?: string; limit?: string;
    };
  }>('/api/logs', async (request) => {
    const { keyId, tool, status, from, to } = request.query;
    const page = Math.max(1, parseInt(request.query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '20', 10)));
    const offset = (page - 1) * limit;

    const logs = queryAuditLogs(app.db, {
      api_key_id: keyId ? parseInt(keyId, 10) : undefined,
      tool_name: tool,
      status,
      from: from ? parseInt(from, 10) : undefined,
      to: to ? parseInt(to, 10) : undefined,
      limit: limit + 1, // fetch one extra to detect next page
      offset,
    });

    const hasMore = logs.length > limit;
    if (hasMore) logs.pop();

    return { data: logs, meta: { page, limit, hasMore } };
  });

  // GET /api/logs/export — CSV export
  app.get<{
    Querystring: { from?: string; to?: string; tool?: string };
  }>('/api/logs/export', async (request, reply) => {
    const logs = queryAuditLogs(app.db, {
      from: request.query.from ? parseInt(request.query.from, 10) : undefined,
      to: request.query.to ? parseInt(request.query.to, 10) : undefined,
      tool_name: request.query.tool,
      limit: 10000,
    });

    const header = 'id,timestamp,api_key_name,tool_name,status,duration_ms,ip_address\n';
    const rows = logs.map((l: AuditLog) =>
      `${l.id},${l.created_at},${l.api_key_name ?? ''},${l.tool_name},${l.status},${l.duration_ms ?? ''},${l.ip_address ?? ''}`,
    ).join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename=audit-logs.csv');
    return header + rows;
  });

  // GET /api/logs/:id — full detail
  app.get<{ Params: { id: string } }>('/api/logs/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    const logs = app.db.prepare('SELECT * FROM audit_logs WHERE id = ?').all(id) as AuditLog[];
    if (logs.length === 0) return reply.status(404).send({ error: 'Log not found' });
    return { data: logs[0] };
  });

  // DELETE /api/logs — cleanup old logs
  app.delete<{ Querystring: { days?: string } }>('/api/logs', async (request) => {
    const days = parseInt(request.query.days ?? '30', 10);
    const deleted = cleanupAuditLogs(app.db, days);
    return { data: { deleted } };
  });
}
