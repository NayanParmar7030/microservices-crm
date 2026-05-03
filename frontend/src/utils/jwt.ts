import type { TJwtClaims } from "../types/auth";

export function decodeJwtClaims(token: string): TJwtClaims | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload) as TJwtClaims;
  } catch {
    return null;
  }
}
