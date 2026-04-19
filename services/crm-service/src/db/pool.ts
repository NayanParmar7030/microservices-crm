import pg from "pg";

export function createPool(databaseUrl: string) {
  return new pg.Pool({ connectionString: databaseUrl, max: 20, idleTimeoutMillis: 30_000 });
}

export type DbPool = ReturnType<typeof createPool>;
