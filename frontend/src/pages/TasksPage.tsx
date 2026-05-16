import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "../api/crm.api";
import type { TTask } from "../types/api";

type TEditState = { id: string; title: string; description: string; status: TTask["status"]; priority: TTask["priority"]; } | null;

const STATUS_BADGE: Record<TTask["status"], string> = {
  pending: "badge badge-yellow",
  in_progress: "badge badge-blue",
  completed: "badge badge-green",
};
const STATUS_LABEL: Record<TTask["status"], string> = {
  pending: "Pending", in_progress: "In Progress", completed: "Completed",
};
const PRIORITY_BADGE: Record<TTask["priority"], string> = {
  low: "badge badge-gray", medium: "badge badge-indigo",
  high: "badge badge-orange", urgent: "badge badge-red",
};

export function TasksPage() {
  const [status, setStatus] = useState<TTask["status"] | "">("");
  const [priority, setPriority] = useState<TTask["priority"] | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [editState, setEditState] = useState<TEditState>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const queryParams = useMemo(() => ({
    page: 1, limit: 25,
    status: status || undefined,
    priority: priority || undefined,
  }), [priority, status]);

  const { data, isLoading, isError } = useTasks(queryParams);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const taskEvents = useMemo(() =>
    (data?.items ?? []).filter((t) => Boolean(t.dueAt)).map((t) => ({
      id: t.id, title: t.title, start: t.dueAt ?? undefined, allDay: false,
    })), [data?.items]);

  async function onCreateTask() {
    if (!title.trim()) return;
    await createTask.mutateAsync({ title, description: description.trim() || undefined, priority: priority || undefined, status: status || undefined });
    setTitle(""); setDescription(""); setShowCreate(false);
  }

  async function onSaveEdit() {
    if (!editState?.title.trim()) return;
    await updateTask.mutateAsync({ id: editState.id, title: editState.title.trim(), description: editState.description.trim() || undefined, status: editState.status, priority: editState.priority });
    setEditState(null);
  }

  const total = data?.total ?? 0;
  const completed = (data?.items ?? []).filter(t => t.status === "completed").length;
  const pending = (data?.items ?? []).filter(t => t.status === "pending").length;
  const urgent = (data?.items ?? []).filter(t => t.priority === "urgent").length;

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Track and manage your team's work</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Task
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        {[
          { label: "Total", value: total, color: "#6366f1" },
          { label: "Completed", value: completed, color: "#10b981" },
          { label: "Pending", value: pending, color: "#f59e0b" },
          { label: "Urgent", value: urgent, color: "#ef4444" },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title">Create New Task</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
          </div>
          <div className="panel-body" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <input className="form-input" style={{ flex: "1 1 200px" }} placeholder="Task title *" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="form-input" style={{ flex: "2 1 280px" }} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <select className="crm-input" value={priority} onChange={(e) => setPriority(e.target.value as TTask["priority"] | "")}>
              <option value="">Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button className="btn btn-primary" onClick={onCreateTask} disabled={createTask.isPending || !title.trim()}>
              {createTask.isPending ? "Saving..." : "Add Task"}
            </button>
          </div>
        </div>
      )}

      {/* Main panel */}
      <div className="panel">
        <div className="toolbar">
          <select className="crm-input" value={status} onChange={(e) => setStatus(e.target.value as TTask["status"] | "")}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select className="crm-input" value={priority} onChange={(e) => setPriority(e.target.value as TTask["priority"] | "")}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {(["table", "calendar"] as const).map((m) => (
              <button key={m} className={`btn btn-sm ${viewMode === m ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode(m)}>
                {m === "table" ? "Table" : "Calendar"}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <div className="empty-state"><div className="empty-state-icon">⏳</div><p className="empty-state-text">Loading tasks...</p></div>}
        {isError && <div className="empty-state"><div className="empty-state-icon">⚠️</div><p className="empty-state-text">Failed to load tasks</p></div>}

        {!isLoading && !isError && viewMode === "table" && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((task) => (
                <tr key={task.id} className={editState?.id === task.id ? "inline-edit-row" : ""}>
                  {editState?.id === task.id ? (
                    <>
                      <td><input className="form-input" value={editState.title} onChange={(e) => setEditState({ ...editState, title: e.target.value })} /></td>
                      <td>
                        <select className="crm-input" value={editState.status} onChange={(e) => setEditState({ ...editState, status: e.target.value as TTask["status"] })}>
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td>
                        <select className="crm-input" value={editState.priority} onChange={(e) => setEditState({ ...editState, priority: e.target.value as TTask["priority"] })}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </td>
                      <td>—</td>
                      <td>
                        <div className="action-group">
                          <button className="btn btn-primary btn-sm" onClick={onSaveEdit} disabled={updateTask.isPending}>{updateTask.isPending ? "Saving..." : "Save"}</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditState(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 500, color: "#1a1f36" }}>{task.title}</td>
                      <td><span className={STATUS_BADGE[task.status]}>{STATUS_LABEL[task.status]}</span></td>
                      <td><span className={PRIORITY_BADGE[task.priority]}>{task.priority}</span></td>
                      <td style={{ color: "#6b7280" }}>{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "—"}</td>
                      <td>
                        {deleteConfirmId === task.id ? (
                          <div className="action-group">
                            <button className="btn btn-danger btn-sm" onClick={async () => { await deleteTask.mutateAsync(task.id); setDeleteConfirmId(null); }} disabled={deleteTask.isPending}>{deleteTask.isPending ? "..." : "Confirm"}</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className="action-group">
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditState({ id: task.id, title: task.title, description: task.description ?? "", status: task.status, priority: task.priority })}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirmId(task.id)}>Delete</button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {(data?.items ?? []).length === 0 && (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <p className="empty-state-text">No tasks yet</p>
                    <p className="empty-state-sub">Click "New Task" to get started</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        )}

        {!isLoading && !isError && viewMode === "calendar" && (
          <div style={{ padding: 20 }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              height="auto"
              events={taskEvents}
              headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
