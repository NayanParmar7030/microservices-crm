import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "../middlewares/authMiddleware";
import { TaskService } from "../services/taskService";
import { sendSuccess } from "../utils/response";

export class TasksController {
  constructor(private readonly tasks: TaskService) {}

  create = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.tasks.create(req.auth, req.body);
      return sendSuccess(res, dto, "Task created", 201);
    } catch (e) {
      return next(e);
    }
  };

  list = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const priority = typeof req.query.priority === "string" ? req.query.priority : undefined;
      const result = await this.tasks.list(req.auth, page, limit, { status, priority });
      return sendSuccess(res, result);
    } catch (e) {
      return next(e);
    }
  };

  getById = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.tasks.getById(req.auth, req.params.id);
      return sendSuccess(res, dto);
    } catch (e) {
      return next(e);
    }
  };

  update = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const dto = await this.tasks.update(req.auth, req.params.id, req.body);
      return sendSuccess(res, dto, "Task updated");
    } catch (e) {
      return next(e);
    }
  };

  remove = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await this.tasks.remove(req.auth, req.params.id);
      return sendSuccess(res, null, "Task deleted");
    } catch (e) {
      return next(e);
    }
  };
}
