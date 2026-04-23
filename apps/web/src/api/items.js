import { request } from "./client";
export const listItems = async (brechoId, filters) => {
    const params = new URLSearchParams();
    if (filters?.status) {
        params.set("status", filters.status);
    }
    if (filters?.categoria) {
        params.set("categoria", filters.categoria);
    }
    if (filters?.search?.trim()) {
        params.set("search", filters.search.trim());
    }
    const qs = params.toString();
    return request(`/items${qs ? `?${qs}` : ""}`, { brechoId });
};
export const getItem = async (brechoId, itemId) => {
    return request(`/items/${itemId}`, { brechoId });
};
export const addItemFoto = async (brechoId, itemId, payload) => {
    return request(`/items/${itemId}/fotos`, {
        method: "POST",
        brechoId,
        body: payload
    });
};
export const analisarItemFoto = async (brechoId, itemId, fotoId) => {
    return request(`/items/${itemId}/fotos/${fotoId}/analisar`, {
        method: "POST",
        brechoId
    });
};
export const analisarFotoRascunho = async (brechoId, payload) => {
    return request("/items/analisar-rascunho", {
        method: "POST",
        brechoId,
        body: payload
    });
};
export const createFotoLote = async (brechoId, itemId, payload) => {
    return request(`/items/${itemId}/foto-lotes`, {
        method: "POST",
        brechoId,
        body: payload
    });
};
export const patchFotoLote = async (brechoId, itemId, loteId, payload) => {
    return request(`/items/${itemId}/foto-lotes/${loteId}`, {
        method: "PATCH",
        brechoId,
        body: payload
    });
};
export const presignFotoLoteUpload = async (brechoId, itemId, loteId, payload) => {
    return request(`/items/${itemId}/foto-lotes/${loteId}/presign`, {
        method: "POST",
        brechoId,
        body: payload
    });
};
export const transcribeFotoLote = async (brechoId, itemId, loteId) => {
    return request(`/items/${itemId}/foto-lotes/${loteId}/transcribe`, {
        method: "POST",
        brechoId
    });
};
export const putToPresignedUrl = async (uploadUrl, body, contentType) => {
    const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": contentType
        },
        body
    });
    if (!response.ok) {
        throw new Error(`Upload falhou (${response.status}).`);
    }
};
export const deleteItemFoto = async (brechoId, itemId, fotoId) => {
    return request(`/items/${itemId}/fotos/${fotoId}`, {
        method: "DELETE",
        brechoId
    });
};
export const joinItemFila = async (brechoId, itemId, payload) => {
    return request(`/items/${itemId}/fila`, {
        method: "POST",
        brechoId,
        body: payload
    });
};
export const leaveItemFila = async (brechoId, itemId, entradaId) => {
    return request(`/items/${itemId}/fila/${entradaId}`, {
        method: "DELETE",
        brechoId
    });
};
export const createItem = async (brechoId, payload) => {
    return request("/items", {
        method: "POST",
        brechoId,
        body: payload
    });
};
export const listAcervoSuggestions = async (brechoId, query) => {
    const params = new URLSearchParams();
    if (query.q) {
        params.set("q", query.q);
    }
    if (query.acervoTipo) {
        params.set("acervoTipo", query.acervoTipo);
    }
    params.set("limit", String(query.limit ?? 8));
    return request(`/acervos/suggestions?${params.toString()}`, { brechoId });
};
export const reserveItem = async (brechoId, itemId, payload) => {
    return request(`/items/${itemId}/reserve`, {
        method: "POST",
        brechoId,
        body: payload
    });
};
export const sellItem = async (brechoId, itemId, payload) => {
    return request(`/items/${itemId}/sell`, {
        method: "POST",
        brechoId,
        body: payload
    });
};
export const listSalesPendingDelivery = async (brechoId) => {
    return request("/sales/pending-delivery", { brechoId });
};
export const deliverSale = async (brechoId, saleId, payload) => {
    return request(`/sales/${saleId}/deliver`, {
        method: "POST",
        brechoId,
        body: payload
    });
};
