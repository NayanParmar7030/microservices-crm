import { useState } from "react";
import { useAssignRole, useDeleteUser, useUsers } from "../api/users.api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../components/ui/Table";
import { useAuthStore } from "../store/auth.store";
import type { TUser } from "../types/api";

const ROLE_COLORS: Record<TUser["role"], string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  user: "bg-slate-100 text-slate-700",
};

export function SettingsUsersPage() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [roleEditId, setRoleEditId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<TUser["role"]>("user");

  const { data, isLoading, isError, error } = useUsers({ page: 1, limit: 50 });
  const assignRole = useAssignRole();
  const deleteUser = useDeleteUser();

  async function onAssignRole(id: string) {
    await assignRole.mutateAsync({ id, role: selectedRole });
    setRoleEditId(null);
  }

  async function onDelete(id: string) {
    await deleteUser.mutateAsync(id);
    setDeleteConfirmId(null);
  }

  return (
    <section className="grid gap-4">
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage team members and their roles. Admin only.
        </p>
      </Card>

      <Card>
        {isLoading && <p className="text-sm text-slate-500">Loading users...</p>}
        {isError && (
          <p className="text-sm text-red-600">Failed to load users: {(error as Error).message}</p>
        )}
        {!isLoading && !isError && (
          <>
            <p className="mb-2 text-sm text-slate-500">Total: {data?.total ?? 0}</p>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Joined</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.items ?? []).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-slate-900">
                      {user.firstName} {user.lastName}
                      {user.id === currentUserId && (
                        <span className="ml-2 text-xs text-slate-400">(you)</span>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {roleEditId === user.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="crm-input"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as TUser["role"])}
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="user">User</option>
                          </select>
                          <Button
                            variant="default"
                            onClick={() => onAssignRole(user.id)}
                            disabled={assignRole.isPending}
                          >
                            {assignRole.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button variant="secondary" onClick={() => setRoleEditId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role as TUser["role"]] ?? "bg-slate-100 text-slate-700"}`}>
                          {user.role}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {user.id === currentUserId ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : deleteConfirmId === user.id ? (
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            onClick={() => onDelete(user.id)}
                            disabled={deleteUser.isPending}
                          >
                            {deleteUser.isPending ? "Deleting..." : "Confirm"}
                          </Button>
                          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setRoleEditId(user.id);
                              setSelectedRole(user.role as TUser["role"]);
                            }}
                          >
                            Change Role
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => setDeleteConfirmId(user.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(data?.items ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-slate-400">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </Card>
    </section>
  );
}

