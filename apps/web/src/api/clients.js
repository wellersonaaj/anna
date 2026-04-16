import { request } from "./client";
export const searchClients = async (brechoId, search) => {
    const params = new URLSearchParams();
    if (search?.trim()) {
        params.set("search", search.trim());
    }
    const qs = params.toString();
    return request(`/clients${qs ? `?${qs}` : ""}`, { brechoId });
};
