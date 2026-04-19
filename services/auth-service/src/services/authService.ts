import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import type { Env } from "../config/env";
import type { DbPool } from "../db/pool";
import { withTransaction } from "../db/pool";
import { TenantRepository } from "../repositories/tenantRepository";
import { UserAuthRepository } from "../repositories/userAuthRepository";
import { ConflictError, UnauthorizedError } from "../utils/errors";
import { logger } from "../utils/logger";
import { TokenService } from "./tokenService";
import { UserServiceClient } from "./userServiceClient";

const BCRYPT_ROUNDS = 12;

function slugifyOrganization(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = randomBytes(3).toString("hex");
  return `${base || "org"}-${suffix}`;
}

export class AuthService {
  private readonly tenants: TenantRepository;
  private readonly users: UserAuthRepository;
  private readonly usersClient: UserServiceClient;

  constructor(
    private readonly env: Env,
    private readonly pool: DbPool,
    private readonly tokens: TokenService
  ) {
    this.tenants = new TenantRepository(this.pool);
    this.users = new UserAuthRepository(this.pool);
    this.usersClient = new UserServiceClient(this.env);
  }

  async register(input: {
    email: string;
    password: string;
    organizationName: string;
    firstName: string;
    lastName: string;
  }) {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const slug = slugifyOrganization(input.organizationName);

    let tenantId: string;
    let userId: string;
    let tenantSlug: string;

    try {
      const result = await withTransaction(this.pool, async (client) => {
        const tenant = await this.tenants.create(client, input.organizationName.trim(), slug);
        const user = await this.users.create(client, tenant.id, input.email, passwordHash);
        return { tenantId: tenant.id, userId: user.id, tenantSlug: tenant.slug };
      });
      tenantId = result.tenantId;
      userId = result.userId;
      tenantSlug = result.tenantSlug;
    } catch (e: unknown) {
      if (this.isUniqueViolation(e)) {
        throw new ConflictError("Email already registered for this organization");
      }
      throw e;
    }

    try {
      await this.usersClient.bootstrapUser({
        id: userId,
        tenantId,
        email: input.email.trim(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        roleName: "admin",
      });
    } catch (e) {
      logger.error({ e, userId }, "bootstrap failed; rolling back auth user");
      await this.pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
      await this.pool.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
      throw e;
    }

    const pair = await this.tokens.issueTokenPair({
      userId,
      tenantId,
      email: input.email.trim(),
      role: "admin",
    });

    return {
      tenantId,
      tenantSlug,
      userId,
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
    };
  }

  async login(input: { email: string; password: string; tenantSlug?: string }) {
    let row;
    if (input.tenantSlug) {
      const tenant = await this.tenants.findBySlug(input.tenantSlug);
      if (!tenant) {
        throw new UnauthorizedError("Invalid credentials");
      }
      row = await this.users.findByTenantAndEmail(tenant.id, input.email);
    } else {
      row = await this.users.findByEmailAcrossTenants(input.email);
    }

    if (!row) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const ok = await bcrypt.compare(input.password, row.password_hash);
    if (!ok) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const claims = await this.usersClient.getClaims(row.id);
    const tenant = await this.tenants.findById(row.tenant_id);

    const pair = await this.tokens.issueTokenPair({
      userId: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      role: claims.role,
    });

    return {
      tenantId: row.tenant_id,
      tenantSlug: tenant?.slug,
      userId: row.id,
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    return this.tokens.rotateRefreshToken(refreshToken);
  }

  async logout(input: { accessToken?: string; refreshToken?: string }) {
    if (input.refreshToken) {
      try {
        const { default: jwt } = await import("jsonwebtoken");
        const decoded = jwt.verify(input.refreshToken, this.env.JWT_REFRESH_SECRET) as { jti?: string };
        if (decoded.jti) {
          await this.tokens.revokeRefreshByJti(decoded.jti);
        }
      } catch {
        // ignore invalid refresh on logout
      }
    }

    if (input.accessToken) {
      try {
        const { default: jwt } = await import("jsonwebtoken");
        const decoded = jwt.verify(input.accessToken, this.env.JWT_ACCESS_SECRET) as { jti?: string; exp?: number };
        if (decoded.jti && decoded.exp) {
          const ttl = Math.max(1, decoded.exp - Math.floor(Date.now() / 1000));
          await this.tokens.denylistAccessJti(decoded.jti, ttl);
        }
      } catch {
        // ignore invalid access token
      }
    }
  }

  private isUniqueViolation(e: unknown): boolean {
    return Boolean(e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505");
  }
}
