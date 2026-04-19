import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { LeadsController } from "../controllers/leadsController";
import { validateRequest } from "../middlewares/validateRequest";

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
});

const patchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
});

function asHandler(handler: RequestHandler | ((...args: any[]) => any)): RequestHandler {
  return handler as RequestHandler;
}

export function buildLeadRouter(auth: RequestHandler, controller: LeadsController) {
  const r = Router();
  r.use(auth);
  r.get("/", validateRequest(listQuery, "query"), asHandler(controller.list));
  r.post("/", validateRequest(createBody), asHandler(controller.create));
  r.get("/:id", asHandler(controller.getById));
  r.patch("/:id", validateRequest(patchBody), asHandler(controller.update));
  r.delete("/:id", asHandler(controller.remove));
  return r;
}
