import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { Env } from "./config/env";
import { logger } from "./utils/logger";

export function createApp(env: Env) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: false, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
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

  const proxyCommon = { changeOrigin: true, xfwd: true } as const;

  app.use(
    "/api/v1/auth",
    createProxyMiddleware({
      target: env.AUTH_SERVICE_URL,
      ...proxyCommon,
    })
  );

  app.use(
    "/api/v1/users",
    createProxyMiddleware({
      target: env.USER_SERVICE_URL,
      ...proxyCommon,
    })
  );

  app.use(
    "/api/v1/crm",
    createProxyMiddleware({
      target: env.CRM_SERVICE_URL,
      ...proxyCommon,
    })
  );

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });

  return app;
}
