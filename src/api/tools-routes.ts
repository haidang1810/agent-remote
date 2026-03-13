import type { FastifyInstance } from 'fastify';
import { findAllTools, findToolByName, toggleToolEnabled } from '../db/models/tool-model.js';
import { queryAuditLogs } from '../db/models/audit-log-model.js';

export async function registerToolsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);

  // GET /api/tools — list all tools grouped by category
  app.get('/api/tools', async () => {
    const tools = findAllTools(app.db);
    const grouped: Record<string, typeof tools> = {};
    for (const tool of tools) {
      (grouped[tool.category] ??= []).push(tool);
    }
    return { data: grouped };
  });

  // GET /api/tools/:name — tool detail + recent calls
  app.get<{ Params: { name: string } }>('/api/tools/:name', async (request, reply) => {
    const tool = findToolByName(app.db, request.params.name);
    if (!tool) return reply.status(404).send({ error: 'Tool not found' });

    const recentLogs = queryAuditLogs(app.db, { tool_name: tool.name, limit: 10 });
    return { data: { ...tool, recentCalls: recentLogs } };
  });

  // PUT /api/tools/:name — toggle enabled
  app.put<{ Params: { name: string }; Body: { enabled: boolean } }>(
    '/api/tools/:name',
    async (request, reply) => {
      const tool = findToolByName(app.db, request.params.name);
      if (!tool) return reply.status(404).send({ error: 'Tool not found' });

      toggleToolEnabled(app.db, request.params.name, request.body.enabled);
      return { data: { ...tool, enabled: request.body.enabled ? 1 : 0 } };
    },
  );
}
