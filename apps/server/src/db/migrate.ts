import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.js';

export async function runMigrations(): Promise<void> {
  console.log('[migrate] Running Drizzle migrations...');
  await migrate(db, { migrationsFolder: new URL('./migrations', import.meta.url).pathname });
  console.log('[migrate] Migrations complete.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
});
