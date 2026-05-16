import { useState } from "react";
import { useAssignRole, useDeleteUser, useUsers } from "../api/users.api";
import { useAuthStore } from "../store/auth.store";
import type { TUser } from "../types/api";

const ROLE_BADGE: Record<TUser["role"], string> = {
  admin: "badge badge-red",
  manager: "badge badge-blue",
  user: "badge badge-gray",
};

export function SettingsUsersPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [roleEditId, setRoleEditId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<TUser["role"]>("user");

  const { data, isLoading, isError } = useUsers({ page: 1, limit: 50 });
  const assignRole = useAssignRole();
  const deleteUser = useDeleteUser();

  const total = data?.total ?? 0;
  const admins = (data?.items ?? []).filter(u => u.role === "admin").length;
  const managers = (data?.items ?? []).filter(u => u.role === "manager").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage team members and permissions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        {[
          { label: "Total Members", value: total, color: "#6366f1" },
          { label: "Admins", value: admins, color: "#ef4444" },
          { label: "Managers", value: managers, color: "#3b82f6" },
          { label: "Users", value: total - admins - managers, color: "#6b7280" },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        {isLoading && <div className="empty-state"><div className="empty-state-icon">⏳</div><p className="empty-state-text">Loading users...</p></div>}
        {isError && <div className="empty-state"><div className="empty-state-icon">⚠️</div><p className="empty-state-text">Failed to load users</p></div>}

        {!isLoading && !isError && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0
                      }}>
                        {user.firstName?.[0]?.toUpperCase()}{user.lastName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "#1a1f36", fontSize: 13.5 }}>
                          {user.firstName} {user.lastName}
                          {user.id === currentUserId && (
                            <span style={{ marginLeft: 6, fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>(you)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "#6b7280" }}>{user.email}</td>
                  <td>
                    {roleEditId === user.id ? (
                      <div className="action-group">
                        <select className="crm-input" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as TUser["role"])}>
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="user">User</option>
                        </select>
                        <button className="btn btn-primary btn-sm" onClick={async () => { await assignRole.mutateAsync({ id: user.id, role: selectedRole }); setRoleEditId(null); }} disabled={assignRole.isPending}>
                          {assignRole.isPending ? "..." : "Save"}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setRoleEditId(null)}>✕</button>
                      </div>
                    ) : (
                      <span className={ROLE_BADGE[user.role as TUser["role"]] ?? "badge badge-gray"}>{user.role}</span>
                    )}
                  </td>
                  <td style={{ color: "#9ca3af", fontSize: 12.5 }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    {user.id === currentUserId ? (
                      <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>
                    ) : deleteConfirmId === user.id ? (
                      <div className="action-group">
                        <button className="btn btn-danger btn-sm" onClick={async () => { await deleteUser.mutateAsync(user.id); setDeleteConfirmId(null); }} disabled={deleteUser.isPending}>{deleteUser.isPending ? "..." : "Confirm"}</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="action-group">
                        <button className="btn btn-secondary btn-sm" onClick={() => { setRoleEditId(user.id); setSelectedRole(user.role as TUser["role"]); }}>Change Role</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirmId(user.id)}>Remove</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {(data?.items ?? []).length === 0 && (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <p className="empty-state-text">No team members yet</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
