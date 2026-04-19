import type { DbPool } from "./pool";
import { logger } from "../utils/logger";

export async function runMigrations(pool: DbPool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email VARCHAR(320) NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (tenant_id, email)
    );

    CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users (tenant_id, lower(email));
  `);
  logger.info("auth-service database schema ensured");
}
