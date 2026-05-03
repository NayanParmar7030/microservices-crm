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

    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      priority VARCHAR(32) NOT NULL DEFAULT 'medium',
      due_at TIMESTAMPTZ,
      assigned_to_user_id UUID,
      created_by_user_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status ON tasks (tenant_id, status) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_tenant_priority ON tasks (tenant_id, priority) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_tenant_due_at ON tasks (tenant_id, due_at) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_tenant_assignee ON tasks (tenant_id, assigned_to_user_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_tenant_creator ON tasks (tenant_id, created_by_user_id) WHERE deleted_at IS NULL;
  `);
  logger.info("crm-service database schema ensured");
}
