import { Router } from "express";
import { z } from "zod";
import type { AuthController } from "../controllers/authController";
import { validateRequest } from "../middlewares/validateRequest";

const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  organizationName: z.string().min(2).max(120),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
});

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  tenantSlug: z.string().min(2).max(80).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

export function buildAuthRouter(controller: AuthController) {
  const r = Router();
  r.post("/register", validateRequest(registerSchema), controller.register);
  r.post("/login", validateRequest(loginSchema), controller.login);
  r.post("/refresh", validateRequest(refreshSchema), controller.refresh);
  r.post("/logout", validateRequest(logoutSchema), controller.logout);
  return r;
}
