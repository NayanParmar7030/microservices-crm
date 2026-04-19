import type { Request, Response, NextFunction } from "express";
import type { AuthedRequest } from "./authMiddleware";
import { ForbiddenError } from "../utils/errors";

export function requireRoles(...allowed: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const auth = (req as AuthedRequest).auth;
    if (!allowed.includes(auth.role)) {
      return next(new ForbiddenError("Insufficient permissions"));
    }
    return next();
  };
}
