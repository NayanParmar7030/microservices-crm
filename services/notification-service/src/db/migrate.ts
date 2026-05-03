import type { DbPool } from "./pool";
import { logger } from "../utils/logger";

export async function runMigrations(pool: DbPool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      user_id UUID NOT NULL,
      type VARCHAR(64) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_read BOOLEAN NOT NULL DEFAULT false,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user_created
      ON notifications (tenant_id, user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user_unread
      ON notifications (tenant_id, user_id, is_read, created_at DESC);
  `);
  logger.info("notification-service database schema ensured");
}
