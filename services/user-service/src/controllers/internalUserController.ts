import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { UserDomainService } from "../services/userDomainService";
import { sendSuccess } from "../utils/response";

export class InternalUserController {
  constructor(private readonly users: UserDomainService) {}

  bootstrap = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.users.bootstrap(req.body);
      return sendSuccess(res, { id: req.body.id }, "Bootstrapped", 201);
    } catch (e) {
      return next(e);
    }
  };

  claims = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const claims = await this.users.getClaimsForUserId(id);
      return sendSuccess(res, claims);
    } catch (e) {
      return next(e);
    }
  };
}
