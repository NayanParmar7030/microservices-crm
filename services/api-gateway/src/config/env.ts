import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  AUTH_SERVICE_URL: z.string().min(1),
  USER_SERVICE_URL: z.string().min(1),
  CRM_SERVICE_URL: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid api-gateway environment: ${parsed.error.message}`);
  }
  return parsed.data;
}
