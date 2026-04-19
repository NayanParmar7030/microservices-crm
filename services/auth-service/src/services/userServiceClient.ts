import type { Env } from "../config/env";
import { logger } from "../utils/logger";

export type UserBootstrapPayload = {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName: "admin" | "manager" | "user";
};

export type UserClaims = {
  role: "admin" | "manager" | "user";
};

export class UserServiceClient {
  constructor(private readonly env: Env) {}

  async bootstrapUser(payload: UserBootstrapPayload): Promise<void> {
    const url = `${this.env.USER_SERVICE_URL.replace(/\/$/, "")}/internal/api/v1/users/bootstrap`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": this.env.INTERNAL_SERVICE_SECRET,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, text }, "user-service bootstrap failed");
      throw new Error("Failed to provision user profile");
    }
  }

  async getClaims(userId: string): Promise<UserClaims> {
    const url = `${this.env.USER_SERVICE_URL.replace(/\/$/, "")}/internal/api/v1/users/${userId}/claims`;
    const res = await fetch(url, {
      headers: { "x-internal-secret": this.env.INTERNAL_SERVICE_SECRET },
    });
    if (!res.ok) {
      logger.warn({ status: res.status, userId }, "user-service claims fetch failed");
      return { role: "user" };
    }
    const body = (await res.json()) as { success?: boolean; data?: UserClaims };
    return body.data ?? { role: "user" };
  }
}
