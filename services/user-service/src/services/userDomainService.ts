import { RoleRepository } from "../repositories/roleRepository";
import { UserRepository, type UserRow } from "../repositories/userRepository";
import type { DbPool } from "../db/pool";
import { ForbiddenError, NotFoundError } from "../utils/errors";
import type { AuthContext } from "../models/authContext";

export class UserDomainService {
  private readonly roles: RoleRepository;
  private readonly users: UserRepository;

  constructor(private readonly pool: DbPool) {
    this.roles = new RoleRepository(this.pool);
    this.users = new UserRepository(this.pool);
  }

  async bootstrap(input: {
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    roleName: "admin" | "manager" | "user";
  }) {
    const role = await this.roles.findByName(input.roleName);
    if (!role) {
      throw new Error("Role not found");
    }
    await this.users.bootstrapUser({
      id: input.id,
      tenantId: input.tenantId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      roleId: role.id,
    });
  }

  async getClaimsForUserId(userId: string) {
    const row = await this.users.findActiveByIdAnyTenant(userId);
    if (!row) {
      return { role: "user" as const };
    }
    return { role: row.role_name as "admin" | "manager" | "user" };
  }

  async listUsers(tenantId: string, page: number, pageSize: number) {
    return this.users.listByTenant(tenantId, page, pageSize);
  }

  async getUser(tenantId: string, id: string, actor: AuthContext) {
    const row = await this.users.findActiveById(tenantId, id);
    if (!row) {
      throw new NotFoundError("User not found");
    }
    if (actor.role === "user" && actor.userId !== id) {
      throw new ForbiddenError("Cannot view other users");
    }
    return this.toDto(row);
  }

  async updateUser(
    tenantId: string,
    id: string,
    patch: { firstName?: string; lastName?: string; email?: string },
    actor: AuthContext
  ) {
    if (actor.role === "user" && actor.userId !== id) {
      throw new ForbiddenError("Cannot update other users");
    }
    const updated = await this.users.updateProfile(tenantId, id, patch);
    if (!updated) {
      throw new NotFoundError("User not found");
    }
    return this.toDto(updated);
  }

  async assignRole(tenantId: string, id: string, roleName: string, actor: AuthContext) {
    if (actor.role !== "admin") {
      throw new ForbiddenError("Only admins can assign roles");
    }
    if (actor.userId === id) {
      throw new ForbiddenError("Cannot change your own role here");
    }
    const role = await this.roles.findByName(roleName);
    if (!role) {
      throw new NotFoundError("Role not found");
    }
    const updated = await this.users.assignRole(tenantId, id, role.id);
    if (!updated) {
      throw new NotFoundError("User not found");
    }
    return this.toDto(updated);
  }

  async deleteUser(tenantId: string, id: string, actor: AuthContext) {
    if (actor.role !== "admin") {
      throw new ForbiddenError("Only admins can delete users");
    }
    if (actor.userId === id) {
      throw new ForbiddenError("Cannot delete yourself");
    }
    const ok = await this.users.softDelete(tenantId, id);
    if (!ok) {
      throw new NotFoundError("User not found");
    }
  }

  private toDto(row: UserRow) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
