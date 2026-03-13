import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const webDistDir = join(fileURLToPath(import.meta.url), '..', '..', '..', 'web', 'dist');

async function staticPlugin(app: FastifyInstance): Promise<void> {
  if (!existsSync(webDistDir)) {
    app.log.warn(`Static files not found at ${webDistDir} — run "npm run build" in web/`);
    return;
  }

  await app.register(fastifyStatic, {
    root: webDistDir,
    prefix: '/',
    wildcard: false,
  });

  // SPA fallback — serve index.html for all non-API, non-MCP routes
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/') || request.url.startsWith('/mcp') || request.url.startsWith('/ws')) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html');
  });
}

export default fp(staticPlugin, { name: 'static' });
