import type { Request, Response, NextFunction } from "express";
import type { Env } from "../config/env";
import { ForbiddenError } from "../utils/errors";

export function createInternalMiddleware(env: Env) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const secret = req.header("x-internal-secret");
    if (!secret || secret !== env.INTERNAL_SERVICE_SECRET) {
      return next(new ForbiddenError("Invalid internal secret"));
    }
    return next();
  };
}
