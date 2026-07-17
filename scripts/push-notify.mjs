import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const appName = 'ElectronHelper';
const pushFile = process.env.AI_PUSH_FILE
  || join(homedir(), 'AppData', 'Roaming', appName, 'ai-push.json');

const payload = {
  title: process.argv[2] || 'OpenCode',
  body: process.argv[3] || '',
};

if (!payload.body) {
  console.error('Usage: node push-notify.mjs <title> <body>');
  process.exit(1);
}

const dir = dirname(pushFile);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

writeFileSync(pushFile, JSON.stringify(payload, null, 2), 'utf-8');
console.log(`[push] sent: ${payload.title} - ${payload.body}`);
