import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useCreateTask, useTasks } from "../api/crm.api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../components/ui/Table";
import type { TTask } from "../types/api";

export function TasksPage() {
  const [status, setStatus] = useState<TTask["status"] | "">("");
  const [priority, setPriority] = useState<TTask["priority"] | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 25,
      status: status || undefined,
      priority: priority || undefined,
    }),
    [priority, status]
  );

  const { data, isLoading, isError, error } = useTasks(queryParams);
  const createTask = useCreateTask();
  const taskEvents = useMemo(
    () =>
      (data?.items ?? [])
        .filter((task) => Boolean(task.dueAt))
        .map((task) => ({
          id: task.id,
          title: task.title,
          start: task.dueAt ?? undefined,
          allDay: false,
        })),
    [data?.items]
  );

  async function onCreateTask() {
    if (!title.trim()) {
      return;
    }
    await createTask.mutateAsync({
      title,
      description: description.trim() || undefined,
      priority: priority || undefined,
      status: status || undefined,
    });
    setTitle("");
    setDescription("");
  }

  return (
    <section className="grid gap-4">
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">Tasks</h2>
        <p className="text-sm text-slate-500">Server-driven task list from CRM service.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            className="crm-input"
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value as TTask["status"] | "")}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            className="crm-input"
            aria-label="Filter by priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as TTask["priority"] | "")}
          >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <select
            className="crm-input"
            aria-label="Select list mode"
            value={viewMode}
            onChange={(event) => setViewMode(event.target.value as "table" | "calendar")}
          >
            <option value="table">Table</option>
            <option value="calendar">Calendar</option>
          </select>
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-slate-900">Create task</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            className="min-w-48"
            aria-label="Task title"
            placeholder="Task title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Input
            className="min-w-64"
            aria-label="Task description"
            placeholder="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Button type="button" onClick={onCreateTask} disabled={createTask.isPending}>
            {createTask.isPending ? "Saving..." : "Add task"}
          </Button>
        </div>
      </Card>

      <Card>
        {isLoading && <p className="text-sm text-slate-500">Loading tasks...</p>}
        {isError && <p className="text-sm text-red-600">Failed to load tasks: {(error as Error).message}</p>}
        {!isLoading && !isError && viewMode === "table" && (
          <>
            <p className="mb-2 text-sm text-slate-500">Total: {data?.total ?? 0}</p>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Priority</TableHeaderCell>
                  <TableHeaderCell>Due</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.items ?? []).map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.title}</TableCell>
                    <TableCell>{task.status}</TableCell>
                    <TableCell>{task.priority}</TableCell>
                    <TableCell>{task.dueAt ? new Date(task.dueAt).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        {!isLoading && !isError && viewMode === "calendar" && (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            height="auto"
            events={taskEvents}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
          />
        )}
      </Card>
    </section>
  );
}
