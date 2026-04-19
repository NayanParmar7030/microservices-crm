import type { Request, Response, NextFunction } from "express";
import type { AnyZodObject } from "zod";
import { sendError } from "../utils/response";

export function validateRequest(schema: AnyZodObject, source: "body" | "query" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(source === "body" ? req.body : req.query);
    if (!parsed.success) {
      return sendError(res, "VALIDATION_ERROR", parsed.error.message, 422);
    }
    if (source === "body") {
      req.body = parsed.data;
    } else {
      req.query = parsed.data as typeof req.query;
    }
    return next();
  };
}
