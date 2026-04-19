import type pg from "pg";
import type { DbPool } from "../db/pool";

export type UserAuthRow = {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
};

export class UserAuthRepository {
  constructor(private readonly pool: DbPool) {}

  async create(
    client: pg.Pool | pg.PoolClient,
    tenantId: string,
    email: string,
    passwordHash: string
  ): Promise<UserAuthRow> {
    const res = await client.query<UserAuthRow>(
      `INSERT INTO users (tenant_id, email, password_hash)
       VALUES ($1, lower(trim($2)), $3)
       RETURNING id, tenant_id, email, password_hash, created_at, updated_at`,
      [tenantId, email, passwordHash]
    );
    return res.rows[0];
  }

  async findByTenantAndEmail(tenantId: string, email: string): Promise<UserAuthRow | null> {
    const res = await this.pool.query<UserAuthRow>(
      `SELECT id, tenant_id, email, password_hash, created_at, updated_at
       FROM users WHERE tenant_id = $1 AND lower(email) = lower(trim($2))`,
      [tenantId, email]
    );
    return res.rows[0] ?? null;
  }

  async findByEmailAcrossTenants(email: string): Promise<UserAuthRow | null> {
    const res = await this.pool.query<UserAuthRow>(
      `SELECT id, tenant_id, email, password_hash, created_at, updated_at
       FROM users WHERE lower(email) = lower(trim($1))
       ORDER BY created_at ASC
       LIMIT 1`,
      [email]
    );
    return res.rows[0] ?? null;
  }

  async findById(id: string): Promise<UserAuthRow | null> {
    const res = await this.pool.query<UserAuthRow>(
      `SELECT id, tenant_id, email, password_hash, created_at, updated_at FROM users WHERE id = $1`,
      [id]
    );
    return res.rows[0] ?? null;
  }
}
