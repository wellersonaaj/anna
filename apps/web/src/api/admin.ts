import { request } from "./client";
import type { SessionBrecho } from "../store/session.store";

export type AdminBrecho = SessionBrecho & {
  criadoEm: string;
  atualizadoEm: string;
  resumo?: {
    pecas: number;
    clientes: number;
    usuarios?: number;
    vendasPendentes: number;
    ultimoCadastroEm?: string | null;
  };
  memberships?: Array<{
    id: string;
    role: "DONO" | "OPERADOR";
    ativo: boolean;
    user: {
      id: string;
      telefone: string;
      nome: string | null;
      email: string | null;
      ativo: boolean;
      isFounder: boolean;
      criadoEm: string;
    };
  }>;
};

export type BrechoPayload = {
  nome: string;
  slug?: string;
  telefone: string;
  email?: string;
  avatarUrl?: string;
  plano: "BASICO" | "MEDIO" | "PRO" | "TRIAL";
  status: "ATIVO" | "TRIAL" | "SUSPENSO";
  trialExpiraEm?: string;
};

export const listAdminBrechos = (query: { search?: string; status?: string } = {}) => {
  const params = new URLSearchParams();
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  const qs = params.toString();
  return request<AdminBrecho[]>(`/admin/brechos${qs ? `?${qs}` : ""}`, {});
};

export const getAdminBrecho = (brechoId: string) => request<AdminBrecho>(`/admin/brechos/${brechoId}`, {});

export const createAdminBrecho = (payload: BrechoPayload) =>
  request<AdminBrecho>("/admin/brechos", {
    method: "POST",
    body: payload
  });

export const updateAdminBrecho = (brechoId: string, payload: Partial<BrechoPayload>) =>
  request<AdminBrecho>(`/admin/brechos/${brechoId}`, {
    method: "PATCH",
    body: payload
  });

export const createAdminBrechoUser = (
  brechoId: string,
  payload: { nome?: string; telefone: string; email?: string; password?: string }
) =>
  request<{
    user: { id: string; telefone: string; nome: string | null; email: string | null; ativo: boolean };
    temporaryPassword: string;
  }>(`/admin/brechos/${brechoId}/users`, {
    method: "POST",
    body: payload
  });

export const resetAdminUserPassword = (userId: string, password?: string) =>
  request<{ temporaryPassword: string }>(`/admin/users/${userId}/reset-password`, {
    method: "POST",
    body: { password }
  });
