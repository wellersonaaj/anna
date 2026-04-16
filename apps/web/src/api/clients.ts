import { request } from "./client";

export type ClientRow = {
  id: string;
  nome: string;
  whatsapp: string | null;
  instagram: string | null;
  criadoEm?: string;
};

export const searchClients = async (brechoId: string, search?: string): Promise<ClientRow[]> => {
  const params = new URLSearchParams();
  if (search?.trim()) {
    params.set("search", search.trim());
  }

  const qs = params.toString();
  return request<ClientRow[]>(`/clients${qs ? `?${qs}` : ""}`, { brechoId });
};
