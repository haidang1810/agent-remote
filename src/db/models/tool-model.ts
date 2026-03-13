import type Database from 'better-sqlite3';
import type { Tool } from '../types.js';

export function findAllTools(db: Database.Database): Tool[] {
  return db.prepare('SELECT * FROM tools ORDER BY category, name').all() as Tool[];
}

export function findToolByName(db: Database.Database, name: string): Tool | null {
  return (db.prepare('SELECT * FROM tools WHERE name = ?').get(name) as Tool) ?? null;
}

export function upsertTool(
  db: Database.Database,
  tool: Pick<Tool, 'name' | 'category' | 'description' | 'risk_level'>,
): void {
  db.prepare(
    `INSERT INTO tools (name, category, description, risk_level) VALUES (?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       category = excluded.category,
       description = excluded.description,
       risk_level = excluded.risk_level,
       updated_at = unixepoch()`,
  ).run(tool.name, tool.category, tool.description, tool.risk_level);
}

export function toggleToolEnabled(db: Database.Database, name: string, enabled: boolean): void {
  db.prepare('UPDATE tools SET enabled = ?, updated_at = unixepoch() WHERE name = ?').run(enabled ? 1 : 0, name);
}

export function incrementCallCount(db: Database.Database, name: string): void {
  db.prepare('UPDATE tools SET call_count = call_count + 1, updated_at = unixepoch() WHERE name = ?').run(name);
}
