import { request } from "./client";
export const listAdminBrechos = (query = {}) => {
    const params = new URLSearchParams();
    if (query.search) {
        params.set("search", query.search);
    }
    if (query.status) {
        params.set("status", query.status);
    }
    const qs = params.toString();
    return request(`/admin/brechos${qs ? `?${qs}` : ""}`, {});
};
export const getAdminBrecho = (brechoId) => request(`/admin/brechos/${brechoId}`, {});
export const createAdminBrecho = (payload) => request("/admin/brechos", {
    method: "POST",
    body: payload
});
export const updateAdminBrecho = (brechoId, payload) => request(`/admin/brechos/${brechoId}`, {
    method: "PATCH",
    body: payload
});
export const createAdminBrechoUser = (brechoId, payload) => request(`/admin/brechos/${brechoId}/users`, {
    method: "POST",
    body: payload
});
export const resetAdminUserPassword = (userId, password) => request(`/admin/users/${userId}/reset-password`, {
    method: "POST",
    body: { password }
});
