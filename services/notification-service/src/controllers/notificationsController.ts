import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "../middlewares/authMiddleware";
import { NotificationService } from "../services/notificationService";
import { sendSuccess } from "../utils/response";
import type { Request } from "express";

type InternalRequest = Request & {
  body: {
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  };
};

export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  list = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 25);
      const unreadOnly = req.query.unreadOnly === "true";
      const dto = await this.notifications.list(req.auth, page, limit, unreadOnly);
      return sendSuccess(res, dto);
    } catch (e) {
      return next(e);
    }
  };

  unreadCount = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.notifications.unreadCount(req.auth);
      return sendSuccess(res, dto);
    } catch (e) {
      return next(e);
    }
  };

  markRead = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.notifications.markRead(req.auth, req.params.id);
      return sendSuccess(res, dto, "Notification marked as read");
    } catch (e) {
      return next(e);
    }
  };

  markAllRead = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.notifications.markAllRead(req.auth);
      return sendSuccess(res, dto, "Notifications marked as read");
    } catch (e) {
      return next(e);
    }
  };

  createInternal = async (req: InternalRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.notifications.createInternal(req.body);
      return sendSuccess(res, dto, "Notification created", 201);
    } catch (e) {
      return next(e);
    }
  };

  stream = async (req: AuthedRequest, res: Response, _next: NextFunction) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, payload: Record<string, unknown>) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    send("connected", { ok: true, at: new Date().toISOString() });
    const unsubscribe = this.notifications.subscribeCreated((event) => {
      if (event.tenantId !== req.auth.tenantId || event.userId !== req.auth.userId) {
        return;
      }
      send("notification", {
        id: event.notificationId,
        at: new Date().toISOString(),
      });
    });

    const heartbeat = setInterval(() => {
      send("heartbeat", { at: new Date().toISOString() });
    }, 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  };
}
