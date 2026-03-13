import type Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  'migrations',
);

function dirname(path: string): string {
  return path.substring(0, path.lastIndexOf('/'));
}

export function runMigrations(db: Database.Database): void {
  const currentVersion = (db.pragma('user_version', { simple: true }) as number) ?? 0;

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const version = parseInt(file.split('-')[0], 10);
    if (Number.isNaN(version) || version <= currentVersion) continue;

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');

    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${version}`);
    })();

    console.log(`Migration ${file} applied (v${version})`);
  }
}
