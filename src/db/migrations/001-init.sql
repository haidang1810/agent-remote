CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permission_group TEXT NOT NULL DEFAULT 'read',
  active INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER,
  rate_limit INTEGER NOT NULL DEFAULT 60,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS api_key_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  allowed INTEGER NOT NULL,
  UNIQUE(api_key_id, tool_name)
);

CREATE TABLE IF NOT EXISTS tools (
  name TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  call_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id INTEGER,
  api_key_name TEXT,
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL,
  params TEXT,
  result TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  ip_address TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_key ON audit_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_audit_tool ON audit_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_audit_status ON audit_logs(status);
