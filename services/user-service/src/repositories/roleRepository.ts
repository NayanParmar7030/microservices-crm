import type { DbPool } from "../db/pool";

export type RoleRow = { id: string; name: string };

export class RoleRepository {
  constructor(private readonly pool: DbPool) {}

  async findByName(name: string): Promise<RoleRow | null> {
    const res = await this.pool.query<RoleRow>(`SELECT id, name FROM roles WHERE name = $1`, [name]);
    return res.rows[0] ?? null;
  }

  async list(): Promise<RoleRow[]> {
    const res = await this.pool.query<RoleRow>(`SELECT id, name FROM roles ORDER BY name`);
    return res.rows;
  }
}
