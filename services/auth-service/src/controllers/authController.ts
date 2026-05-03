import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { sendSuccess } from "../utils/response";
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from "../utils/cookies";

export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private readonly useSecureCookie = process.env.NODE_ENV === "production";

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.auth.register(req.body);
      setRefreshCookie(res, result.refreshToken, {
        maxAgeSec: result.refreshTtlSec,
        secure: this.useSecureCookie,
      });
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
      setRefreshCookie(res, result.refreshToken, {
        maxAgeSec: result.refreshTtlSec,
        secure: this.useSecureCookie,
      });
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
      const token = req.body.refreshToken ?? readRefreshCookie(req);
      if (!token) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Missing refresh token" },
        });
      }
      const result = await this.auth.refresh(token);
      setRefreshCookie(res, result.refreshToken, {
        maxAgeSec: result.refreshTtlSec,
        secure: this.useSecureCookie,
      });
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
      const refreshCookie = readRefreshCookie(req);
      await this.auth.logout({
        accessToken,
        refreshToken: req.body.refreshToken ?? refreshCookie ?? undefined,
      });
      clearRefreshCookie(res);
      return sendSuccess(res, null, "Logged out");
    } catch (e) {
      return next(e);
    }
  };
}
