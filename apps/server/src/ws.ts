import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

const HEALTH_INTERVAL_MS = 10_000;
const startedAt = Date.now();

export function attachWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'health',
            timestamp: new Date().toISOString(),
            uptime: Date.now() - startedAt,
          }),
        );
      }
    }, HEALTH_INTERVAL_MS);
    ws.on('close', () => clearInterval(interval));
    ws.on('error', () => clearInterval(interval));
  });
}
