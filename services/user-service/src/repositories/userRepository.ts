import type { DbPool } from "../db/pool";

export type UserRow = {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  role_name: string;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export class UserRepository {
  constructor(private readonly pool: DbPool) {}

  async bootstrapUser(input: {
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    roleId: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, tenant_id, email, first_name, last_name, role_id)
       VALUES ($1, $2, lower(trim($3)), $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [input.id, input.tenantId, input.email, input.firstName, input.lastName, input.roleId]
    );
  }

  async findActiveById(tenantId: string, id: string): Promise<UserRow | null> {
    const res = await this.pool.query<UserRow>(
      `SELECT u.id, u.tenant_id, u.email, u.first_name, u.last_name, u.role_id, r.name AS role_name,
              u.deleted_at, u.created_at, u.updated_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.tenant_id = $1 AND u.id = $2 AND u.deleted_at IS NULL`,
      [tenantId, id]
    );
    return res.rows[0] ?? null;
  }

  async findActiveByIdAnyTenant(id: string): Promise<UserRow | null> {
    const res = await this.pool.query<UserRow>(
      `SELECT u.id, u.tenant_id, u.email, u.first_name, u.last_name, u.role_id, r.name AS role_name,
              u.deleted_at, u.created_at, u.updated_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [id]
    );
    return res.rows[0] ?? null;
  }

  async listByTenant(
    tenantId: string,
    page: number,
    pageSize: number
  ): Promise<{ rows: UserRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );
    const total = Number(countRes.rows[0]?.count ?? 0);
    const res = await this.pool.query<UserRow>(
      `SELECT u.id, u.tenant_id, u.email, u.first_name, u.last_name, u.role_id, r.name AS role_name,
              u.deleted_at, u.created_at, u.updated_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.tenant_id = $1 AND u.deleted_at IS NULL
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, pageSize, offset]
    );
    return { rows: res.rows, total };
  }

  async updateProfile(
    tenantId: string,
    id: string,
    patch: { firstName?: string; lastName?: string; email?: string }
  ): Promise<UserRow | null> {
    const res = await this.pool.query<UserRow>(
      `UPDATE users SET
         first_name = COALESCE($3, first_name),
         last_name = COALESCE($4, last_name),
         email = COALESCE(lower(trim($5)), email),
         updated_at = now()
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING id, tenant_id, email, first_name, last_name, role_id,
         (SELECT name FROM roles WHERE id = users.role_id) AS role_name,
         deleted_at, created_at, updated_at`,
      [tenantId, id, patch.firstName ?? null, patch.lastName ?? null, patch.email ?? null]
    );
    return res.rows[0] ?? null;
  }

  async assignRole(tenantId: string, id: string, roleId: string): Promise<UserRow | null> {
    const res = await this.pool.query<UserRow>(
      `UPDATE users SET role_id = $3, updated_at = now()
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING id, tenant_id, email, first_name, last_name, role_id,
         (SELECT name FROM roles WHERE id = users.role_id) AS role_name,
         deleted_at, created_at, updated_at`,
      [tenantId, id, roleId]
    );
    return res.rows[0] ?? null;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const res = await this.pool.query(`UPDATE users SET deleted_at = now(), updated_at = now()
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`, [tenantId, id]);
    return (res.rowCount ?? 0) > 0;
  }
}
