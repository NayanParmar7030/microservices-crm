import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { UserController } from "../controllers/userController";
import { validateRequest } from "../middlewares/validateRequest";
import { requireRoles } from "../middlewares/rbacMiddleware";

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const patchSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  email: z.string().email().max(320).optional(),
});

const roleSchema = z.object({
  role: z.enum(["admin", "manager", "user"]),
});

function asHandler(handler: RequestHandler | ((...args: any[]) => any)): RequestHandler {
  return handler as RequestHandler;
}

export function buildUserRouter(auth: RequestHandler, controller: UserController) {
  const r = Router();
  r.use(auth);

  r.get(
    "/",
    validateRequest(listQuery, "query"),
    requireRoles("admin", "manager"),
    asHandler(controller.list)
  );
  r.get("/:id", asHandler(controller.getById));
  r.patch("/:id", validateRequest(patchSchema), asHandler(controller.update));
  r.patch("/:id/role", validateRequest(roleSchema), requireRoles("admin"), asHandler(controller.assignRole));
  r.delete("/:id", requireRoles("admin"), asHandler(controller.remove));

  return r;
}
