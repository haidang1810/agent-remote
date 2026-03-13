import { resolve } from 'node:path';
import type Database from 'better-sqlite3';
import { getSetting, setSetting } from '../../db/models/settings-model.js';

const SETTINGS_KEY = 'allowed_paths';
const DEFAULT_ALLOWED = ['/home', '/var/www', '/var/log', '/opt', '/etc/nginx', '/tmp', '/srv'];

/** Paths that are always blocked regardless of whitelist */
const BLOCKED_PATHS = [
  '/etc/shadow', '/etc/sudoers', '/etc/gshadow',
  '.ssh/id_rsa', '.ssh/id_ed25519', '.ssh/authorized_keys',
  '.env', '.env.local', '.env.production',
];

/** Singleton DB reference — set once at startup */
let _db: Database.Database | null = null;

export function initPathWhitelist(db: Database.Database): void {
  _db = db;
  // Seed from env on first run
  const existing = getSetting(db, SETTINGS_KEY);
  if (!existing) {
    const envPaths = process.env.ALLOWED_PATHS;
    const paths = envPaths ? envPaths.split(':').filter(Boolean) : DEFAULT_ALLOWED;
    setSetting(db, SETTINGS_KEY, JSON.stringify(paths));
  }
}

export function getAllowedPaths(): string[] {
  if (!_db) return DEFAULT_ALLOWED;
  const raw = getSetting(_db, SETTINGS_KEY);
  if (!raw) return DEFAULT_ALLOWED;
  try { return JSON.parse(raw) as string[]; } catch { return DEFAULT_ALLOWED; }
}

export function setAllowedPaths(db: Database.Database, paths: string[]): void {
  setSetting(db, SETTINGS_KEY, JSON.stringify(paths));
}

export interface PathCheckResult {
  allowed: boolean;
  reason?: string;
}

/** Validate a path against whitelist + blocklist */
export function isPathAllowed(inputPath: string): PathCheckResult {
  const absolute = resolve(inputPath);

  if (inputPath.includes('..')) {
    return { allowed: false, reason: 'Path traversal (..) not allowed' };
  }

  for (const blocked of BLOCKED_PATHS) {
    if (absolute.endsWith(blocked) || absolute.includes(`/${blocked}`)) {
      return { allowed: false, reason: `Access to ${blocked} is blocked` };
    }
  }

  const allowed = getAllowedPaths();
  const inWhitelist = allowed.some((dir) => absolute.startsWith(dir));
  if (!inWhitelist) {
    return { allowed: false, reason: `Path not in allowed directories: ${allowed.join(', ')}` };
  }

  return { allowed: true };
}
