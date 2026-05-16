import dotenv from "dotenv";
import path from "path";
// Load .env from the service root (one level up from src/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import Redis from "ioredis";
import { loadEnv } from "./config/env";
import { createPool } from "./db/pool";
import { runMigrations } from "./db/migrate";
import { createAuthMiddleware } from "./middlewares/authMiddleware";
import { LeadService } from "./services/leadService";
import { LeadsController } from "./controllers/leadsController";
import { TaskService } from "./services/taskService";
import { TasksController } from "./controllers/tasksController";
import { createApp } from "./app";
import { logger } from "./utils/logger";

async function main() {
  const env = loadEnv();
  const pool = createPool(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });

  await runMigrations(pool);

  const auth = createAuthMiddleware(env, redis);
  const leadService = new LeadService(pool);
  const taskService = new TaskService(pool);
  const leadsController = new LeadsController(leadService);
  const tasksController = new TasksController(taskService);
  const app = createApp(auth, leadsController, tasksController);

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "crm-service listening");
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
  logger.error(e, "crm-service failed to start");
  process.exit(1);
});
