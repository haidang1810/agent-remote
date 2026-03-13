import type Database from 'better-sqlite3';
import type { AuditLog, AuditLogFilter, CreateAuditLogInput } from '../types.js';
import { broadcastManager } from '../../ws/broadcast-manager.js';

const MAX_RESULT_LENGTH = 10240; // 10KB truncation limit

export function insertAuditLog(db: Database.Database, data: CreateAuditLogInput): void {
  const truncatedResult = data.result && data.result.length > MAX_RESULT_LENGTH
    ? data.result.slice(0, MAX_RESULT_LENGTH) + '...[truncated]'
    : data.result;

  db.prepare(
    `INSERT INTO audit_logs (api_key_id, api_key_name, tool_name, status, params, result, error_message, duration_ms, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    data.api_key_id ?? null,
    data.api_key_name ?? null,
    data.tool_name,
    data.status,
    data.params ?? null,
    truncatedResult ?? null,
    data.error_message ?? null,
    data.duration_ms ?? null,
    data.ip_address ?? null,
  );

  // Broadcast to WebSocket "logs" subscribers
  broadcastManager.broadcast('logs', {
    tool_name: data.tool_name,
    status: data.status,
    api_key_name: data.api_key_name,
    duration_ms: data.duration_ms,
    ip_address: data.ip_address,
    timestamp: Math.floor(Date.now() / 1000),
  });
}

export function queryAuditLogs(db: Database.Database, filter: AuditLogFilter = {}): AuditLog[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.api_key_id !== undefined) {
    conditions.push('api_key_id = ?');
    params.push(filter.api_key_id);
  }
  if (filter.tool_name) {
    conditions.push('tool_name = ?');
    params.push(filter.tool_name);
  }
  if (filter.status) {
    conditions.push('status = ?');
    params.push(filter.status);
  }
  if (filter.from !== undefined) {
    conditions.push('created_at >= ?');
    params.push(filter.from);
  }
  if (filter.to !== undefined) {
    conditions.push('created_at <= ?');
    params.push(filter.to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filter.limit ?? 100;
  const offset = filter.offset ?? 0;

  return db.prepare(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ).all(...params, limit, offset) as AuditLog[];
}

export function cleanupAuditLogs(db: Database.Database, olderThanDays: number = 30): number {
  const cutoff = Math.floor(Date.now() / 1000) - olderThanDays * 86400;
  const result = db.prepare('DELETE FROM audit_logs WHERE created_at < ?').run(cutoff);
  return result.changes;
}
