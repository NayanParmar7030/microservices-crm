import type { ReactNode } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useAuthStore } from "../store/auth.store";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: readonly string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const role = useAuthStore((state) => state.user?.role);
  const location = useRouterState({ select: (state) => state.location });

  if (!isBootstrapped) {
    return <p className="text-sm text-slate-500">Checking session...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" search={{ redirect: location.href }} />;
  }

  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to="/403" />;
  }

  return <>{children}</>;
}
