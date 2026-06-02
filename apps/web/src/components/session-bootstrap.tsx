import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getMe } from "../api/auth";
import { ApiError } from "../api/client";
import { shouldExpireSession } from "../lib/session-expired";
import { useSessionStore } from "../store/session.store";

const isPublicPath = (pathname: string): boolean =>
  pathname === "/login" || pathname.startsWith("/fila/");

export const SessionBootstrap = () => {
  const location = useLocation();
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const validatedRef = useRef(false);

  useEffect(() => {
    validatedRef.current = false;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || isPublicPath(location.pathname) || validatedRef.current) {
      return;
    }

    validatedRef.current = true;

    void (async () => {
      try {
        const me = await getMe();
        const { accessToken, activeBrecho: currentBrecho, setSession } = useSessionStore.getState();
        if (!accessToken) {
          return;
        }
        const preservedBrecho =
          currentBrecho && me.memberships.some((m) => m.brecho.id === currentBrecho.id)
            ? currentBrecho
            : me.activeBrecho;
        setSession({
          accessToken,
          user: me.user,
          memberships: me.memberships,
          activeBrecho: preservedBrecho
        });
      } catch (error) {
        if (
          error instanceof ApiError &&
          shouldExpireSession(error.statusCode, error.message, "/me", true)
        ) {
          return;
        }
        validatedRef.current = false;
      }
    })();
  }, [isAuthenticated, location.pathname]);

  return null;
};
