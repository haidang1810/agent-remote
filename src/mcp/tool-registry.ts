import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShape } from 'zod';
import type Database from 'better-sqlite3';
import { canExecuteTool } from '../auth/permission-checker.js';
import { incrementCallCount } from '../db/models/tool-model.js';
import { insertAuditLog } from '../db/models/audit-log-model.js';
import type { ApiKey } from '../db/types.js';

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

/** Tool definition for registration */
export interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodRawShape;
  handler: ToolHandler;
}

// Global tool definitions populated by Phase 6
const toolDefinitions: ToolDefinition[] = [];

export function addToolDefinition(def: ToolDefinition): void {
  toolDefinitions.push(def);
}

export function getToolDefinitions(): ToolDefinition[] {
  return toolDefinitions;
}

/** Register all permitted tools on an McpServer instance for a given key */
export function registerToolsForKey(
  server: McpServer,
  db: Database.Database,
  key: ApiKey,
  clientIp: string,
): void {
  for (const def of toolDefinitions) {
    const perm = canExecuteTool(db, key, def.name);
    if (!perm.allowed) continue;

    server.tool(
      def.name,
      def.description,
      def.schema,
      async (args: Record<string, unknown>) => {
        return executeToolWithAudit(def, db, key, clientIp, args);
      },
    );
  }
}

async function executeToolWithAudit(
  def: ToolDefinition,
  db: Database.Database,
  key: ApiKey,
  clientIp: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const startTime = Date.now();

  // Re-check permission at execution time
  const perm = canExecuteTool(db, key, def.name);
  if (!perm.allowed) {
    insertAuditLog(db, {
      api_key_id: key.id,
      api_key_name: key.name,
      tool_name: def.name,
      status: 'denied',
      params: JSON.stringify(args),
      error_message: perm.reason,
      duration_ms: Date.now() - startTime,
      ip_address: clientIp,
    });
    return { content: [{ type: 'text', text: `Permission denied: ${perm.reason}` }], isError: true };
  }

  try {
    const result = await def.handler(args);
    incrementCallCount(db, def.name);
    insertAuditLog(db, {
      api_key_id: key.id,
      api_key_name: key.name,
      tool_name: def.name,
      status: result.isError ? 'error' : 'success',
      params: JSON.stringify(args),
      result: JSON.stringify(result.content),
      duration_ms: Date.now() - startTime,
      ip_address: clientIp,
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    insertAuditLog(db, {
      api_key_id: key.id,
      api_key_name: key.name,
      tool_name: def.name,
      status: 'error',
      params: JSON.stringify(args),
      error_message: message,
      duration_ms: Date.now() - startTime,
      ip_address: clientIp,
    });
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
}
