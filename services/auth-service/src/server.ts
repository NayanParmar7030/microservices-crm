import "dotenv/config";
import Redis from "ioredis";
import { loadEnv } from "./config/env";
import { createPool } from "./db/pool";
import { runMigrations } from "./db/migrate";
import { AuthService } from "./services/authService";
import { TokenService } from "./services/tokenService";
import { AuthController } from "./controllers/authController";
import { createApp } from "./app";
import { logger } from "./utils/logger";

async function main() {
  const env = loadEnv();
  const pool = createPool(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });

  await runMigrations(pool);

  const tokens = new TokenService(env, redis);
  const authService = new AuthService(env, pool, tokens);
  const controller = new AuthController(authService);
  const app = createApp(controller);

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "auth-service listening");
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
  logger.error(e, "auth-service failed to start");
  process.exit(1);
});
