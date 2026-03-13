import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

export interface McpSession {
  transport: StreamableHTTPServerTransport;
  server: Server;
  keyId: number;
  lastActivity: number;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export class SessionManager {
  private sessions = new Map<string, McpSession>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    for (const [id] of this.sessions) {
      this.destroy(id);
    }
  }

  set(sessionId: string, session: McpSession): void {
    this.sessions.set(sessionId, session);
  }

  get(sessionId: string): McpSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  destroy(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.transport.close?.();
      session.server.close?.();
      this.sessions.delete(sessionId);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
        console.log(`Cleaning up idle MCP session: ${id}`);
        this.destroy(id);
      }
    }
  }

  get size(): number {
    return this.sessions.size;
  }
}
