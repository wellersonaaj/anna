import { request } from "./client";

export type PendingSacola = {
  id: string;
  cliente: {
    id: string;
    nome: string;
    whatsapp: string | null;
    instagram: string | null;
  };
  totalPecas: number;
  vendas: Array<{
    id: string;
    precoVenda: string | number;
    precoCusto?: string | number | null;
    freteCustoLoja?: string | number | null;
    embalagemCusto?: string | number | null;
    freteIncluso: boolean;
    freteInclusoValor: string | number | null;
    ganhosTotal: string | number;
    criadoEm: string;
    peca: {
      id: string;
      nome: string;
      codigo: string | null;
      fotoCapaUrl: string | null;
      fotoCapaThumbnailUrl: string | null;
    };
  }>;
};

export const listPendingSacolas = async (brechoId: string): Promise<PendingSacola[]> => {
  return request<PendingSacola[]>("/sacolas/pending", { brechoId });
};

export const shipSacola = async (
  brechoId: string,
  sacolaId: string,
  payload: {
    vendaIds?: string[];
    codigoRastreio?: string;
    freteTexto?: string;
    freteValor?: number;
    freteCustoLoja?: number;
    embalagemCusto?: number;
  }
) => {
  return request(`/sacolas/${sacolaId}/ship`, {
    method: "POST",
    brechoId,
    body: payload
  });
};
