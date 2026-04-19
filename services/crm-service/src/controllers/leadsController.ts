import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "../middlewares/authMiddleware";
import { LeadService } from "../services/leadService";
import { sendSuccess } from "../utils/response";

export class LeadsController {
  constructor(private readonly leads: LeadService) {}

  create = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.leads.create(req.auth, req.body);
      return sendSuccess(res, dto, "Lead created", 201);
    } catch (e) {
      return next(e);
    }
  };

  list = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const result = await this.leads.list(req.auth, page, limit);
      return sendSuccess(res, result);
    } catch (e) {
      return next(e);
    }
  };

  getById = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.leads.getById(req.auth, req.params.id);
      return sendSuccess(res, dto);
    } catch (e) {
      return next(e);
    }
  };

  update = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.leads.update(req.auth, req.params.id, req.body);
      return sendSuccess(res, dto, "Lead updated");
    } catch (e) {
      return next(e);
    }
  };

  remove = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await this.leads.remove(req.auth, req.params.id);
      return sendSuccess(res, null, "Lead deleted");
    } catch (e) {
      return next(e);
    }
  };
}
