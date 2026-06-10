import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type InventoryLocationState = {
  scrollToItemId?: string;
};

const scrollStorageKey = (brechoId: string) => `anna.inventory.scroll.${brechoId}`;

const readStoredScroll = (brechoId: string): number | null => {
  const raw = sessionStorage.getItem(scrollStorageKey(brechoId));
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const writeStoredScroll = (brechoId: string, scrollY: number) => {
  sessionStorage.setItem(scrollStorageKey(brechoId), String(scrollY));
};

export const useInventoryScrollRestore = (brechoId: string | null, ready: boolean) => {
  const location = useLocation();
  const navigate = useNavigate();
  const restoredRef = useRef(false);
  const capturedScrollRef = useRef(0);

  const scrollToItemId = (location.state as InventoryLocationState | null)?.scrollToItemId;

  const captureScroll = useCallback(() => {
    capturedScrollRef.current = window.scrollY;
  }, []);

  const restoreScroll = useCallback(() => {
    const saved = capturedScrollRef.current;
    if (saved <= 0) {
      return;
    }
    if (Math.abs(window.scrollY - saved) > 50) {
      window.scrollTo(0, saved);
    }
  }, []);

  useEffect(() => {
    if (!brechoId) {
      return;
    }
    return () => {
      writeStoredScroll(brechoId, window.scrollY);
    };
  }, [brechoId]);

  useLayoutEffect(() => {
    if (!brechoId || !ready || restoredRef.current) {
      return;
    }
    restoredRef.current = true;

    if (scrollToItemId) {
      const element = document.querySelector(`[data-inventory-item-id="${scrollToItemId}"]`);
      if (element) {
        element.scrollIntoView({ block: "center" });
        navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
        return;
      }
    }

    const storedScroll = readStoredScroll(brechoId);
    if (storedScroll != null) {
      window.scrollTo(0, storedScroll);
      capturedScrollRef.current = storedScroll;
    }
  }, [brechoId, ready, scrollToItemId, location.pathname, location.search, navigate]);

  return { captureScroll, restoreScroll };
};
