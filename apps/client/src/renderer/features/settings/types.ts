export type DevServerInfo = {
  uptime: number;
  memory: { rss: number; heapTotal: number; heapUsed: number; external: number };
  version: string;
  nodeEnv: string;
  users_count: number;
  sessions_count: number;
  notes_count: number;
  presets_count: number;
  telegram_links_count: number;
};
