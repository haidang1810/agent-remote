import type { FastifyInstance } from 'fastify';
import { isInitialized, setupPassword, verifyPassword, changePassword } from '../auth/admin-auth.js';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/auth/status — public
  app.get('/api/auth/status', async () => {
    return { initialized: isInitialized(app.db) };
  });

  // POST /api/auth/setup — public, one-time
  app.post<{ Body: { password: string } }>('/api/auth/setup', async (request, reply) => {
    const { password } = request.body;
    if (!password) return reply.status(400).send({ error: 'Password is required' });

    try {
      await setupPassword(app.db, password);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Setup failed';
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/auth/login — public, rate-limited
  app.post<{ Body: { password: string } }>('/api/auth/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { password } = request.body;
    if (!password) return reply.status(400).send({ error: 'Password is required' });

    const valid = await verifyPassword(app.db, password);
    if (!valid) return reply.status(401).send({ error: 'Invalid password' });

    const token = app.jwt.sign({ role: 'admin' });
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    return { token, expiresAt };
  });

  // POST /api/auth/change-password — protected
  app.post<{ Body: { oldPassword: string; newPassword: string } }>('/api/auth/change-password', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    const { oldPassword, newPassword } = request.body;
    if (!oldPassword || !newPassword) {
      return reply.status(400).send({ error: 'Both old and new passwords are required' });
    }

    try {
      await changePassword(app.db, oldPassword, newPassword);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Change failed';
      return reply.status(400).send({ error: message });
    }
  });
}
