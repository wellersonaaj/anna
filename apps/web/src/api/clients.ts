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
    precoCusto?: string | number | null;
    freteIncluso?: boolean;
    freteInclusoValor?: string | number | null;
    ganhosTotal: string | number;
    criadoEm: string;
    entrega?: { entregueEm: string } | null;
    peca: {
      id: string;
      nome: string;
      codigo?: string | null;
    };
  }>;
  sacolas?: Array<{
    id: string;
    vendas: Array<{
      id: string;
      precoVenda?: string | number;
      freteIncluso?: boolean;
      peca: { id: string; nome: string; codigo?: string | null };
    }>;
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

export const updateClient = async (
  brechoId: string,
  clientId: string,
  payload: Partial<ClientContactPayload>
): Promise<ClientRow> => {
  return request<ClientRow>(`/clients/${clientId}`, {
    method: "PATCH",
    brechoId,
    body: payload
  });
};
