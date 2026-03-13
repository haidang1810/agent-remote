import type { WebSocket } from 'ws';

export class BroadcastManager {
  private connections = new Map<WebSocket, Set<string>>();

  addConnection(ws: WebSocket): void {
    this.connections.set(ws, new Set());
  }

  removeConnection(ws: WebSocket): void {
    this.connections.delete(ws);
  }

  subscribe(ws: WebSocket, channel: string): void {
    this.connections.get(ws)?.add(channel);
  }

  unsubscribe(ws: WebSocket, channel: string): void {
    this.connections.get(ws)?.delete(channel);
  }

  broadcast(channel: string, data: unknown): void {
    const message = JSON.stringify({ type: channel, data });
    for (const [ws, channels] of this.connections) {
      if (channels.has(channel) && ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    }
  }

  hasSubscribers(channel: string): boolean {
    for (const [, channels] of this.connections) {
      if (channels.has(channel)) return true;
    }
    return false;
  }

  get size(): number {
    return this.connections.size;
  }
}

// Singleton instance
export const broadcastManager = new BroadcastManager();
