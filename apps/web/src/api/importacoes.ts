import { request } from "./client";
import { putToPresignedUrl } from "./items";

export type ImportacaoLoteListItem = {
  id: string;
  status: string;
  totalFotos: number;
  totalGrupos: number;
  criadoEm: string;
  atualizadoEm: string;
};

export type ImportacaoFotoDto = {
  id: string;
  ordemOriginal: number;
  url: string;
  mime: string;
  statusUpload: string;
  ignorada: boolean;
  nomeArquivo: string | null;
};

export type ImportacaoGrupoDto = {
  id: string;
  ordem: number;
  status: string;
  confiancaAgrupamento: number | null;
  motivoRevisao: string | null;
  ordemInicio: number;
  ordemFim: number;
  temFotosNaoContiguas: boolean;
  fotos: Array<{ id: string; ordemNoGrupo: number; ordemOriginal: number; url: string; mime: string }>;
  rascunho: {
    id: string;
    status: string;
    draftAnalysisId: string | null;
    pecaId: string | null;
    formValues: unknown;
  } | null;
};

export type ImportacaoLoteDetail = {
  lote: ImportacaoLoteListItem;
  fotos: ImportacaoFotoDto[];
  grupos: ImportacaoGrupoDto[];
};

export const createImportacaoLote = async (brechoId: string): Promise<ImportacaoLoteListItem> => {
  return request<ImportacaoLoteListItem>("/importacoes", { method: "POST", brechoId });
};

export const cancelarImportacaoLote = async (
  brechoId: string,
  loteId: string
): Promise<ImportacaoLoteListItem> => {
  return request<ImportacaoLoteListItem>(`/importacoes/${loteId}/cancelar`, { method: "POST", brechoId });
};

export const listImportacaoLotes = async (brechoId: string): Promise<ImportacaoLoteListItem[]> => {
  return request<ImportacaoLoteListItem[]>("/importacoes", { brechoId });
};

export const countImportacoesPendentes = async (brechoId: string): Promise<{ count: number }> => {
  return request<{ count: number }>("/importacoes/pendentes/count", { brechoId });
};

export const getImportacaoLote = async (brechoId: string, loteId: string): Promise<ImportacaoLoteDetail> => {
  return request<ImportacaoLoteDetail>(`/importacoes/${loteId}`, { brechoId });
};

export const presignImportFoto = async (
  brechoId: string,
  loteId: string,
  body: { contentType: string; extensao: string; ordemOriginal: number; tamanhoBytes?: number }
): Promise<{ uploadUrl: string; publicUrl: string }> => {
  return request<{ uploadUrl: string; publicUrl: string }>(`/importacoes/${loteId}/fotos/presign`, {
    method: "POST",
    brechoId,
    body
  });
};

export const registerImportFoto = async (
  brechoId: string,
  loteId: string,
  body: {
    ordemOriginal: number;
    url: string;
    mime: string;
    tamanhoBytes?: number;
    nomeArquivo?: string;
    source?: string;
  }
): Promise<{ id: string }> => {
  return request(`/importacoes/${loteId}/fotos`, { method: "POST", brechoId, body });
};

export const agruparImportacaoLote = async (brechoId: string, loteId: string): Promise<ImportacaoLoteDetail> => {
  return request<ImportacaoLoteDetail>(`/importacoes/${loteId}/agrupar`, { method: "POST", brechoId });
};

export const patchImportacaoGrupos = async (
  brechoId: string,
  loteId: string,
  body: { grupos: Array<{ fotoIds: string[] }> }
): Promise<ImportacaoLoteDetail> => {
  return request<ImportacaoLoteDetail>(`/importacoes/${loteId}/grupos`, { method: "PATCH", brechoId, body });
};

export const confirmarImportacaoGrupos = async (brechoId: string, loteId: string): Promise<ImportacaoLoteDetail> => {
  return request<ImportacaoLoteDetail>(`/importacoes/${loteId}/grupos/confirmar`, { method: "POST", brechoId });
};

export const classificarImportacaoLote = async (
  brechoId: string,
  loteId: string
): Promise<{ ok: number; fail: number; detail: ImportacaoLoteDetail }> => {
  return request(`/importacoes/${loteId}/classificar`, { method: "POST", brechoId });
};

export const patchImportacaoRascunho = async (
  brechoId: string,
  loteId: string,
  rascunhoId: string,
  body: { formValues: Record<string, unknown> }
): Promise<{ id: string }> => {
  return request(`/importacoes/${loteId}/rascunhos/${rascunhoId}`, { method: "PATCH", brechoId, body });
};

export const publicarImportacaoRascunho = async (
  brechoId: string,
  loteId: string,
  rascunhoId: string,
  body?: { helpfulness?: "SIM" | "PARCIAL" | "NAO"; reasonCodes?: string[] }
): Promise<{ itemId: string }> => {
  return request(`/importacoes/${loteId}/rascunhos/${rascunhoId}/publicar`, { method: "POST", brechoId, body: body ?? {} });
};

export { putToPresignedUrl };
