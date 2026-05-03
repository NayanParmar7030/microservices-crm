import type { Request, Response } from "express";

const REFRESH_COOKIE_NAME = "crm_rt";

export function setRefreshCookie(
  res: Response,
  refreshToken: string,
  options: { maxAgeSec: number; secure: boolean }
) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: options.secure,
    path: "/api/v1/auth",
    maxAge: options.maxAgeSec * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "strict",
    path: "/api/v1/auth",
  });
}

export function readRefreshCookie(req: Request): string | null {
  const cookieHeader = req.header("cookie");
  if (!cookieHeader) {
    return null;
  }
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName !== REFRESH_COOKIE_NAME) {
      continue;
    }
    const rawValue = rest.join("=");
    if (!rawValue) {
      return null;
    }
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }
  return null;
}
