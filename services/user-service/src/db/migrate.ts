import type { DbPool } from "./pool";
import { logger } from "../utils/logger";

export async function runMigrations(pool: DbPool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(32) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      email VARCHAR(320) NOT NULL,
      first_name VARCHAR(80) NOT NULL,
      last_name VARCHAR(80) NOT NULL,
      role_id UUID NOT NULL REFERENCES roles(id),
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email_active
      ON users (tenant_id, (lower(email)))
      WHERE deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id) WHERE deleted_at IS NULL;
  `);

  await pool.query(
    `INSERT INTO roles (name) VALUES ('admin'), ('manager'), ('user') ON CONFLICT (name) DO NOTHING`
  );

  logger.info("user-service database schema ensured");
}
