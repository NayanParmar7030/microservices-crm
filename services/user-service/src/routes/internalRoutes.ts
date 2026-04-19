import { Router } from "express";
import { z } from "zod";
import type { InternalUserController } from "../controllers/internalUserController";
import type { Env } from "../config/env";
import { createInternalMiddleware } from "../middlewares/internalMiddleware";
import { validateRequest } from "../middlewares/validateRequest";

const bootstrapSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  roleName: z.enum(["admin", "manager", "user"]),
});

export function buildInternalRouter(env: Env, controller: InternalUserController) {
  const r = Router();
  const internal = createInternalMiddleware(env);
  r.use(internal);
  r.post("/users/bootstrap", validateRequest(bootstrapSchema), controller.bootstrap);
  r.get("/users/:id/claims", controller.claims);
  return r;
}
