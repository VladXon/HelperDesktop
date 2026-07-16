import { createServer, loadConfigFromFile, mergeConfig } from 'vite';
import { spawn } from 'node:child_process';
import net from 'node:net';

const PORT = 5173;

function isPortBusy(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(true));
    s.once('listening', () => s.close(() => resolve(false)));
    s.listen(port, '127.0.0.1');
  });
}

function waitForHttp(timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = net.connect(PORT, '127.0.0.1', () => {
        req.end();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error(`vite did not start on :${PORT} in ${timeoutMs}ms`));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}

const busy = await isPortBusy(PORT);
let server = null;
if (!busy) {
  console.log(`[dev] starting vite dev server on :${PORT}`);
  const userConfig = (await loadConfigFromFile({ command: 'serve', mode: 'development' }, 'vite.renderer.config.ts'))?.config ?? {};
  const baseConfig = {
    root: process.cwd(),
    mode: 'development',
    base: './',
    build: { copyPublicDir: true, outDir: '.vite/renderer/main_window' },
    resolve: { preserveSymlinks: true },
    clearScreen: false,
    server: { port: PORT, strictPort: true },
  };
  const merged = mergeConfig(baseConfig, userConfig);
  merged.server = { ...(merged.server ?? {}), port: PORT, strictPort: true, host: '127.0.0.1' };
  server = await createServer({ configFile: false, ...merged });
  server.httpServer?.once('listening', () => {
    const a = server.httpServer.address();
    console.log(`[dev] vite listening on`, a);
  });
  await server.listen();
  await waitForHttp();
  console.log(`[dev] vite ready on http://127.0.0.1:${PORT}`);
} else {
  console.log(`[dev] port ${PORT} already in use, reusing existing vite`);
}

const child = spawn('npx', ['electron-forge', 'start'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

const cleanup = (code = 0) => {
  if (server) {
    server.close().catch(() => {});
  }
  process.exit(code);
};

child.on('exit', (code) => cleanup(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
