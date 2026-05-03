import type { DbPool } from "../db/pool";

export type NotificationRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
};

export class NotificationsRepository {
  constructor(private readonly pool: DbPool) {}

  async create(input: {
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
  }): Promise<NotificationRow> {
    const res = await this.pool.query<NotificationRow>(
      `INSERT INTO notifications (tenant_id, user_id, type, title, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, tenant_id, user_id, type, title, message, metadata, is_read, read_at, created_at`,
      [
        input.tenantId,
        input.userId,
        input.type,
        input.title,
        input.message,
        JSON.stringify(input.metadata),
      ]
    );
    return res.rows[0];
  }

  async listByUser(params: {
    tenantId: string;
    userId: string;
    page: number;
    pageSize: number;
    unreadOnly: boolean;
  }): Promise<{ rows: NotificationRow[]; total: number }> {
    const offset = (params.page - 1) * params.pageSize;
    const where = params.unreadOnly
      ? "tenant_id = $1 AND user_id = $2 AND is_read = false"
      : "tenant_id = $1 AND user_id = $2";

    const countRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM notifications WHERE ${where}`,
      [params.tenantId, params.userId]
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    const rowsRes = await this.pool.query<NotificationRow>(
      `SELECT id, tenant_id, user_id, type, title, message, metadata, is_read, read_at, created_at
       FROM notifications
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [params.tenantId, params.userId, params.pageSize, offset]
    );

    return { rows: rowsRes.rows, total };
  }

  async unreadCount(tenantId: string, userId: string): Promise<number> {
    const res = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM notifications
       WHERE tenant_id = $1 AND user_id = $2 AND is_read = false`,
      [tenantId, userId]
    );
    return Number(res.rows[0]?.count ?? 0);
  }

  async markRead(tenantId: string, userId: string, id: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE notifications
       SET is_read = true, read_at = now()
       WHERE tenant_id = $1 AND user_id = $2 AND id = $3 AND is_read = false`,
      [tenantId, userId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async markAllRead(tenantId: string, userId: string): Promise<number> {
    const res = await this.pool.query(
      `UPDATE notifications
       SET is_read = true, read_at = now()
       WHERE tenant_id = $1 AND user_id = $2 AND is_read = false`,
      [tenantId, userId]
    );
    return res.rowCount ?? 0;
  }
}
