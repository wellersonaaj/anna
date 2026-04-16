import { create } from "zustand";

type SessionState = {
  brechoId: string;
  setBrechoId: (value: string) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  brechoId: "demo-brecho",
  setBrechoId: (value) => set({ brechoId: value })
}));
