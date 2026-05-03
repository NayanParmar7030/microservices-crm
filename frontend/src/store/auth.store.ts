import { create } from "zustand";

type TUserRole = "admin" | "manager" | "user" | string;

type TAuthUser = {
  id: string;
  email: string;
  role: TUserRole;
};

type TAuthState = {
  accessToken: string | null;
  tenantId: string | null;
  user: TAuthUser | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  setAuth: (payload: { accessToken: string; tenantId: string; user: TAuthUser }) => void;
  setBootstrapped: (bootstrapped: boolean) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<TAuthState>((set) => ({
  accessToken: null,
  tenantId: null,
  user: null,
  isAuthenticated: false,
  isBootstrapped: false,
  setAuth: ({ accessToken, tenantId, user }) =>
    set({ accessToken, tenantId, user, isAuthenticated: true }),
  setBootstrapped: (bootstrapped) => set({ isBootstrapped: bootstrapped }),
  clearAuth: () => set({ accessToken: null, tenantId: null, user: null, isAuthenticated: false }),
}));
