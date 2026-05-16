import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import type { TApiSuccess, TPaged, TUser } from "../types/api";

type TUpdateUserInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export function useUsers(params: { page: number; limit: number }) {
  const tenantId = useAuthStore((state) => state.tenantId);
  return useQuery({
    queryKey: ["users", tenantId, params],
    queryFn: async () => {
      const response = await api.get<TApiSuccess<TPaged<TUser>>>("/users", { params });
      return response.data.data;
    },
    enabled: Boolean(tenantId),
  });
}

export function useUpdateUser() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: TUpdateUserInput & { id: string }) => {
      const response = await api.patch<TApiSuccess<TUser>>(`/users/${id}`, payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", tenantId] });
    },
  });
}

export function useAssignRole() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: TUser["role"] }) => {
      const response = await api.patch<TApiSuccess<TUser>>(`/users/${id}/role`, { role });
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", tenantId] });
    },
  });
}

export function useDeleteUser() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", tenantId] });
    },
  });
}
