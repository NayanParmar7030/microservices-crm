import type pg from "pg";
import type { DbPool } from "../db/pool";

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
};

export class TenantRepository {
  constructor(private readonly pool: DbPool) {}

  async create(client: pg.Pool | pg.PoolClient, name: string, slug: string): Promise<TenantRow> {
    const res = await client.query<TenantRow>(
      `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at`,
      [name, slug]
    );
    return res.rows[0];
  }

  async findBySlug(slug: string): Promise<TenantRow | null> {
    const res = await this.pool.query<TenantRow>(`SELECT id, name, slug, created_at FROM tenants WHERE slug = $1`, [slug]);
    return res.rows[0] ?? null;
  }

  async findById(id: string): Promise<TenantRow | null> {
    const res = await this.pool.query<TenantRow>(`SELECT id, name, slug, created_at FROM tenants WHERE id = $1`, [id]);
    return res.rows[0] ?? null;
  }
}
