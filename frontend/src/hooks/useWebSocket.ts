import { useEffect, useRef, useCallback, useState } from 'react';
import type { WSMessage } from '../types';

const WS_URL = `ws://localhost:3001`;

export function useWebSocket(onMessage: (msg: WSMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('[WS] Connected to vault server');

        // Send ping every 30 seconds
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;
          onMessageRef.current(msg);
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        console.log('[WS] Disconnected - reconnecting in 3s...');
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('[WS] Connection error:', e);
      reconnectTimerRef.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { connected };
}
