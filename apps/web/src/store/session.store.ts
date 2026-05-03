import { create } from "zustand";

export type SessionUser = {
  id: string;
  telefone: string;
  nome: string | null;
  email: string | null;
  isFounder: boolean;
};

export type SessionBrecho = {
  id: string;
  nome: string;
  slug?: string | null;
  telefone: string;
  email?: string | null;
  avatarUrl?: string | null;
  plano: "BASICO" | "MEDIO" | "PRO" | "TRIAL";
  status: "ATIVO" | "TRIAL" | "SUSPENSO";
  trialExpiraEm?: string | null;
};

export type SessionMembership = {
  id: string;
  role: "DONO" | "OPERADOR";
  ativo: boolean;
  brecho: SessionBrecho;
};

type PersistedSession = {
  accessToken: string | null;
  user: SessionUser | null;
  activeBrecho: SessionBrecho | null;
  memberships: SessionMembership[];
};

type SessionState = {
  accessToken: string | null;
  user: SessionUser | null;
  activeBrecho: SessionBrecho | null;
  memberships: SessionMembership[];
  isAuthenticated: boolean;
  brechoId: string;
  setSession: (value: PersistedSession) => void;
  clearSession: () => void;
  setBrechoId: (value: string) => void;
};

const storageKey = "anna.session";

const readInitialSession = (): PersistedSession => {
  if (typeof window === "undefined") {
    return { accessToken: null, user: null, activeBrecho: null, memberships: [] };
  }
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return { accessToken: null, user: null, activeBrecho: null, memberships: [] };
  }
  try {
    return JSON.parse(raw) as PersistedSession;
  } catch {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem("anna.accessToken");
    return { accessToken: null, user: null, activeBrecho: null, memberships: [] };
  }
};

const initial = readInitialSession();

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: initial.accessToken,
  user: initial.user,
  activeBrecho: initial.activeBrecho,
  memberships: initial.memberships,
  isAuthenticated: Boolean(initial.accessToken && initial.user),
  brechoId: initial.activeBrecho?.id ?? "",
  setSession: (value) => {
    if (value.accessToken) {
      window.localStorage.setItem("anna.accessToken", value.accessToken);
    } else {
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
