import type { DbPool } from "../db/pool";
import { LeadsRepository, type LeadRow } from "../repositories/leadsRepository";
import type { AuthContext } from "../models/authContext";
import { AppError, ForbiddenError, NotFoundError } from "../utils/errors";

const ALLOWED_STATUSES = new Set(["new", "contacted", "qualified", "won", "lost"]);

export class LeadService {
  private readonly leads: LeadsRepository;

  constructor(private readonly pool: DbPool) {
    this.leads = new LeadsRepository(this.pool);
  }

  async create(
    auth: AuthContext,
    input: { title: string; description?: string | null; status?: string; assignedToUserId?: string | null }
  ) {
    const status = input.status ?? "new";
    if (!ALLOWED_STATUSES.has(status)) {
      throw new AppError("VALIDATION_ERROR", "Invalid lead status", 422);
    }
    const row = await this.leads.create({
      tenantId: auth.tenantId,
      title: input.title.trim(),
      description: input.description ?? null,
      status,
      assignedToUserId: input.assignedToUserId ?? null,
      createdByUserId: auth.userId,
    });
    return this.toDto(row);
  }

  async list(auth: AuthContext, page: number, pageSize: number) {
    const userScope = auth.role === "user" ? auth.userId : null;
    const result = await this.leads.list({
      tenantId: auth.tenantId,
      page,
      pageSize,
      userIdScope: userScope,
    });
    return {
      items: result.rows.map((r) => this.toDto(r)),
      page,
      limit: pageSize,
      total: result.total,
    };
  }

  async getById(auth: AuthContext, id: string) {
    const row = await this.leads.findById(auth.tenantId, id);
    if (!row) {
      throw new NotFoundError("Lead not found");
    }
    if (!this.canAccess(auth, row)) {
      throw new ForbiddenError("Cannot access this lead");
    }
    return this.toDto(row);
  }

  async update(
    auth: AuthContext,
    id: string,
    patch: { title?: string; description?: string | null; status?: string; assignedToUserId?: string | null }
  ) {
    const row = await this.leads.findById(auth.tenantId, id);
    if (!row) {
      throw new NotFoundError("Lead not found");
    }
    if (!this.canAccess(auth, row)) {
      throw new ForbiddenError("Cannot update this lead");
    }

    const nextStatus = patch.status ?? row.status;
    if (!ALLOWED_STATUSES.has(nextStatus)) {
      throw new AppError("VALIDATION_ERROR", "Invalid lead status", 422);
    }

    const next = {
      title: patch.title !== undefined ? patch.title.trim() : row.title,
      description: patch.description === undefined ? row.description : patch.description,
      status: nextStatus,
      assignedToUserId:
        patch.assignedToUserId === undefined ? row.assigned_to_user_id : patch.assignedToUserId,
    };

    if (auth.role === "user") {
      if (patch.assignedToUserId !== undefined && patch.assignedToUserId !== row.assigned_to_user_id) {
        throw new ForbiddenError("Cannot reassign leads");
      }
    }

    const updated = await this.leads.updateMerged(auth.tenantId, id, next);
    if (!updated) {
      throw new NotFoundError("Lead not found");
    }
    return this.toDto(updated);
  }

  async remove(auth: AuthContext, id: string) {
    const row = await this.leads.findById(auth.tenantId, id);
    if (!row) {
      throw new NotFoundError("Lead not found");
    }
    if (!this.canAccess(auth, row)) {
      throw new ForbiddenError("Cannot delete this lead");
    }
    if (auth.role === "user" && row.created_by_user_id !== auth.userId) {
      throw new ForbiddenError("Only the creator can delete this lead");
    }
    const ok = await this.leads.softDelete(auth.tenantId, id);
    if (!ok) {
      throw new NotFoundError("Lead not found");
    }
  }

  private canAccess(auth: AuthContext, row: LeadRow) {
    if (auth.role === "admin" || auth.role === "manager") {
      return true;
    }
    return row.created_by_user_id === auth.userId || row.assigned_to_user_id === auth.userId;
  }

  private toDto(row: LeadRow) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      description: row.description,
      status: row.status,
      assignedToUserId: row.assigned_to_user_id,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
