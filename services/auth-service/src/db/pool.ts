import pg from "pg";
import type { Env } from "../config/env";

export function createPool(databaseUrl: string) {
  return new pg.Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30_000,
  });
}

export type DbPool = ReturnType<typeof createPool>;

export async function withTransaction<T>(pool: DbPool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
