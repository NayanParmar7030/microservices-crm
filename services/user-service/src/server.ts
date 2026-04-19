import "dotenv/config";
import Redis from "ioredis";
import { loadEnv } from "./config/env";
import { createPool } from "./db/pool";
import { runMigrations } from "./db/migrate";
import { createAuthMiddleware } from "./middlewares/authMiddleware";
import { createApp } from "./app";
import { logger } from "./utils/logger";

async function main() {
  const env = loadEnv();
  const pool = createPool(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });

  await runMigrations(pool);

  const auth = createAuthMiddleware(env, redis);
  const app = createApp(env, pool, auth);

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "user-service listening");
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
  logger.error(e, "user-service failed to start");
  process.exit(1);
});
