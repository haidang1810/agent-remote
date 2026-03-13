import { useEffect, useRef, useCallback } from 'react';

type MessageHandler = (data: unknown) => void;

export function useWebSocket(channels: string[], onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      channels.forEach((ch) => ws.send(JSON.stringify({ type: 'subscribe', channel: ch })));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        onMessage(msg);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 3000);
    };
  }, [channels, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);
}
