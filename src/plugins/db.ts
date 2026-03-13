import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { join } from 'node:path';
import { createDatabase } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { config } from '../config.js';
import type Database from 'better-sqlite3';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database.Database;
  }
}

async function dbPlugin(app: FastifyInstance): Promise<void> {
  const dbPath = join(config.dataDir, 'agent-remote.db');
  const db = createDatabase(dbPath);

  runMigrations(db);

  app.decorate('db', db);

  app.addHook('onClose', () => {
    db.close();
  });
}

export default fp(dbPlugin, { name: 'db' });
