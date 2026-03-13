import type { FastifyInstance } from 'fastify';
import { generateApiKey, hashApiKey } from '../auth/api-key-auth.js';
import {
  findAllKeys, findKeyById, createKey, updateKey, deleteKey,
  findPermissions, setPermission, deletePermission,
} from '../db/models/api-key-model.js';
import type { ApiKey } from '../db/types.js';

export async function registerKeysRoutes(app: FastifyInstance): Promise<void> {
  // All routes require JWT
  app.addHook('onRequest', app.authenticate);

  // GET /api/keys — list all keys (no hash exposed)
  app.get('/api/keys', async () => {
    const keys = findAllKeys(app.db);
    return {
      data: keys.map(({ key_hash: _h, ...rest }) => rest),
    };
  });

  // POST /api/keys — create new key
  app.post<{ Body: { name: string; permissionGroup?: string; expiresAt?: number; rateLimit?: number } }>(
    '/api/keys',
    async (request) => {
      const { name, permissionGroup, expiresAt, rateLimit } = request.body;
      const plaintext = generateApiKey();
      const key = createKey(app.db, {
        name,
        key_hash: hashApiKey(plaintext),
        key_prefix: plaintext.slice(0, 8),
        permission_group: permissionGroup,
        expires_at: expiresAt,
        rate_limit: rateLimit,
      });
      const { key_hash: _h, ...safe } = key;
      return { data: { ...safe, plaintext } };
    },
  );

  // GET /api/keys/:id
  app.get<{ Params: { id: string } }>('/api/keys/:id', async (request, reply) => {
    const key = findKeyById(app.db, Number(request.params.id));
    if (!key) return reply.status(404).send({ error: 'Key not found' });
    const { key_hash: _h, ...safe } = key;
    return { data: safe };
  });

  // PUT /api/keys/:id
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/api/keys/:id',
    async (request, reply) => {
      const id = Number(request.params.id);
      const { name, permissionGroup, active, expiresAt, rateLimit } = request.body as Record<string, unknown>;
      const updated = updateKey(app.db, id, {
        ...(name !== undefined && { name: name as string }),
        ...(permissionGroup !== undefined && { permission_group: permissionGroup as ApiKey['permission_group'] }),
        ...(active !== undefined && { active: active as number }),
        ...(expiresAt !== undefined && { expires_at: expiresAt as number | null }),
        ...(rateLimit !== undefined && { rate_limit: rateLimit as number }),
      });
      if (!updated) return reply.status(404).send({ error: 'Key not found' });
      const { key_hash: _h, ...safe } = updated;
      return { data: safe };
    },
  );

  // DELETE /api/keys/:id
  app.delete<{ Params: { id: string } }>('/api/keys/:id', async (request, reply) => {
    const deleted = deleteKey(app.db, Number(request.params.id));
    if (!deleted) return reply.status(404).send({ error: 'Key not found' });
    return { success: true };
  });

  // GET /api/keys/:id/permissions
  app.get<{ Params: { id: string } }>('/api/keys/:id/permissions', async (request) => {
    const perms = findPermissions(app.db, Number(request.params.id));
    return { data: perms };
  });

  // PUT /api/keys/:id/permissions
  app.put<{ Params: { id: string }; Body: { permissions: Array<{ toolName: string; allowed: boolean }> } }>(
    '/api/keys/:id/permissions',
    async (request) => {
      const keyId = Number(request.params.id);
      for (const p of request.body.permissions) {
        if (p.allowed === null) {
          deletePermission(app.db, keyId, p.toolName);
        } else {
          setPermission(app.db, keyId, p.toolName, p.allowed);
        }
      }
      return { data: findPermissions(app.db, keyId) };
    },
  );
}
