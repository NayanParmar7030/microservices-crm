import { useAuthStore } from "../store/auth.store";
import type { TAuthPayload } from "../types/auth";
import { decodeJwtClaims } from "../utils/jwt";

export function applyAuthPayload(payload: TAuthPayload) {
  const claims = decodeJwtClaims(payload.accessToken);
  if (!claims) {
    useAuthStore.getState().clearAuth();
    return;
  }
  useAuthStore.getState().setAuth({
    accessToken: payload.accessToken,
    tenantId: payload.tenantId,
    user: {
      id: payload.userId ?? claims.sub,
      email: claims.email,
      role: claims.role,
    },
  });
}
