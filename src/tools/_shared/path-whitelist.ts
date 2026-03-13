import { resolve } from 'node:path';

/** Default allowed directories — override via ALLOWED_PATHS env (colon-separated) */
const DEFAULT_ALLOWED = ['/home', '/var/www', '/var/log', '/opt', '/etc/nginx', '/tmp', '/srv'];

/** Paths that are always blocked regardless of whitelist */
const BLOCKED_PATHS = [
  '/etc/shadow', '/etc/sudoers', '/etc/gshadow',
  '.ssh/id_rsa', '.ssh/id_ed25519', '.ssh/authorized_keys',
  '.env', '.env.local', '.env.production',
];

export function getAllowedPaths(): string[] {
  const envPaths = process.env.ALLOWED_PATHS;
  return envPaths ? envPaths.split(':').filter(Boolean) : DEFAULT_ALLOWED;
}

export interface PathCheckResult {
  allowed: boolean;
  reason?: string;
}

/** Validate a path against whitelist + blocklist */
export function isPathAllowed(inputPath: string): PathCheckResult {
  const absolute = resolve(inputPath);

  // Block path traversal
  if (inputPath.includes('..')) {
    return { allowed: false, reason: 'Path traversal (..) not allowed' };
  }

  // Check blocklist
  for (const blocked of BLOCKED_PATHS) {
    if (absolute.endsWith(blocked) || absolute.includes(`/${blocked}`)) {
      return { allowed: false, reason: `Access to ${blocked} is blocked` };
    }
  }

  // Check whitelist
  const allowed = getAllowedPaths();
  const inWhitelist = allowed.some((dir) => absolute.startsWith(dir));
  if (!inWhitelist) {
    return { allowed: false, reason: `Path not in allowed directories: ${allowed.join(', ')}` };
  }

  return { allowed: true };
}
