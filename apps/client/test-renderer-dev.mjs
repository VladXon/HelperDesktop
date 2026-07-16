import { createServer } from 'vite';
import { loadConfigFromFile } from 'vite';
import { pluginExposeRenderer } from '@electron-forge/plugin-vite/dist/config/vite.base.config.js';

const cfg = await loadConfigFromFile({ command: 'serve', mode: 'development' }, './vite.renderer.config.ts');
const userConfig = cfg?.config;

const merged = {
  ...{
    root: process.cwd(),
    mode: 'development',
    base: './',
    build: { copyPublicDir: true, outDir: '.vite/renderer/main_window' },
    plugins: [pluginExposeRenderer('main_window')],
    resolve: { preserveSymlinks: true },
    clearScreen: false,
  },
  ...userConfig,
};
merged.plugins = [...(merged.plugins ?? []), pluginExposeRenderer('main_window')];

const server = await createServer({ configFile: false, ...merged });
await server.listen();
console.log('LISTEN OK', JSON.stringify(server.resolvedUrls));
setTimeout(() => { server.close(); process.exit(0); }, 3000);
