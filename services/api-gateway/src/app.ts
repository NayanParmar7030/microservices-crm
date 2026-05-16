import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import type { Env } from "./config/env";
import { logger } from "./utils/logger";
import { createUpstreamProxy } from "./utils/upstreamProxy";

export function createApp(env: Env) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === env.FRONTEND_ORIGIN) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );
  app.use(compression());
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { service: "api-gateway" }, message: "ok" });
  });

  const timeoutMs = env.GATEWAY_PROXY_TIMEOUT_MS;

  // Express strips the mount prefix before http-proxy-middleware sees the path.
  // e.g. mount at /api/v1/auth → proxy sees /register → rewrite to /api/v1/auth/register
  app.use("/api/v1/auth", createUpstreamProxy(env.AUTH_SERVICE_URL, timeoutMs, { "^/": "/api/v1/auth/" }));
  app.use("/api/v1/users", createUpstreamProxy(env.USER_SERVICE_URL, timeoutMs, { "^/": "/api/v1/users/" }));
  app.use("/api/v1/crm", createUpstreamProxy(env.CRM_SERVICE_URL, timeoutMs, { "^/": "/api/v1/crm/" }));
  app.use("/api/v1/notifications", createUpstreamProxy(env.NOTIFICATION_SERVICE_URL, timeoutMs, { "^/": "/api/v1/notifications/" }));

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });

  return app;
}
