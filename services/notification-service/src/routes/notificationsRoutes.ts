import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { NotificationsController } from "../controllers/notificationsController";
import { validateRequest } from "../middlewares/validateRequest";

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  unreadOnly: z.enum(["true", "false"]).optional(),
});

const internalCreateBody = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  metadata: z.record(z.unknown()).optional(),
});

function asHandler(handler: RequestHandler | ((...args: any[]) => any)): RequestHandler {
  return handler as RequestHandler;
}

export function buildNotificationsRouter(
  auth: RequestHandler,
  internal: RequestHandler,
  controller: NotificationsController
) {
  const r = Router();

  r.use(auth);
  r.get("/stream", asHandler(controller.stream));
  r.get("/", validateRequest(listQuery, "query"), asHandler(controller.list));
  r.get("/unread", asHandler(controller.unreadCount));
  r.patch("/:id/read", asHandler(controller.markRead));
  r.patch("/read-all", asHandler(controller.markAllRead));

  const internalRouter = Router();
  internalRouter.use(internal);
  internalRouter.post(
    "/",
    validateRequest(internalCreateBody),
    asHandler(controller.createInternal)
  );

  return { userRouter: r, internalRouter };
}
