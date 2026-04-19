import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import type { AuthController } from "./controllers/authController";
import { buildAuthRouter } from "./routes/authRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./utils/logger";

export function createApp(controller: AuthController) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: false,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  app.use(
    pinoHttp({
      logger,
      autoLogging: true,
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { service: "auth-service" }, message: "ok" });
  });

  app.use("/api/v1/auth", buildAuthRouter(controller));

  app.use(errorHandler);
  return app;
}
