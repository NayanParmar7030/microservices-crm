import type { DbPool } from "./pool";
import { logger } from "../utils/logger";

export async function runMigrations(pool: DbPool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'new',
      assigned_to_user_id UUID,
      created_by_user_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads (tenant_id, status) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_leads_tenant_assignee ON leads (tenant_id, assigned_to_user_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_leads_tenant_creator ON leads (tenant_id, created_by_user_id) WHERE deleted_at IS NULL;
  `);
  logger.info("crm-service database schema ensured");
}
