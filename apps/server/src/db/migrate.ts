import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.js';

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: new URL('./migrations', import.meta.url).pathname });
  await pool.end();
}
