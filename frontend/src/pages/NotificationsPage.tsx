import { useState } from "react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationsStream,
  useUnreadNotifications,
} from "../api/notifications.api";

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  useNotificationsStream();
  const notifications = useNotifications({ page: 1, limit: 25, unreadOnly });
  const unread = useUnreadNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Stay updated with your team activity</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(unread.data ?? 0) > 0 && (
            <span className="badge badge-indigo">{unread.data} unread</span>
          )}
          <button className="btn btn-secondary" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            {markAllRead.isPending ? "Updating..." : "Mark all read"}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="panel">
        <div className="toolbar">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: "#6366f1" }}
            />
            Show unread only
          </label>
          <span style={{ marginLeft: "auto", fontSize: 13, color: "#9ca3af" }}>
            {notifications.data?.total ?? 0} total
          </span>
        </div>

        {notifications.isLoading && (
          <div className="empty-state"><div className="empty-state-icon">⏳</div><p className="empty-state-text">Loading notifications...</p></div>
        )}
        {notifications.isError && (
          <div className="empty-state"><div className="empty-state-icon">⚠️</div><p className="empty-state-text">Failed to load notifications</p></div>
        )}

        {!notifications.isLoading && !notifications.isError && (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 8 }}></th>
                <th>Type</th>
                <th>Title</th>
                <th>Message</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(notifications.data?.items ?? []).map((n) => (
                <tr key={n.id} style={{ background: n.isRead ? undefined : "#fafbff" }}>
                  <td style={{ padding: "13px 8px 13px 16px" }}>
                    {!n.isRead && <div className="notif-dot" />}
                  </td>
                  <td>
                    <span className="badge badge-gray" style={{ fontSize: 11 }}>{n.type}</span>
                  </td>
                  <td style={{ fontWeight: n.isRead ? 400 : 600, color: "#1a1f36" }}>{n.title}</td>
                  <td style={{ color: "#6b7280", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.message}</td>
                  <td>
                    <span className={n.isRead ? "badge badge-gray" : "badge badge-indigo"}>
                      {n.isRead ? "Read" : "Unread"}
                    </span>
                  </td>
                  <td style={{ color: "#9ca3af", fontSize: 12.5, whiteSpace: "nowrap" }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </td>
                  <td>
                    {!n.isRead && (
                      <button className="btn btn-ghost btn-sm" onClick={() => markRead.mutate(n.id)} disabled={markRead.isPending}>
                        Mark read
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(notifications.data?.items ?? []).length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🔔</div>
                    <p className="empty-state-text">No notifications</p>
                    <p className="empty-state-sub">You're all caught up!</p>
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
