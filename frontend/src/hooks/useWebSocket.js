import { useState, useEffect, useRef, useCallback } from "react";

const WS_BASE = import.meta.env.DEV
  ? "ws://localhost:8001/api/v1/ws"
  : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/v1/ws`;

export default function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const maxRetries = 10;

  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      try {
        const ws = new WebSocket(WS_BASE);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          retryRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type !== "heartbeat") {
              setLastMessage(msg);
            }
          } catch { /* ignore malformed */ }
        };

        ws.onclose = () => {
          setConnected(false);
          wsRef.current = null;
          if (retryRef.current < maxRetries) {
            const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
            retryRef.current++;
            setTimeout(connect, delay);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setConnected(false);
      }
    }

    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, lastMessage, send };
}
