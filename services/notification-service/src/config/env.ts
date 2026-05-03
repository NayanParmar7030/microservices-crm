import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3004),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string(),
  JWT_ACCESS_SECRET: z.string().min(32),
  INTERNAL_SERVICE_SECRET: z.string().min(16),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid notification-service environment: ${parsed.error.message}`);
  }
  return parsed.data;
}
