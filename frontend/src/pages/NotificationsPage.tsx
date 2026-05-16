import { useState } from "react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationsStream,
  useUnreadNotifications,
} from "../api/notifications.api";
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

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  useNotificationsStream();
  const notifications = useNotifications({ page: 1, limit: 25, unreadOnly });
  const unread = useUnreadNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  return (
    <section className="grid gap-4">
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">Notifications</h2>
        <p className="text-sm text-slate-500">
          SSE stream with polling fallback enabled. Unread count: {unread.data ?? 0}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            unread only
          </label>
          <Button type="button" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            {markAllRead.isPending ? "Updating..." : "Mark all as read"}
          </Button>
        </div>
      </Card>

      <Card>
        {notifications.isLoading && <p>Loading notifications...</p>}
        {notifications.isError && (
          <p className="text-sm text-red-600">
            Failed to load notifications: {(notifications.error as Error).message}
          </p>
        )}
        {!notifications.isLoading && !notifications.isError && (
          <>
            <p className="mb-2 text-sm text-slate-500">Total: {notifications.data?.total ?? 0}</p>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell>Message</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(notifications.data?.items ?? []).map((notification) => (
                  <TableRow key={notification.id} className={notification.isRead ? "" : "bg-indigo-50"}>
                    <TableCell>{notification.type}</TableCell>
                    <TableCell className="font-medium text-slate-900">{notification.title}</TableCell>
                    <TableCell>{notification.message}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${notification.isRead ? "bg-slate-100 text-slate-500" : "bg-indigo-100 text-indigo-700"}`}>
                        {notification.isRead ? "Read" : "Unread"}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(notification.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          onClick={() => markRead.mutate(notification.id)}
                          disabled={markRead.isPending}
                        >
                          Mark read
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(notifications.data?.items ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-slate-400">
                      No notifications yet.
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
