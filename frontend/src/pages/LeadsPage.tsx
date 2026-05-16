import { useState } from "react";
import { useCreateLead, useDeleteLead, useLeads, useUpdateLead } from "../api/leads.api";
import type { TLead } from "../types/api";

const STATUS_BADGE: Record<TLead["status"], string> = {
  new: "badge badge-blue",
  contacted: "badge badge-yellow",
  qualified: "badge badge-purple",
  won: "badge badge-green",
  lost: "badge badge-red",
};
const STATUS_LABEL: Record<TLead["status"], string> = {
  new: "New", contacted: "Contacted", qualified: "Qualified", won: "Won", lost: "Lost",
};

type TEditState = { id: string; title: string; description: string; status: TLead["status"]; } | null;

export function LeadsPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TLead["status"]>("new");
  const [filterStatus, setFilterStatus] = useState<TLead["status"] | "">("");
  const [editState, setEditState] = useState<TEditState>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError } = useLeads({ page: 1, limit: 50 });
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const filtered = filterStatus
    ? (data?.items ?? []).filter((l) => l.status === filterStatus)
    : (data?.items ?? []);

  const counts = (data?.items ?? []).reduce((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  async function onCreateLead() {
    if (!title.trim()) return;
    await createLead.mutateAsync({ title: title.trim(), description: description.trim() || null, status });
    setTitle(""); setDescription(""); setStatus("new"); setShowCreate(false);
  }

  async function onSaveEdit() {
    if (!editState?.title.trim()) return;
    await updateLead.mutateAsync({ id: editState.id, title: editState.title.trim(), description: editState.description.trim() || null, status: editState.status });
    setEditState(null);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Manage your sales pipeline</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Lead
        </button>
      </div>

      {/* Pipeline stats */}
      <div className="stats-row">
        {(Object.entries(STATUS_LABEL) as [TLead["status"], string][]).map(([s, label]) => (
          <div
            key={s}
            className="stat-card"
            style={{ cursor: "pointer", outline: filterStatus === s ? "2px solid #6366f1" : "none" }}
            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
          >
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{counts[s] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title">Add New Lead</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
          </div>
          <div className="panel-body" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <input className="form-input" style={{ flex: "1 1 200px" }} placeholder="Lead title *" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="form-input" style={{ flex: "2 1 280px" }} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <select className="crm-input" value={status} onChange={(e) => setStatus(e.target.value as TLead["status"])}>
              {(Object.entries(STATUS_LABEL) as [TLead["status"], string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={onCreateLead} disabled={createLead.isPending || !title.trim()}>
              {createLead.isPending ? "Saving..." : "Add Lead"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="panel">
        <div className="toolbar">
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
            {filterStatus ? ` · ${STATUS_LABEL[filterStatus]}` : ""}
          </span>
          {filterStatus && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilterStatus("")}>Clear filter ✕</button>
          )}
        </div>

        {isLoading && <div className="empty-state"><div className="empty-state-icon">⏳</div><p className="empty-state-text">Loading leads...</p></div>}
        {isError && <div className="empty-state"><div className="empty-state-icon">⚠️</div><p className="empty-state-text">Failed to load leads</p></div>}

        {!isLoading && !isError && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className={editState?.id === lead.id ? "inline-edit-row" : ""}>
                  {editState?.id === lead.id ? (
                    <>
                      <td><input className="form-input" value={editState.title} onChange={(e) => setEditState({ ...editState, title: e.target.value })} /></td>
                      <td><input className="form-input" value={editState.description} onChange={(e) => setEditState({ ...editState, description: e.target.value })} /></td>
                      <td>
                        <select className="crm-input" value={editState.status} onChange={(e) => setEditState({ ...editState, status: e.target.value as TLead["status"] })}>
                          {(Object.entries(STATUS_LABEL) as [TLead["status"], string][]).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>
                      <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-group">
                          <button className="btn btn-primary btn-sm" onClick={onSaveEdit} disabled={updateLead.isPending}>{updateLead.isPending ? "..." : "Save"}</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditState(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 500, color: "#1a1f36" }}>{lead.title}</td>
                      <td style={{ color: "#6b7280", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.description ?? "—"}</td>
                      <td><span className={STATUS_BADGE[lead.status]}>{STATUS_LABEL[lead.status]}</span></td>
                      <td style={{ color: "#6b7280" }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                      <td>
                        {deleteConfirmId === lead.id ? (
                          <div className="action-group">
                            <button className="btn btn-danger btn-sm" onClick={async () => { await deleteLead.mutateAsync(lead.id); setDeleteConfirmId(null); }} disabled={deleteLead.isPending}>{deleteLead.isPending ? "..." : "Confirm"}</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className="action-group">
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditState({ id: lead.id, title: lead.title, description: lead.description ?? "", status: lead.status })}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirmId(lead.id)}>Delete</button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🎯</div>
                    <p className="empty-state-text">No leads found</p>
                    <p className="empty-state-sub">Click "New Lead" to add your first lead</p>
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
