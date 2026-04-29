import { request } from "./client";
import { putToPresignedUrl } from "./items";
export const createImportacaoLote = async (brechoId) => {
    return request("/importacoes", { method: "POST", brechoId });
};
export const cancelarImportacaoLote = async (brechoId, loteId) => {
    return request(`/importacoes/${loteId}/cancelar`, { method: "POST", brechoId });
};
export const listImportacaoLotes = async (brechoId) => {
    return request("/importacoes", { brechoId });
};
export const countImportacoesPendentes = async (brechoId) => {
    return request("/importacoes/pendentes/count", { brechoId });
};
export const getImportacaoLote = async (brechoId, loteId) => {
    return request(`/importacoes/${loteId}`, { brechoId });
};
export const presignImportFoto = async (brechoId, loteId, body) => {
    return request(`/importacoes/${loteId}/fotos/presign`, {
        method: "POST",
        brechoId,
        body
    });
};
export const registerImportFoto = async (brechoId, loteId, body) => {
    return request(`/importacoes/${loteId}/fotos`, { method: "POST", brechoId, body });
};
export const agruparImportacaoLote = async (brechoId, loteId) => {
    return request(`/importacoes/${loteId}/agrupar`, { method: "POST", brechoId });
};
export const patchImportacaoGrupos = async (brechoId, loteId, body) => {
    return request(`/importacoes/${loteId}/grupos`, { method: "PATCH", brechoId, body });
};
export const confirmarImportacaoGrupos = async (brechoId, loteId) => {
    return request(`/importacoes/${loteId}/grupos/confirmar`, { method: "POST", brechoId });
};
export const classificarImportacaoLote = async (brechoId, loteId) => {
    return request(`/importacoes/${loteId}/classificar`, { method: "POST", brechoId });
};
export const patchImportacaoRascunho = async (brechoId, loteId, rascunhoId, body) => {
    return request(`/importacoes/${loteId}/rascunhos/${rascunhoId}`, { method: "PATCH", brechoId, body });
};
export const publicarImportacaoRascunho = async (brechoId, loteId, rascunhoId, body) => {
    return request(`/importacoes/${loteId}/rascunhos/${rascunhoId}/publicar`, { method: "POST", brechoId, body: body ?? {} });
};
export { putToPresignedUrl };
