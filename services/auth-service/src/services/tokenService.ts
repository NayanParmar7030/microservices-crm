import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import type Redis from "ioredis";
import type { Env } from "../config/env";
import { UnauthorizedError } from "../utils/errors";

export type AccessTokenPayload = {
  sub: string;
  tid: string;
  role: string;
  email: string;
  typ: "access";
  jti: string;
};

export type RefreshTokenPayload = {
  sub: string;
  tid: string;
  typ: "refresh";
  jti: string;
  fib: string;
};

type RefreshSession = {
  userId: string;
  tenantId: string;
  familyId: string;
  email: string;
  role: string;
};

export class TokenService {
  constructor(
    private readonly env: Env,
    private readonly redis: Redis
  ) {}

  async issueTokenPair(params: {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const familyId = randomUUID();
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = jwt.sign(
      {
        sub: params.userId,
        tid: params.tenantId,
        role: params.role,
        email: params.email,
        typ: "access",
        jti: accessJti,
      } satisfies AccessTokenPayload,
      this.env.JWT_ACCESS_SECRET,
      { expiresIn: this.env.ACCESS_TOKEN_TTL_SEC }
    );

    const refreshToken = jwt.sign(
      {
        sub: params.userId,
        tid: params.tenantId,
        typ: "refresh",
        jti: refreshJti,
        fib: familyId,
      } satisfies RefreshTokenPayload,
      this.env.JWT_REFRESH_SECRET,
      { expiresIn: this.env.REFRESH_TOKEN_TTL_SEC }
    );

    const session: RefreshSession = {
      userId: params.userId,
      tenantId: params.tenantId,
      familyId,
      email: params.email,
      role: params.role,
    };

    await this.redis.setex(
      this.refreshKey(refreshJti),
      this.env.REFRESH_TOKEN_TTL_SEC,
      JSON.stringify(session)
    );

    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    tenantId: string;
    email: string;
    role: string;
  }> {
    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(refreshToken, this.env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (decoded.typ !== "refresh") {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const familyRevoked = await this.redis.get(this.familyRevokeKey(decoded.fib));
    if (familyRevoked) {
      throw new UnauthorizedError("Session revoked");
    }

    const key = this.refreshKey(decoded.jti);
    const raw = await this.redis.get(key);
    if (!raw) {
      await this.redis.setex(this.familyRevokeKey(decoded.fib), this.env.REFRESH_TOKEN_TTL_SEC, "1");
      throw new UnauthorizedError("Invalid refresh token");
    }

    await this.redis.del(key);

    const parsed = JSON.parse(raw) as RefreshSession;

    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = jwt.sign(
      {
        sub: parsed.userId,
        tid: parsed.tenantId,
        role: parsed.role,
        email: parsed.email,
        typ: "access",
        jti: accessJti,
      } satisfies AccessTokenPayload,
      this.env.JWT_ACCESS_SECRET,
      { expiresIn: this.env.ACCESS_TOKEN_TTL_SEC }
    );

    const newRefresh = jwt.sign(
      {
        sub: parsed.userId,
        tid: parsed.tenantId,
        typ: "refresh",
        jti: refreshJti,
        fib: parsed.familyId,
      } satisfies RefreshTokenPayload,
      this.env.JWT_REFRESH_SECRET,
      { expiresIn: this.env.REFRESH_TOKEN_TTL_SEC }
    );

    const nextSession: RefreshSession = {
      userId: parsed.userId,
      tenantId: parsed.tenantId,
      familyId: parsed.familyId,
      email: parsed.email,
      role: parsed.role,
    };

    await this.redis.setex(
      this.refreshKey(refreshJti),
      this.env.REFRESH_TOKEN_TTL_SEC,
      JSON.stringify(nextSession)
    );

    return {
      accessToken,
      refreshToken: newRefresh,
      userId: parsed.userId,
      tenantId: parsed.tenantId,
      email: parsed.email,
      role: parsed.role,
    };
  }

  async revokeRefreshByJti(jti: string) {
    await this.redis.del(this.refreshKey(jti));
  }

  async denylistAccessJti(jti: string, ttlSec: number) {
    await this.redis.setex(`at_deny:${jti}`, ttlSec, "1");
  }

  async isAccessJtiDenylisted(jti: string): Promise<boolean> {
    const v = await this.redis.get(`at_deny:${jti}`);
    return Boolean(v);
  }

  private refreshKey(jti: string) {
    return `rtjti:${jti}`;
  }

  private familyRevokeKey(familyId: string) {
    return `fib_revoked:${familyId}`;
  }
}
