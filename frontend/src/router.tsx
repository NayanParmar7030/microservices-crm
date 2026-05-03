import { Suspense, lazy } from "react";
import {
  Link,
  Navigate,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { logout } from "./api/auth.api";
import { AuthBootstrap } from "./components/AuthBootstrap";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Button } from "./components/ui/Button";
import { useAuthStore } from "./store/auth.store";

const TasksPage = lazy(async () => {
  const module = await import("./pages/TasksPage");
  return { default: module.TasksPage };
});

const NotificationsPage = lazy(async () => {
  const module = await import("./pages/NotificationsPage");
  return { default: module.NotificationsPage };
});

const LoginPage = lazy(async () => {
  const module = await import("./pages/LoginPage");
  return { default: module.LoginPage };
});

const RegisterPage = lazy(async () => {
  const module = await import("./pages/RegisterPage");
  return { default: module.RegisterPage };
});

const ForbiddenPage = lazy(async () => {
  const module = await import("./pages/ForbiddenPage");
  return { default: module.ForbiddenPage };
});

const SettingsUsersPage = lazy(async () => {
  const module = await import("./pages/SettingsUsersPage");
  return { default: module.SettingsUsersPage };
});

function PageSkeleton() {
  return <p className="text-sm text-slate-500">Loading page...</p>;
}

function TasksRouteComponent() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageSkeleton />}>
        <TasksPage />
      </Suspense>
    </ProtectedRoute>
  );
}

function NotificationsRouteComponent() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageSkeleton />}>
        <NotificationsPage />
      </Suspense>
    </ProtectedRoute>
  );
}

function SettingsUsersRouteComponent() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <Suspense fallback={<PageSkeleton />}>
        <SettingsUsersPage />
      </Suspense>
    </ProtectedRoute>
  );
}

function ForbiddenRouteComponent() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ForbiddenPage />
    </Suspense>
  );
}

function LoginRouteComponent() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/tasks" />;
  }
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LoginPage />
    </Suspense>
  );
}

function RegisterRouteComponent() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/tasks" />;
  }
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RegisterPage />
    </Suspense>
  );
}

function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  async function onLogout() {
    try {
      await logout();
    } finally {
      clearAuth();
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <AuthBootstrap />
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM Frontend</h1>
          <p className="text-sm text-slate-500">TanStack Router + Query + Zustand</p>
        </div>
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>{user.email}</span>
            <Button type="button" onClick={onLogout}>
              Logout
            </Button>
          </div>
        ) : null}
      </header>
      {isAuthenticated ? (
        <nav className="mb-4 flex gap-2">
          <Link
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            to="/tasks"
          >
            Tasks
          </Link>
          <Link
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            to="/notifications"
          >
            Notifications
          </Link>
          {user?.role === "admin" ? (
            <Link
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              to="/settings/users"
            >
              User Settings
            </Link>
          ) : null}
        </nav>
      ) : null}
      <Outlet />
    </main>
  );
}

const rootRoute = createRootRoute({
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: TasksRouteComponent,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: TasksRouteComponent,
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: NotificationsRouteComponent,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginRouteComponent,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterRouteComponent,
});

const forbiddenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/403",
  component: ForbiddenRouteComponent,
});

const settingsUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/users",
  component: SettingsUsersRouteComponent,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  tasksRoute,
  notificationsRoute,
  loginRoute,
  registerRoute,
  forbiddenRoute,
  settingsUsersRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}
