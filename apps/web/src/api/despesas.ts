import { request } from "./client";

export type DespesaCategoria = "MARKETING" | "PLATAFORMAS" | "EMBALAGEM" | "OUTROS";

export type BrechoDespesa = {
  id: string;
  categoria: DespesaCategoria;
  valor: string | number;
  descricao: string | null;
  dataCompetencia: string;
  criadoEm: string;
};

export const DESPESA_CATEGORIA_LABELS: Record<DespesaCategoria, string> = {
  MARKETING: "Marketing",
  PLATAFORMAS: "Plataformas",
  EMBALAGEM: "Embalagem",
  OUTROS: "Outros"
};

export const listDespesas = async (brechoId: string, query?: { days?: number }): Promise<BrechoDespesa[]> => {
  const params = new URLSearchParams();
  params.set("days", String(query?.days ?? 30));
  return request<BrechoDespesa[]>(`/despesas?${params.toString()}`, { brechoId });
};

export const createDespesa = async (
  brechoId: string,
  payload: {
    categoria: DespesaCategoria;
    valor: number;
    descricao?: string;
    dataCompetencia: string;
  }
): Promise<BrechoDespesa> => {
  return request<BrechoDespesa>("/despesas", {
    method: "POST",
    brechoId,
    body: payload
  });
};

export const updateDespesa = async (
  brechoId: string,
  despesaId: string,
  payload: Partial<{
    categoria: DespesaCategoria;
    valor: number;
    descricao: string | null;
    dataCompetencia: string;
  }>
): Promise<BrechoDespesa> => {
  return request<BrechoDespesa>(`/despesas/${despesaId}`, {
    method: "PATCH",
    brechoId,
    body: payload
  });
};

export const deleteDespesa = async (brechoId: string, despesaId: string): Promise<void> => {
  await request(`/despesas/${despesaId}`, {
    method: "DELETE",
    brechoId
  });
};
