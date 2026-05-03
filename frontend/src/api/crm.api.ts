import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import type { TApiSuccess, TPaged, TTask } from "../types/api";

type TTaskQuery = {
  page: number;
  limit: number;
  status?: TTask["status"];
  priority?: TTask["priority"];
};

type TCreateTaskInput = {
  title: string;
  description?: string;
  status?: TTask["status"];
  priority?: TTask["priority"];
  dueAt?: string | null;
};

export function useTasks(params: TTaskQuery) {
  const tenantId = useAuthStore((state) => state.tenantId);
  return useQuery({
    queryKey: ["tasks", tenantId, params],
    queryFn: async () => {
      const response = await api.get<TApiSuccess<TPaged<TTask>>>("/crm/tasks", { params });
      return response.data.data;
    },
    enabled: Boolean(tenantId),
  });
}

export function useCreateTask() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TCreateTaskInput) => {
      const response = await api.post<TApiSuccess<TTask>>("/crm/tasks", payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", tenantId] });
    },
  });
}
