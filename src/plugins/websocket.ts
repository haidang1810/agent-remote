import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import { broadcastManager } from '../ws/broadcast-manager.js';
import { startMetricsEmitter, stopMetricsEmitter } from '../ws/system-metrics-emitter.js';

async function websocketPlugin(app: FastifyInstance): Promise<void> {
  await app.register(websocket);

  app.get('/ws', { websocket: true }, (socket, request) => {
    // Verify JWT from query param
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4001, 'Token required');
      return;
    }

    try {
      app.jwt.verify(token);
    } catch {
      socket.close(4001, 'Invalid token');
      return;
    }

    broadcastManager.addConnection(socket);
    startMetricsEmitter();

    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && typeof msg.channel === 'string') {
          broadcastManager.subscribe(socket, msg.channel);
        } else if (msg.type === 'unsubscribe' && typeof msg.channel === 'string') {
          broadcastManager.unsubscribe(socket, msg.channel);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    socket.on('close', () => {
      broadcastManager.removeConnection(socket);
    });

    socket.on('error', () => {
      broadcastManager.removeConnection(socket);
    });
  });

  app.addHook('onClose', () => {
    stopMetricsEmitter();
  });
}

export default fp(websocketPlugin, { name: 'websocket', dependencies: ['jwt'] });
