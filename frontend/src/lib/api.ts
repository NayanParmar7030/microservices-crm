import axios from "axios";
import { useAuthStore } from "../store/auth.store";
import { applyAuthPayload } from "./session";

type TRefreshResponse = {
  success: boolean;
  data: { accessToken: string; tenantId: string; userId: string };
  message: string;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1",
  withCredentials: true,
  timeout: 10_000,
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<TRefreshResponse>("/auth/refresh", {})
      .then((res) => {
        applyAuthPayload(res.data.data);
        return res.data.data.accessToken;
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as { _retry?: boolean } & typeof error.config;
    // Never retry refresh calls — avoids infinite loop when session is absent
    if (original?.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (!token) {
        return Promise.reject(error);
      }
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);

export { api };
