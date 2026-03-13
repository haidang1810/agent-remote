import type { FastifyInstance } from 'fastify';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { extractApiKey, validateApiKey } from '../auth/api-key-auth.js';
import { registerToolsForKey } from './tool-registry.js';
import { SessionManager } from './session-manager.js';

const sessionManager = new SessionManager();


export async function registerMcpRoutes(app: FastifyInstance): Promise<void> {
  // POST /mcp — handle MCP requests (initialize + tool calls)
  app.post('/mcp', async (request, reply) => {
    const rawKey = request.headers['x-api-key'] as string | undefined
      ?? extractApiKey(request.headers as Record<string, string | string[] | undefined>);

    if (!rawKey) {
      reply.code(401).send({ error: 'API key required. Use x-api-key header.' });
      return;
    }

    const validation = validateApiKey(app.db, rawKey);
    if (!validation.valid) {
      reply.code(401).send({ error: validation.reason });
      return;
    }

    const sessionId = request.headers['mcp-session-id'] as string | undefined;
    const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? request.ip ?? 'unknown';

    // Hijack response — we handle streaming ourselves via the SDK
    reply.hijack();
    const raw = request.raw;
    const res = reply.raw;
    const parsedBody = request.body;

    // Existing session
    if (sessionId) {
      const session = sessionManager.get(sessionId);
      if (!session) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session expired or not found' }));
        return;
      }
      await session.transport.handleRequest(raw, res, parsedBody);
      return;
    }

    // New session — create McpServer + transport
    const mcpServer = new McpServer({
      name: 'agent-remote',
      version: '0.1.0',
    });

    registerToolsForKey(mcpServer, app.db, validation.key, clientIp);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    await mcpServer.connect(transport);

    transport.onclose = () => {
      if (transport.sessionId) {
        sessionManager.destroy(transport.sessionId);
      }
    };

    await transport.handleRequest(raw, res, parsedBody);

    // Store session after first request completes
    if (transport.sessionId) {
      sessionManager.set(transport.sessionId, {
        transport,
        server: mcpServer as unknown as import('@modelcontextprotocol/sdk/server/index.js').Server,
        keyId: validation.key.id,
        lastActivity: Date.now(),
      });
    }
  });

  // GET /mcp — SSE stream for server-initiated messages
  app.get('/mcp', async (request, reply) => {
    const sessionId = request.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      reply.code(400).send({ error: 'Mcp-Session-Id header required' });
      return;
    }

    const session = sessionManager.get(sessionId);
    if (!session) {
      reply.code(404).send({ error: 'Session not found' });
      return;
    }

    reply.hijack();
    await session.transport.handleRequest(request.raw, reply.raw);
  });

  // DELETE /mcp — session termination
  app.delete('/mcp', (request, reply) => {
    const sessionId = request.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      reply.code(400).send({ error: 'Mcp-Session-Id header required' });
      return;
    }

    sessionManager.destroy(sessionId);
    reply.code(204).send();
  });

  // Start session cleanup timer
  sessionManager.start();

  app.addHook('onClose', () => {
    sessionManager.stop();
  });
}
