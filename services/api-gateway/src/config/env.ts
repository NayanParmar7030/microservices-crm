import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  AUTH_SERVICE_URL: z.string().min(1),
  USER_SERVICE_URL: z.string().min(1),
  CRM_SERVICE_URL: z.string().min(1),
  NOTIFICATION_SERVICE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  GATEWAY_PROXY_TIMEOUT_MS: z.coerce.number().min(1000).max(300_000).default(60_000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid api-gateway environment: ${parsed.error.message}`);
  }
  return parsed.data;
}
