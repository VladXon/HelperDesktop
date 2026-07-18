import { desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
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
  db: NodePgDatabase<typeof schema>,
  input: AuditInput,
): Promise<void> {
  await db.insert(schema.auditLog)
    .values({
      userId: input.userId ?? null,
      action: input.action,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    });
}

export async function listAudit(
  db: NodePgDatabase<typeof schema>,
  limit: number = 100,
): Promise<typeof schema.auditLog.$inferSelect[]> {
  return db
    .select()
    .from(schema.auditLog)
    .orderBy(desc(schema.auditLog.id))
    .limit(limit);
}
