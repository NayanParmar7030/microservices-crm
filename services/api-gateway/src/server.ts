import "dotenv/config";
import { loadEnv } from "./config/env";
import { createApp } from "./app";
import { logger } from "./utils/logger";

async function main() {
  const env = loadEnv();
  const app = createApp(env);

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "api-gateway listening");
  });

  const shutdown = async () => {
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  logger.error(e, "api-gateway failed to start");
  process.exit(1);
});
