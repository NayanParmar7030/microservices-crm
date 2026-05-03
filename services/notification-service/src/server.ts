import "dotenv/config";
import Redis from "ioredis";
import { loadEnv } from "./config/env";
import { createPool } from "./db/pool";
import { runMigrations } from "./db/migrate";
import { createAuthMiddleware } from "./middlewares/authMiddleware";
import { createInternalMiddleware } from "./middlewares/internalMiddleware";
import { NotificationService } from "./services/notificationService";
import { NotificationsController } from "./controllers/notificationsController";
import { createApp } from "./app";
import { logger } from "./utils/logger";

async function main() {
  const env = loadEnv();
  const pool = createPool(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });

  await runMigrations(pool);

  const auth = createAuthMiddleware(env, redis);
  const internal = createInternalMiddleware(env);
  const notificationService = new NotificationService(pool);
  const controller = new NotificationsController(notificationService);
  const app = createApp(auth, internal, controller);

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "notification-service listening");
  });

  const shutdown = async () => {
    server.close();
    await pool.end();
    redis.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  logger.error(e, "notification-service failed to start");
  process.exit(1);
});
