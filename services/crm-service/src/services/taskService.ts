import type { DbPool } from "../db/pool";
import type { AuthContext } from "../models/authContext";
import { TasksRepository, type TaskRow } from "../repositories/tasksRepository";
import { AppError, ForbiddenError, NotFoundError } from "../utils/errors";

const ALLOWED_STATUSES = new Set(["pending", "in_progress", "completed"]);
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

type CreateTaskInput = {
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueAt?: string | null;
  assignedToUserId?: string | null;
};

type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueAt?: string | null;
  assignedToUserId?: string | null;
};

export class TaskService {
  private readonly tasks: TasksRepository;

  constructor(private readonly pool: DbPool) {
    this.tasks = new TasksRepository(this.pool);
  }

  async create(auth: AuthContext, input: CreateTaskInput) {
    const status = input.status ?? "pending";
    const priority = input.priority ?? "medium";
    this.ensureStatus(status);
    this.ensurePriority(priority);

    const row = await this.tasks.create({
      tenantId: auth.tenantId,
      title: input.title.trim(),
      description: input.description ?? null,
      status,
      priority,
      dueAt: this.parseDueAt(input.dueAt),
      assignedToUserId: input.assignedToUserId ?? null,
      createdByUserId: auth.userId,
    });

    return this.toDto(row);
  }

  async list(
    auth: AuthContext,
    page: number,
    pageSize: number,
    filters: { status?: string; priority?: string }
  ) {
    if (filters.status) {
      this.ensureStatus(filters.status);
    }
    if (filters.priority) {
      this.ensurePriority(filters.priority);
    }

    const userScope = auth.role === "user" ? auth.userId : null;
    const result = await this.tasks.list({
      tenantId: auth.tenantId,
      page,
      pageSize,
      userIdScope: userScope,
      status: filters.status ?? null,
      priority: filters.priority ?? null,
    });

    return {
      items: result.rows.map((row) => this.toDto(row)),
      page,
      limit: pageSize,
      total: result.total,
    };
  }

  async getById(auth: AuthContext, id: string) {
    const row = await this.tasks.findById(auth.tenantId, id);
    if (!row) {
      throw new NotFoundError("Task not found");
    }
    if (!this.canAccess(auth, row)) {
      throw new ForbiddenError("Cannot access this task");
    }
    return this.toDto(row);
  }

  async update(auth: AuthContext, id: string, patch: UpdateTaskInput) {
    const row = await this.tasks.findById(auth.tenantId, id);
    if (!row) {
      throw new NotFoundError("Task not found");
    }
    if (!this.canAccess(auth, row)) {
      throw new ForbiddenError("Cannot update this task");
    }

    const nextStatus = patch.status ?? row.status;
    const nextPriority = patch.priority ?? row.priority;
    this.ensureStatus(nextStatus);
    this.ensurePriority(nextPriority);

    if (
      auth.role === "user" &&
      patch.assignedToUserId !== undefined &&
      patch.assignedToUserId !== row.assigned_to_user_id
    ) {
      throw new ForbiddenError("Cannot reassign tasks");
    }

    const updated = await this.tasks.updateMerged(auth.tenantId, id, {
      title: patch.title !== undefined ? patch.title.trim() : row.title,
      description: patch.description === undefined ? row.description : patch.description,
      status: nextStatus,
      priority: nextPriority,
      dueAt: patch.dueAt === undefined ? row.due_at : this.parseDueAt(patch.dueAt),
      assignedToUserId:
        patch.assignedToUserId === undefined ? row.assigned_to_user_id : patch.assignedToUserId,
    });

    if (!updated) {
      throw new NotFoundError("Task not found");
    }

    return this.toDto(updated);
  }

  async remove(auth: AuthContext, id: string) {
    const row = await this.tasks.findById(auth.tenantId, id);
    if (!row) {
      throw new NotFoundError("Task not found");
    }
    if (!this.canAccess(auth, row)) {
      throw new ForbiddenError("Cannot delete this task");
    }
    if (auth.role === "user" && row.created_by_user_id !== auth.userId) {
      throw new ForbiddenError("Only creator can delete this task");
    }

    const ok = await this.tasks.softDelete(auth.tenantId, id);
    if (!ok) {
      throw new NotFoundError("Task not found");
    }
  }

  private ensureStatus(status: string) {
    if (!ALLOWED_STATUSES.has(status)) {
      throw new AppError("VALIDATION_ERROR", "Invalid task status", 422);
    }
  }

  private ensurePriority(priority: string) {
    if (!ALLOWED_PRIORITIES.has(priority)) {
      throw new AppError("VALIDATION_ERROR", "Invalid task priority", 422);
    }
  }

  private parseDueAt(value?: string | null): Date | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError("VALIDATION_ERROR", "Invalid dueAt datetime", 422);
    }
    return parsed;
  }

  private canAccess(auth: AuthContext, row: TaskRow) {
    if (auth.role === "admin" || auth.role === "manager") {
      return true;
    }
    return row.created_by_user_id === auth.userId || row.assigned_to_user_id === auth.userId;
  }

  private toDto(row: TaskRow) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      dueAt: row.due_at,
      assignedToUserId: row.assigned_to_user_id,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
