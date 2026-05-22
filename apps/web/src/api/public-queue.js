import { request } from "./client";
export const getPublicQueueInfo = async (token) => {
    return request(`/public/queue/${token}`, { auth: false });
};
export const joinPublicQueue = async (token, cliente) => {
    return request(`/public/queue/${token}/join`, {
        method: "POST",
        auth: false,
        body: { cliente }
    });
};
export const createFilaLink = async (brechoId, itemId) => {
    return request(`/items/${itemId}/fila-link`, {
        method: "POST",
        brechoId
    });
};
export const revokeFilaLink = async (brechoId, itemId) => {
    return request(`/items/${itemId}/fila-link`, { method: "DELETE", brechoId });
};
