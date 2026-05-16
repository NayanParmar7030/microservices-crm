import { useState } from "react";
import { useCreateLead, useDeleteLead, useLeads, useUpdateLead } from "../api/leads.api";
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
import type { TLead } from "../types/api";

const STATUS_LABELS: Record<TLead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

const STATUS_COLORS: Record<TLead["status"], string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-purple-100 text-purple-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

type TEditState = {
  id: string;
  title: string;
  description: string;
  status: TLead["status"];
} | null;

export function LeadsPage() {
  const [page] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TLead["status"]>("new");
  const [editState, setEditState] = useState<TEditState>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useLeads({ page, limit: 25 });
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  async function onCreateLead() {
    if (!title.trim()) return;
    await createLead.mutateAsync({
      title: title.trim(),
      description: description.trim() || null,
      status,
    });
    setTitle("");
    setDescription("");
    setStatus("new");
  }

  async function onSaveEdit() {
    if (!editState || !editState.title.trim()) return;
    await updateLead.mutateAsync({
      id: editState.id,
      title: editState.title.trim(),
      description: editState.description.trim() || null,
      status: editState.status,
    });
    setEditState(null);
  }

  async function onDelete(id: string) {
    await deleteLead.mutateAsync(id);
    setDeleteConfirmId(null);
  }

  return (
    <section className="grid gap-4">
      {/* Header */}
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">Leads</h2>
        <p className="text-sm text-slate-500">Manage your sales pipeline leads.</p>
      </Card>

      {/* Create lead */}
      <Card>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Add Lead</h3>
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-48"
            placeholder="Lead title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            className="min-w-64"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <select
            className="crm-input"
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TLead["status"])}
          >
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <Button onClick={onCreateLead} disabled={createLead.isPending || !title.trim()}>
            {createLead.isPending ? "Saving..." : "Add Lead"}
          </Button>
        </div>
        {createLead.isError && (
          <p className="mt-2 text-sm text-red-600">{(createLead.error as Error).message}</p>
        )}
      </Card>

      {/* Leads table */}
      <Card>
        {isLoading && <p className="text-sm text-slate-500">Loading leads...</p>}
        {isError && <p className="text-sm text-red-600">Failed to load leads: {(error as Error).message}</p>}
        {!isLoading && !isError && (
          <>
            <p className="mb-2 text-sm text-slate-500">Total: {data?.total ?? 0}</p>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.items ?? []).map((lead) => (
                  <TableRow key={lead.id}>
                    {editState?.id === lead.id ? (
                      <>
                        <TableCell>
                          <Input
                            value={editState.title}
                            onChange={(e) => setEditState({ ...editState, title: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editState.description}
                            onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            className="crm-input"
                            value={editState.status}
                            onChange={(e) => setEditState({ ...editState, status: e.target.value as TLead["status"] })}
                          >
                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="default" onClick={onSaveEdit} disabled={updateLead.isPending}>
                              {updateLead.isPending ? "Saving..." : "Save"}
                            </Button>
                            <Button variant="secondary" onClick={() => setEditState(null)}>
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium text-slate-900">{lead.title}</TableCell>
                        <TableCell>{lead.description ?? "—"}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                            {STATUS_LABELS[lead.status]}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {deleteConfirmId === lead.id ? (
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                onClick={() => onDelete(lead.id)}
                                disabled={deleteLead.isPending}
                              >
                                {deleteLead.isPending ? "Deleting..." : "Confirm"}
                              </Button>
                              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setEditState({
                                    id: lead.id,
                                    title: lead.title,
                                    description: lead.description ?? "",
                                    status: lead.status,
                                  })
                                }
                              >
                                Edit
                              </Button>
                              <Button variant="destructive" onClick={() => setDeleteConfirmId(lead.id)}>
                                Delete
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
                {(data?.items ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-slate-400">
                      No leads yet. Add your first lead above.
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
