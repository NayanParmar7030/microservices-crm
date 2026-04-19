import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import type { DbPool } from "./db/pool";
import { UserDomainService } from "./services/userDomainService";
import { InternalUserController } from "./controllers/internalUserController";
import { UserController } from "./controllers/userController";
import { buildInternalRouter } from "./routes/internalRoutes";
import { buildUserRouter } from "./routes/userRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./utils/logger";
import type { Env } from "./config/env";

export function createApp(env: Env, pool: DbPool, auth: express.RequestHandler) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: false, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.use(pinoHttp({ logger }));

  const users = new UserDomainService(pool);
  const internalController = new InternalUserController(users);
  const userController = new UserController(users);

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { service: "user-service" }, message: "ok" });
  });

  app.use("/internal/api/v1", buildInternalRouter(env, internalController));
  app.use("/api/v1/users", buildUserRouter(auth, userController));

  app.use(errorHandler);
  return app;
}
