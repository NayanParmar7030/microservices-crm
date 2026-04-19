import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import type { LeadsController } from "./controllers/leadsController";
import { buildLeadRouter } from "./routes/leadRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./utils/logger";

export function createApp(auth: express.RequestHandler, controller: LeadsController) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: false, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { service: "crm-service" }, message: "ok" });
  });

  app.use("/api/v1/crm/leads", buildLeadRouter(auth, controller));

  app.use(errorHandler);
  return app;
}
