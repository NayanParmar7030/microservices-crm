import type { DbPool } from "../db/pool";

export type TaskRow = {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: Date | null;
  assigned_to_user_id: string | null;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export class TasksRepository {
  constructor(private readonly pool: DbPool) {}

  async create(input: {
    tenantId: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    dueAt?: Date | null;
    assignedToUserId?: string | null;
    createdByUserId: string;
  }): Promise<TaskRow> {
    const res = await this.pool.query<TaskRow>(
      `INSERT INTO tasks (tenant_id, title, description, status, priority, due_at, assigned_to_user_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id, title, description, status, priority, due_at, assigned_to_user_id, created_by_user_id,
                 created_at, updated_at, deleted_at`,
      [
        input.tenantId,
        input.title,
        input.description ?? null,
        input.status,
        input.priority,
        input.dueAt ?? null,
        input.assignedToUserId ?? null,
        input.createdByUserId,
      ]
    );
    return res.rows[0];
  }

  async findById(tenantId: string, id: string): Promise<TaskRow | null> {
    const res = await this.pool.query<TaskRow>(
      `SELECT id, tenant_id, title, description, status, priority, due_at, assigned_to_user_id, created_by_user_id,
              created_at, updated_at, deleted_at
       FROM tasks
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, id]
    );
    return res.rows[0] ?? null;
  }

  async list(params: {
    tenantId: string;
    page: number;
    pageSize: number;
    userIdScope: string | null;
    status: string | null;
    priority: string | null;
  }): Promise<{ rows: TaskRow[]; total: number }> {
    const offset = (params.page - 1) * params.pageSize;
    const values: Array<string | number> = [params.tenantId];
    const where: string[] = ["tenant_id = $1", "deleted_at IS NULL"];

    if (params.userIdScope) {
      values.push(params.userIdScope);
      where.push(`(created_by_user_id = $${values.length} OR assigned_to_user_id = $${values.length})`);
    }

    if (params.status) {
      values.push(params.status);
      where.push(`status = $${values.length}`);
    }

    if (params.priority) {
      values.push(params.priority);
      where.push(`priority = $${values.length}`);
    }

    const whereSql = where.join(" AND ");
    const countRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM tasks WHERE ${whereSql}`,
      values
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    values.push(params.pageSize);
    const limitPlaceholder = values.length;
    values.push(offset);
    const offsetPlaceholder = values.length;

    const rowsRes = await this.pool.query<TaskRow>(
      `SELECT id, tenant_id, title, description, status, priority, due_at, assigned_to_user_id, created_by_user_id,
              created_at, updated_at, deleted_at
       FROM tasks
       WHERE ${whereSql}
       ORDER BY due_at ASC NULLS LAST, updated_at DESC
       LIMIT $${limitPlaceholder} OFFSET $${offsetPlaceholder}`,
      values
    );

    return { rows: rowsRes.rows, total };
  }

  async updateMerged(
    tenantId: string,
    id: string,
    next: {
      title: string;
      description: string | null;
      status: string;
      priority: string;
      dueAt: Date | null;
      assignedToUserId: string | null;
    }
  ): Promise<TaskRow | null> {
    const res = await this.pool.query<TaskRow>(
      `UPDATE tasks SET
         title = $3,
         description = $4,
         status = $5,
         priority = $6,
         due_at = $7,
         assigned_to_user_id = $8,
         updated_at = now()
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING id, tenant_id, title, description, status, priority, due_at, assigned_to_user_id, created_by_user_id,
                 created_at, updated_at, deleted_at`,
      [tenantId, id, next.title, next.description, next.status, next.priority, next.dueAt, next.assignedToUserId]
    );
    return res.rows[0] ?? null;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE tasks SET deleted_at = now(), updated_at = now()
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
