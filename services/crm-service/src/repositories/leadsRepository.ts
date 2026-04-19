import type { DbPool } from "../db/pool";

export type LeadRow = {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string;
  assigned_to_user_id: string | null;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export class LeadsRepository {
  constructor(private readonly pool: DbPool) {}

  async create(input: {
    tenantId: string;
    title: string;
    description?: string | null;
    status: string;
    assignedToUserId?: string | null;
    createdByUserId: string;
  }): Promise<LeadRow> {
    const res = await this.pool.query<LeadRow>(
      `INSERT INTO leads (tenant_id, title, description, status, assigned_to_user_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, tenant_id, title, description, status, assigned_to_user_id, created_by_user_id,
                 created_at, updated_at, deleted_at`,
      [
        input.tenantId,
        input.title,
        input.description ?? null,
        input.status,
        input.assignedToUserId ?? null,
        input.createdByUserId,
      ]
    );
    return res.rows[0];
  }

  async findById(tenantId: string, id: string): Promise<LeadRow | null> {
    const res = await this.pool.query<LeadRow>(
      `SELECT id, tenant_id, title, description, status, assigned_to_user_id, created_by_user_id,
              created_at, updated_at, deleted_at
       FROM leads WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, id]
    );
    return res.rows[0] ?? null;
  }

  async list(params: {
    tenantId: string;
    page: number;
    pageSize: number;
    userIdScope: string | null;
  }): Promise<{ rows: LeadRow[]; total: number }> {
    const offset = (params.page - 1) * params.pageSize;

    if (params.userIdScope) {
      const countRes = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM leads
         WHERE tenant_id = $1 AND deleted_at IS NULL
           AND (created_by_user_id = $2 OR assigned_to_user_id = $2)`,
        [params.tenantId, params.userIdScope]
      );
      const total = Number(countRes.rows[0]?.count ?? 0);
      const res = await this.pool.query<LeadRow>(
        `SELECT id, tenant_id, title, description, status, assigned_to_user_id, created_by_user_id,
                created_at, updated_at, deleted_at
         FROM leads
         WHERE tenant_id = $1 AND deleted_at IS NULL
           AND (created_by_user_id = $4 OR assigned_to_user_id = $4)
         ORDER BY updated_at DESC
         LIMIT $2 OFFSET $3`,
        [params.tenantId, params.pageSize, offset, params.userIdScope]
      );
      return { rows: res.rows, total };
    }

    const countRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM leads WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [params.tenantId]
    );
    const total = Number(countRes.rows[0]?.count ?? 0);
    const res = await this.pool.query<LeadRow>(
      `SELECT id, tenant_id, title, description, status, assigned_to_user_id, created_by_user_id,
              created_at, updated_at, deleted_at
       FROM leads
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [params.tenantId, params.pageSize, offset]
    );
    return { rows: res.rows, total };
  }

  async updateMerged(
    tenantId: string,
    id: string,
    next: {
      title: string;
      description: string | null;
      status: string;
      assignedToUserId: string | null;
    }
  ): Promise<LeadRow | null> {
    const res = await this.pool.query<LeadRow>(
      `UPDATE leads SET
         title = $3,
         description = $4,
         status = $5,
         assigned_to_user_id = $6,
         updated_at = now()
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING id, tenant_id, title, description, status, assigned_to_user_id, created_by_user_id,
                 created_at, updated_at, deleted_at`,
      [tenantId, id, next.title, next.description, next.status, next.assignedToUserId]
    );
    return res.rows[0] ?? null;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE leads SET deleted_at = now(), updated_at = now()
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
