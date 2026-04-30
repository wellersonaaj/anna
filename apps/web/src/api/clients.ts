import { request } from "./client";

export type ClientRow = {
  id: string;
  nome: string;
  whatsapp: string | null;
  instagram: string | null;
  criadoEm?: string;
};

export type ClientDetail = ClientRow & {
  vendas: Array<{
    id: string;
    precoVenda: string | number;
    ganhosTotal: string | number;
    criadoEm: string;
    peca: {
      id: string;
      nome: string;
    };
  }>;
};

export type ClientContactPayload = {
  nome: string;
  whatsapp?: string;
  instagram?: string;
};

export const searchClients = async (
  brechoId: string,
  search?: string,
  options?: { limit?: number }
): Promise<ClientRow[]> => {
  const params = new URLSearchParams();
  if (search?.trim()) {
    params.set("search", search.trim());
  }
  if (options?.limit) {
    params.set("limit", String(options.limit));
  }

  const qs = params.toString();
  return request<ClientRow[]>(`/clients${qs ? `?${qs}` : ""}`, { brechoId });
};

export const createClient = async (brechoId: string, payload: ClientContactPayload): Promise<ClientRow> => {
  return request<ClientRow>("/clients", {
    method: "POST",
    brechoId,
    body: payload
  });
};

export const getClientById = async (brechoId: string, clientId: string): Promise<ClientDetail> => {
  return request<ClientDetail>(`/clients/${clientId}`, { brechoId });
};
