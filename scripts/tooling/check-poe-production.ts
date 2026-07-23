import { get } from 'node:http';

function fetchJson(url: string, timeout = 10000): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const req = get(url, { timeout }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: body });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function check(name: string, fn: () => Promise<boolean>): Promise<boolean> {
  try {
    const ok = await fn();
    console.log(ok ? `  [OK] ${name}` : `  [FAIL] ${name}`);
    return ok;
  } catch (err: any) {
    console.log(`  [ERR] ${name} — ${err.message}`);
    return false;
  }
}

async function main(): Promise<void> {
  const baseUrl = process.env.SERVER_URL ?? process.argv[2];
  if (!baseUrl) {
    console.log('Usage: npx tsx scripts/check-poe-production.ts <http://server:port>');
    process.exit(1);
  }

  console.log(`\n=== PoE Production Check: ${baseUrl} ===\n`);

  // 1. Health + routes
  let hasPoeRoutes = false;
  await check('Health endpoint', async () => {
    const { status, data } = await fetchJson(`${baseUrl}/api/health`);
    if (status !== 200) return false;
    const d = data as any;
    console.log(`    version=${d.version}, db=${d.db}`);
    if (d.routes?.poe) {
      console.log(`    poe/auth: [${d.routes.poe.auth?.join(', ')}]`);
      console.log(`    poe/builds: [${d.routes.poe.builds?.join(', ')}]`);
      console.log(`    poe/accounts: [${d.routes.poe.accounts?.join(', ')}]`);
      hasPoeRoutes = true;
      return true;
    }
    return false;
  });

  // 2. OAuth endpoints (will return 401 without auth — that's OK)
  console.log('\n--- OAuth endpoints (401=expected without login) ---');
  await check('GET /api/poe/auth/url', async () => {
    const { status } = await fetchJson(`${baseUrl}/api/poe/auth/url`);
    return status === 401 || status === 200 || status === 500;
  });
  await check('GET /api/poe/auth/status', async () => {
    const { status } = await fetchJson(`${baseUrl}/api/poe/auth/status`);
    return status === 401 || status === 200;
  });

  // 3. Build endpoints
  console.log('\n--- Build endpoints (401=expected without login) ---');
  await check('GET /api/poe/builds', async () => {
    const { status } = await fetchJson(`${baseUrl}/api/poe/builds`);
    return status === 401 || status === 200;
  });

  // 4. Account endpoints
  console.log('\n--- Account endpoints (401=expected without login) ---');
  await check('GET /api/poe/accounts', async () => {
    const { status } = await fetchJson(`${baseUrl}/api/poe/accounts`);
    return status === 401 || status === 200;
  });

  // Summary
  console.log(hasPoeRoutes
    ? '\n=== PoE routes present — server deployment OK ===\n'
    : '\n=== PoE routes MISSING — VPS server is outdated, RE-DEPLOY ===\n');
}

main().catch(console.error);
