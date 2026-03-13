import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

export async function registerCors(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });
}
