import { Suspense, lazy } from "react";
import {
  Link,
  Navigate,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { logout } from "./api/auth.api";
import { AuthBootstrap } from "./components/AuthBootstrap";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthStore } from "./store/auth.store";

const TasksPage = lazy(async () => {
  const m = await import("./pages/TasksPage");
  return { default: m.TasksPage };
});
const NotificationsPage = lazy(async () => {
  const m = await import("./pages/NotificationsPage");
  return { default: m.NotificationsPage };
});
const LoginPage = lazy(async () => {
  const m = await import("./pages/LoginPage");
  return { default: m.LoginPage };
});
const RegisterPage = lazy(async () => {
  const m = await import("./pages/RegisterPage");
  return { default: m.RegisterPage };
});
const ForbiddenPage = lazy(async () => {
  const m = await import("./pages/ForbiddenPage");
  return { default: m.ForbiddenPage };
});
const SettingsUsersPage = lazy(async () => {
  const m = await import("./pages/SettingsUsersPage");
  return { default: m.SettingsUsersPage };
});
const LeadsPage = lazy(async () => {
  const m = await import("./pages/LeadsPage");
  return { default: m.LeadsPage };
});

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "3px solid #e5e7eb", borderTopColor: "#6366f1",
          animation: "spin 0.7s linear infinite"
        }} />
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// SVG icons
function IconTasks() {
  return (
    <svg className="sidebar-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}
function IconLeads() {
  return (
    <svg className="sidebar-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconNotifications() {
  return (
    <svg className="sidebar-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="sidebar-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function SidebarLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const routerState = useRouterState();
  const isActive = routerState.location.pathname === to ||
    (to !== "/" && routerState.location.pathname.startsWith(to));
  return (
    <Link to={to} className={`sidebar-link${isActive ? " active" : ""}`}>
      {icon}
      {label}
    </Link>
  );
}

function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  async function onLogout() {
    try { await logout(); } finally { clearAuth(); }
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">⚡ CRM Pro</div>
        <div className="sidebar-logo-sub">Microservices Platform</div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Workspace</div>
        <SidebarLink to="/tasks" icon={<IconTasks />} label="Tasks" />
        <SidebarLink to="/leads" icon={<IconLeads />} label="Leads" />
        <SidebarLink to="/notifications" icon={<IconNotifications />} label="Notifications" />
        {user?.role === "admin" && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 8 }}>Admin</div>
            <SidebarLink to="/settings/users" icon={<IconUsers />} label="Users" />
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.email ?? "—"}</div>
            <div className="sidebar-user-role">{user?.role ?? ""}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            width: "100%", padding: "8px 10px", marginTop: 4,
            background: "transparent", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.45)", fontSize: 13, borderRadius: 8,
            transition: "all 0.15s"
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <IconLogout />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <>
        <AuthBootstrap />
        <Outlet />
      </>
    );
  }

  return (
    <div className="app-shell">
      <AuthBootstrap />
      <Sidebar />
      <div className="main-content">
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

// Route components
function wrap(Component: React.ComponentType, roles?: string[]) {
  return function RouteComponent() {
    return (
      <ProtectedRoute roles={roles}>
        <Suspense fallback={<PageSkeleton />}>
          <Component />
        </Suspense>
      </ProtectedRoute>
    );
  };
}

function LoginRouteComponent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  if (!isBootstrapped) return <PageSkeleton />;
  if (isAuthenticated) return <Navigate to="/tasks" />;
  return <Suspense fallback={<PageSkeleton />}><LoginPage /></Suspense>;
}

function RegisterRouteComponent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  if (!isBootstrapped) return <PageSkeleton />;
  if (isAuthenticated) return <Navigate to="/tasks" />;
  return <Suspense fallback={<PageSkeleton />}><RegisterPage /></Suspense>;
}

// Routes
const rootRoute = createRootRoute({ component: AppLayout });

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: wrap(TasksPage) });
const tasksRoute = createRoute({ getParentRoute: () => rootRoute, path: "/tasks", component: wrap(TasksPage) });
const leadsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/leads", component: wrap(LeadsPage) });
const notificationsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/notifications", component: wrap(NotificationsPage) });
const settingsUsersRoute = createRoute({ getParentRoute: () => rootRoute, path: "/settings/users", component: wrap(SettingsUsersPage, ["admin"]) });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/login", component: LoginRouteComponent });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: "/register", component: RegisterRouteComponent });
const forbiddenRoute = createRoute({
  getParentRoute: () => rootRoute, path: "/403",
  component: () => <Suspense fallback={<PageSkeleton />}><ForbiddenPage /></Suspense>
});

const routeTree = rootRoute.addChildren([
  indexRoute, tasksRoute, leadsRoute, notificationsRoute,
  loginRoute, registerRoute, forbiddenRoute, settingsUsersRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register { router: typeof router; }
}

export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}
