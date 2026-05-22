import { request } from "./client";
export const listPendingSacolas = async (brechoId) => {
    return request("/sacolas/pending", { brechoId });
};
export const shipSacola = async (brechoId, sacolaId, payload) => {
    return request(`/sacolas/${sacolaId}/ship`, {
        method: "POST",
        brechoId,
        body: payload
    });
};
