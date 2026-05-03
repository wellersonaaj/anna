import { request } from "./client";
export const login = (payload) => request("/auth/login", {
    method: "POST",
    body: payload,
    auth: false
});
export const getMe = () => request("/me", {});
export const logout = () => request("/auth/logout", {
    method: "POST"
});
export const changePassword = (payload) => request("/auth/change-password", {
    method: "POST",
    body: payload
});
