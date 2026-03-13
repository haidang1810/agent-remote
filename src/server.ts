import Fastify from 'fastify';
import { config } from './config.js';
import { registerCors } from './plugins/cors.js';
import { registerRateLimit } from './plugins/rate-limit.js';
import dbPlugin from './plugins/db.js';
import jwtPlugin from './plugins/jwt.js';
import { registerAuthRoutes } from './api/auth-routes.js';
import { isInitialized, setupPassword } from './auth/admin-auth.js';
import { registerMcpRoutes } from './mcp/mcp-server.js';
import { registerAllTools } from './tools/register-all-tools.js';
import { registerKeysRoutes } from './api/keys-routes.js';
import { registerToolsRoutes } from './api/tools-routes.js';
import { registerLogsRoutes } from './api/logs-routes.js';
import { registerSystemRoutes } from './api/system-routes.js';
import { registerOverviewRoutes } from './api/overview-routes.js';
import websocketPlugin from './plugins/websocket.js';
import staticPlugin from './plugins/static.js';

const app = Fastify({
  logger: {
    level: 'info',
  },
});

// --- Health check ---
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// --- Register plugins ---
async function bootstrap(): Promise<void> {
  await registerCors(app);
  await registerRateLimit(app);
  await app.register(dbPlugin);
  await app.register(jwtPlugin);
  await registerAuthRoutes(app);

  // Auto-seed admin password from env on first boot
  if (!isInitialized(app.db) && config.adminPassword) {
    await setupPassword(app.db, config.adminPassword);
    app.log.info('Admin password initialized from ADMIN_PASSWORD env');
  }

  registerAllTools(app.db);
  await registerMcpRoutes(app);

  // Dashboard API routes (JWT-protected)
  await app.register(async (scoped) => {
    await registerKeysRoutes(scoped);
  });
  await app.register(async (scoped) => {
    await registerToolsRoutes(scoped);
  });
  await app.register(async (scoped) => {
    await registerLogsRoutes(scoped);
  });
  await app.register(async (scoped) => {
    await registerSystemRoutes(scoped);
  });
  await app.register(async (scoped) => {
    await registerOverviewRoutes(scoped);
  });

  // WebSocket for live dashboard updates
  await app.register(websocketPlugin);

  // Static file serving (SPA fallback — must be last)
  await app.register(staticPlugin);

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Agent Remote running on http://${config.host}:${config.port}`);
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
