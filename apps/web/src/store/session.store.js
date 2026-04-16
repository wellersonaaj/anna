import { create } from "zustand";
export const useSessionStore = create((set) => ({
    brechoId: "demo-brecho",
    setBrechoId: (value) => set({ brechoId: value })
}));
