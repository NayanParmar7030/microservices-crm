import type { DbPool } from "../db/pool";
import type { AuthContext } from "../models/authContext";
import {
  NotificationsRepository,
  type NotificationRow,
} from "../repositories/notificationsRepository";
import { AppError } from "../utils/errors";
import { publishNotificationCreated, subscribeNotificationCreated } from "./notificationEvents";

type CreateNotificationInput = {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export class NotificationService {
  private readonly notifications: NotificationsRepository;

  constructor(private readonly pool: DbPool) {
    this.notifications = new NotificationsRepository(this.pool);
  }

  async list(
    auth: AuthContext,
    page: number,
    pageSize: number,
    unreadOnly: boolean
  ) {
    const result = await this.notifications.listByUser({
      tenantId: auth.tenantId,
      userId: auth.userId,
      page,
      pageSize,
      unreadOnly,
    });
    return {
      items: result.rows.map((row) => this.toDto(row)),
      page,
      limit: pageSize,
      total: result.total,
    };
  }

  async unreadCount(auth: AuthContext) {
    const count = await this.notifications.unreadCount(auth.tenantId, auth.userId);
    return { unread: count };
  }

  async markRead(auth: AuthContext, id: string) {
    const ok = await this.notifications.markRead(auth.tenantId, auth.userId, id);
    if (!ok) {
      throw new AppError("NOT_FOUND", "Notification not found", 404);
    }
    return { id };
  }

  async markAllRead(auth: AuthContext) {
    const updated = await this.notifications.markAllRead(auth.tenantId, auth.userId);
    return { updated };
  }

  async createInternal(input: CreateNotificationInput) {
    if (!input.type.trim() || !input.title.trim() || !input.message.trim()) {
      throw new AppError("VALIDATION_ERROR", "type, title and message are required", 422);
    }

    const row = await this.notifications.create({
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type.trim(),
      title: input.title.trim(),
      message: input.message.trim(),
      metadata: input.metadata ?? {},
    });
    const dto = this.toDto(row);
    publishNotificationCreated({
      tenantId: dto.tenantId,
      userId: dto.userId,
      notificationId: dto.id,
    });
    return dto;
  }

  subscribeCreated(listener: (event: { tenantId: string; userId: string; notificationId: string }) => void) {
    return subscribeNotificationCreated(listener);
  }

  private toDto(row: NotificationRow) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      metadata: row.metadata,
      isRead: row.is_read,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
  }
}
