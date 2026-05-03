import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import type { NotificationsController } from "./controllers/notificationsController";
import { buildNotificationsRouter } from "./routes/notificationsRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./utils/logger";

export function createApp(
  auth: express.RequestHandler,
  internal: express.RequestHandler,
  controller: NotificationsController
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: false, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { service: "notification-service" }, message: "ok" });
  });

  const routers = buildNotificationsRouter(auth, internal, controller);
  app.use("/api/v1/notifications", routers.userRouter);
  app.use("/api/v1/internal/notifications", routers.internalRouter);

  app.use(errorHandler);
  return app;
}
