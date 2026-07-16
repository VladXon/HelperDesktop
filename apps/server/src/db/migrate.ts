import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb } from './index.js';
import { log } from '../utils/logger.js';

const { db } = createDb();

migrate(db, { migrationsFolder: './src/db/migrations' });
log.db('migrations applied');
