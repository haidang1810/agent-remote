export interface Setting {
  key: string;
  value: string;
  updated_at: number;
}

export interface ApiKey {
  id: number;
  name: string;
  key_hash: string;
  key_prefix: string;
  active: number;
  expires_at: number | null;
  rate_limit: number;
  last_used_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface ApiKeyPermission {
  id: number;
  api_key_id: number;
  tool_name: string;
  allowed: number;
}

export interface Tool {
  name: string;
  category: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  enabled: number;
  call_count: number;
  updated_at: number;
}

export interface AuditLog {
  id: number;
  api_key_id: number | null;
  api_key_name: string | null;
  tool_name: string;
  status: 'success' | 'error' | 'denied' | 'timeout';
  params: string | null;
  result: string | null;
  error_message: string | null;
  duration_ms: number | null;
  ip_address: string | null;
  created_at: number;
}

export interface AuditLogFilter {
  api_key_id?: number;
  tool_name?: string;
  status?: string;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

export interface CreateApiKeyInput {
  name: string;
  key_hash: string;
  key_prefix: string;
  expires_at?: number | null;
  rate_limit?: number;
}

export interface CreateAuditLogInput {
  api_key_id?: number | null;
  api_key_name?: string | null;
  tool_name: string;
  status: string;
  params?: string | null;
  result?: string | null;
  error_message?: string | null;
  duration_ms?: number | null;
  ip_address?: string | null;
}
