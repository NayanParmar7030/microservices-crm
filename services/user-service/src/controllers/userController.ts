import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "../middlewares/authMiddleware";
import { UserDomainService } from "../services/userDomainService";
import { sendSuccess } from "../utils/response";

export class UserController {
  constructor(private readonly users: UserDomainService) {}

  list = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const result = await this.users.listUsers(req.auth.tenantId, page, limit);
      return sendSuccess(res, {
        items: result.rows.map((r) => ({
          id: r.id,
          tenantId: r.tenant_id,
          email: r.email,
          firstName: r.first_name,
          lastName: r.last_name,
          role: r.role_name,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
        page,
        limit,
        total: result.total,
      });
    } catch (e) {
      return next(e);
    }
  };

  getById = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.users.getUser(req.auth.tenantId, req.params.id, req.auth);
      return sendSuccess(res, dto);
    } catch (e) {
      return next(e);
    }
  };

  update = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.users.updateUser(req.auth.tenantId, req.params.id, req.body, req.auth);
      return sendSuccess(res, dto, "Updated");
    } catch (e) {
      return next(e);
    }
  };

  assignRole = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.users.assignRole(req.auth.tenantId, req.params.id, req.body.role, req.auth);
      return sendSuccess(res, dto, "Role updated");
    } catch (e) {
      return next(e);
    }
  };

  remove = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await this.users.deleteUser(req.auth.tenantId, req.params.id, req.auth);
      return sendSuccess(res, null, "User deleted");
    } catch (e) {
      return next(e);
    }
  };
}
