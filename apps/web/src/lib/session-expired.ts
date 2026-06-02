import type { QueryClient } from "@tanstack/react-query";
import { useSessionStore } from "../store/session.store";

const SESSION_EXPIRED_MESSAGES = new Set([
  "Sessão inválida.",
  "Invalid session.",
  "Authorization bearer token is required."
]);

const SESSION_EXPIRE_BLOCKLIST_PATHS = ["/auth/login", "/auth/change-password"];

let queryClient: QueryClient | null = null;
let isHandling = false;

export const registerQueryClient = (client: QueryClient): void => {
  queryClient = client;
};

export const normalizeApiPath = (path: string): string => path.split("?")[0] ?? path;

export const shouldExpireSession = (
  status: number,
  message: string,
  path: string,
  auth: boolean
): boolean => {
  if (status !== 401 || !auth) {
    return false;
  }
  const normalizedPath = normalizeApiPath(path);
  if (SESSION_EXPIRE_BLOCKLIST_PATHS.some((blocked) => normalizedPath === blocked || normalizedPath.startsWith(`${blocked}/`))) {
    return false;
  }
  return SESSION_EXPIRED_MESSAGES.has(message);
};

export const handleSessionExpired = (): void => {
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
