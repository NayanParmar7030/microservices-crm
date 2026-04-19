import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { sendSuccess } from "../utils/response";

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.auth.register(req.body);
      return sendSuccess(
        res,
        {
          tenantId: result.tenantId,
          tenantSlug: result.tenantSlug,
          userId: result.userId,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        "Registered successfully",
        201
      );
    } catch (e) {
      return next(e);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.auth.login(req.body);
      return sendSuccess(res, {
        tenantId: result.tenantId,
        tenantSlug: result.tenantSlug,
        userId: result.userId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (e) {
      return next(e);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.auth.refresh(req.body.refreshToken);
      return sendSuccess(res, {
        tenantId: result.tenantId,
        userId: result.userId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (e) {
      return next(e);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.header("authorization")?.replace(/^Bearer\s+/i, "");
      await this.auth.logout({
        accessToken,
        refreshToken: req.body.refreshToken,
      });
      return sendSuccess(res, null, "Logged out");
    } catch (e) {
      return next(e);
    }
  };
}
