import { create } from "zustand";
const storageKey = "anna.session";
const readInitialSession = () => {
    if (typeof window === "undefined") {
        return { accessToken: null, user: null, activeBrecho: null, memberships: [] };
    }
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
        return { accessToken: null, user: null, activeBrecho: null, memberships: [] };
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem("anna.accessToken");
        return { accessToken: null, user: null, activeBrecho: null, memberships: [] };
    }
};
const initial = readInitialSession();
export const useSessionStore = create((set) => ({
    accessToken: initial.accessToken,
    user: initial.user,
    activeBrecho: initial.activeBrecho,
    memberships: initial.memberships,
    isAuthenticated: Boolean(initial.accessToken && initial.user),
    brechoId: initial.activeBrecho?.id ?? "",
    setSession: (value) => {
        if (value.accessToken) {
            window.localStorage.setItem("anna.accessToken", value.accessToken);
        }
        else {
            window.localStorage.removeItem("anna.accessToken");
        }
        window.localStorage.setItem(storageKey, JSON.stringify(value));
        set({
            ...value,
            isAuthenticated: Boolean(value.accessToken && value.user),
            brechoId: value.activeBrecho?.id ?? ""
        });
    },
    clearSession: () => {
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem("anna.accessToken");
        set({
            accessToken: null,
            user: null,
            activeBrecho: null,
            memberships: [],
            isAuthenticated: false,
            brechoId: ""
        });
    },
    setBrechoId: (value) => set({ brechoId: value })
}));
