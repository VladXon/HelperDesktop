import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { attachWebSocket } from '../ws.js';

let server: ReturnType<typeof createServer>;
let port: number;

beforeEach(async () => {
  server = createServer();
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address() as AddressInfo;
  port = addr.port;
  attachWebSocket(server);
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('WebSocket /ws', () => {
  it(
    'sends a connected message on connect',
    async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const message = await new Promise<string>((resolve, reject) => {
        ws.on('message', (data) => resolve(data.toString()));
        ws.on('error', reject);
      });
      const parsed = JSON.parse(message);
      expect(parsed.type).toBe('connected');
      expect(typeof parsed.timestamp).toBe('string');
      ws.close();
    },
    10_000,
  );
});

