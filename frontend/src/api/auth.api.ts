import { api } from "../lib/api";
import type { TApiSuccess } from "../types/api";
import type { TAuthPayload } from "../types/auth";

type TLoginInput = {
  email: string;
  password: string;
  tenantSlug?: string;
};

type TRegisterInput = {
  email: string;
  password: string;
  organizationName: string;
  firstName: string;
  lastName: string;
};

export async function login(payload: TLoginInput) {
  const response = await api.post<TApiSuccess<TAuthPayload>>("/auth/login", payload);
  return response.data.data;
}

export async function register(payload: TRegisterInput) {
  const response = await api.post<TApiSuccess<TAuthPayload>>("/auth/register", payload);
  return response.data.data;
}

export async function refreshSession() {
  const response = await api.post<TApiSuccess<TAuthPayload>>("/auth/refresh", {});
  return response.data.data;
}

export async function logout() {
  await api.post("/auth/logout", {});
}
