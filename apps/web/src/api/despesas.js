import { request } from "./client";
export const DESPESA_CATEGORIA_LABELS = {
    MARKETING: "Marketing",
    PLATAFORMAS: "Plataformas",
    EMBALAGEM: "Embalagem",
    OUTROS: "Outros"
};
export const listDespesas = async (brechoId, query) => {
    const params = new URLSearchParams();
    params.set("days", String(query?.days ?? 30));
    return request(`/despesas?${params.toString()}`, { brechoId });
};
export const createDespesa = async (brechoId, payload) => {
    return request("/despesas", {
        method: "POST",
        brechoId,
        body: payload
    });
};
export const updateDespesa = async (brechoId, despesaId, payload) => {
    return request(`/despesas/${despesaId}`, {
        method: "PATCH",
        brechoId,
        body: payload
    });
};
export const deleteDespesa = async (brechoId, despesaId) => {
    await request(`/despesas/${despesaId}`, {
        method: "DELETE",
        brechoId
    });
};
