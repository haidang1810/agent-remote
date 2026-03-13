import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';
import { getSetting, setSetting } from '../db/models/settings-model.js';
import { randomBytes } from 'node:crypto';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { role: string };
    user: { role: string };
  }
}

async function jwtPlugin(app: FastifyInstance): Promise<void> {
  // Auto-generate JWT secret if not provided via env
  let secret = config.jwtSecret;
  if (secret === 'change-me-to-a-random-secret') {
    const stored = getSetting(app.db, 'jwt_secret');
    if (stored) {
      secret = stored;
    } else {
      secret = randomBytes(32).toString('hex');
      setSetting(app.db, 'jwt_secret', secret);
    }
  }

  await app.register(fastifyJwt, {
    secret,
    sign: { expiresIn: '24h' },
  });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(jwtPlugin, { name: 'jwt', dependencies: ['db'] });
