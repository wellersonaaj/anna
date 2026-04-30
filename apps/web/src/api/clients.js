import { request } from "./client";
export const searchClients = async (brechoId, search, options) => {
    const params = new URLSearchParams();
    if (search?.trim()) {
        params.set("search", search.trim());
    }
    if (options?.limit) {
        params.set("limit", String(options.limit));
    }
    const qs = params.toString();
    return request(`/clients${qs ? `?${qs}` : ""}`, { brechoId });
};
export const createClient = async (brechoId, payload) => {
    return request("/clients", {
        method: "POST",
        brechoId,
        body: payload
    });
};
export const getClientById = async (brechoId, clientId) => {
    return request(`/clients/${clientId}`, { brechoId });
};
