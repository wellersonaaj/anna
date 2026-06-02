import { useSessionStore } from "../store/session.store";
const SESSION_EXPIRED_MESSAGES = new Set([
    "Sessão inválida.",
    "Invalid session.",
    "Authorization bearer token is required."
]);
const SESSION_EXPIRE_BLOCKLIST_PATHS = ["/auth/login", "/auth/change-password"];
let queryClient = null;
let isHandling = false;
export const registerQueryClient = (client) => {
    queryClient = client;
};
export const normalizeApiPath = (path) => path.split("?")[0] ?? path;
export const shouldExpireSession = (status, message, path, auth) => {
    if (status !== 401 || !auth) {
        return false;
    }
    const normalizedPath = normalizeApiPath(path);
    if (SESSION_EXPIRE_BLOCKLIST_PATHS.some((blocked) => normalizedPath === blocked || normalizedPath.startsWith(`${blocked}/`))) {
        return false;
    }
    return SESSION_EXPIRED_MESSAGES.has(message);
};
export const handleSessionExpired = () => {
    if (typeof window === "undefined") {
        return;
    }
    if (isHandling || window.location.pathname === "/login") {
        return;
    }
    isHandling = true;
    useSessionStore.getState().clearSession();
    queryClient?.clear();
    window.location.assign("/login?reason=session_expired");
};
