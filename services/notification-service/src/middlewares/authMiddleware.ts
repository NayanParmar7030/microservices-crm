import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type Redis from "ioredis";
import type { Env } from "../config/env";
import type { AuthContext } from "../models/authContext";
import { UnauthorizedError } from "../utils/errors";

export type AuthedRequest = Request & { auth: AuthContext };

export function createAuthMiddleware(env: Env, redis: Redis) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.header("authorization");
      const token = header?.replace(/^Bearer\s+/i, "");
      if (!token) {
        throw new UnauthorizedError("Missing bearer token");
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        sub?: string;
        tid?: string;
        role?: string;
        email?: string;
        typ?: string;
        jti?: string;
      };

      if (
        decoded.typ !== "access" ||
        !decoded.sub ||
        !decoded.tid ||
        !decoded.role ||
        !decoded.email ||
        !decoded.jti
      ) {
        throw new UnauthorizedError("Invalid token");
      }

      const deny = await redis.get(`at_deny:${decoded.jti}`);
      if (deny) {
        throw new UnauthorizedError("Token revoked");
      }

      (req as AuthedRequest).auth = {
        userId: decoded.sub,
        tenantId: decoded.tid,
        role: decoded.role,
        email: decoded.email,
        jti: decoded.jti,
      };

      return next();
    } catch {
      return next(new UnauthorizedError("Invalid token"));
    }
  };
}
