import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import type { TApiSuccess, TPaged, TNotification } from "../types/api";

type TNotificationQuery = {
  page: number;
  limit: number;
  unreadOnly?: boolean;
};

type TUnreadCount = {
  unread: number;
};

export function useNotifications(params: TNotificationQuery) {
  const tenantId = useAuthStore((state) => state.tenantId);
  return useQuery({
    queryKey: ["notifications", tenantId, params],
    queryFn: async () => {
      const response = await api.get<TApiSuccess<TPaged<TNotification>>>("/notifications", {
        params: {
          page: params.page,
          limit: params.limit,
          unreadOnly: params.unreadOnly ? "true" : "false",
        },
      });
      return response.data.data;
    },
    enabled: Boolean(tenantId),
    refetchInterval: 30_000,
  });
}

export function useUnreadNotifications() {
  const tenantId = useAuthStore((state) => state.tenantId);
  return useQuery({
    queryKey: ["notifications", "unread", tenantId],
    queryFn: async () => {
      const response = await api.get<TApiSuccess<TUnreadCount>>("/notifications/unread");
      return response.data.data.unread;
    },
    enabled: Boolean(tenantId),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications", tenantId] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "unread", tenantId] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications", tenantId] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "unread", tenantId] });
    },
  });
}

export function useNotificationsStream() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      return;
    }
    const controller = new AbortController();

    let reconnectDelayMs = 1_000;
    const maxDelayMs = 30_000;

    const connect = async () => {
      while (!controller.signal.aborted) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1"}/notifications/stream`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "text/event-stream",
              },
              credentials: "include",
              signal: controller.signal,
            }
          );

          if (!response.body) {
            throw new Error("SSE stream unavailable");
          }

          reconnectDelayMs = 1_000;
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!controller.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() ?? "";
            for (const chunk of chunks) {
              if (chunk.includes("event: notification")) {
                await queryClient.invalidateQueries({ queryKey: ["notifications"] });
              }
            }
          }
        } catch {
          // Polling remains active as fallback.
        }

        if (controller.signal.aborted) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, reconnectDelayMs));
        reconnectDelayMs = Math.min(maxDelayMs, reconnectDelayMs * 2);
      }
    };

    void connect();
    return () => {
      controller.abort();
    };
  }, [queryClient, token]);
}
