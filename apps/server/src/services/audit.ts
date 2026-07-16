import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { schema } from '../db/index.js';

export const AUDIT_ACTIONS = [
  'login',
  'logout',
  'refresh',
  'password_change',
  'email_change',
  'telegram_link',
  'telegram_unlink',
  'bot_login_approved',
  'dev_op',
  'dev_restart',
  'login_failed',
  'account_locked',
  'token_reuse_detected',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditInput {
  action: AuditAction;
  userId?: number | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function audit(
  db: BetterSQLite3Database<typeof schema>,
  input: AuditInput,
): Promise<void> {
  db.insert(schema.auditLog)
    .values({
      userId: input.userId ?? null,
      action: input.action,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    })
    .run();
}

export function listAudit(
  db: BetterSQLite3Database<typeof schema>,
  limit: number = 100,
): typeof schema.auditLog.$inferSelect[] {
  return db
    .select()
    .from(schema.auditLog)
    .all()
    .slice(-limit)
    .reverse();
}
