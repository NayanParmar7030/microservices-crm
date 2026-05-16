import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import type { TApiSuccess, TPaged, TLead } from "../types/api";

type TLeadQuery = {
  page: number;
  limit: number;
};

type TCreateLeadInput = {
  title: string;
  description?: string | null;
  status?: TLead["status"];
  assignedToUserId?: string | null;
};

type TUpdateLeadInput = Partial<TCreateLeadInput>;

export function useLeads(params: TLeadQuery) {
  const tenantId = useAuthStore((state) => state.tenantId);
  return useQuery({
    queryKey: ["leads", tenantId, params],
    queryFn: async () => {
      const response = await api.get<TApiSuccess<TPaged<TLead>>>("/crm/leads", { params });
      return response.data.data;
    },
    enabled: Boolean(tenantId),
  });
}

export function useCreateLead() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TCreateLeadInput) => {
      const response = await api.post<TApiSuccess<TLead>>("/crm/leads", payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads", tenantId] });
    },
  });
}

export function useUpdateLead() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: TUpdateLeadInput & { id: string }) => {
      const response = await api.patch<TApiSuccess<TLead>>(`/crm/leads/${id}`, payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads", tenantId] });
    },
  });
}

export function useDeleteLead() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/leads/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads", tenantId] });
    },
  });
}
