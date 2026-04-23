import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DraftFotoAnaliseResponse, ItemCategoria } from "../api/items";

export type ItemAIDraftFormValues = {
  nome: string;
  categoria: ItemCategoria;
  subcategoria: string;
  cor: string;
  estampa: boolean;
  condicao: "OTIMO" | "BOM" | "REGULAR";
  tamanho: string;
  marca: string;
  precoVenda: string;
  acervoTipo: "PROPRIO" | "CONSIGNACAO";
  acervoNome: string;
};

const buildInitialFormValues = (): ItemAIDraftFormValues => ({
  nome: "",
  categoria: "ROUPA_FEMININA",
  subcategoria: "",
  cor: "",
  estampa: false,
  condicao: "OTIMO",
  tamanho: "",
  marca: "",
  precoVenda: "",
  acervoTipo: "PROPRIO",
  acervoNome: ""
});

type ItemAIDraftState = {
  draftId: string;
  images: string[];
  textoContexto: string;
  analysis: DraftFotoAnaliseResponse | null;
  draftAnalysisId: string | null;
  formValues: ItemAIDraftFormValues;
  lastUpdatedAt: number;
  addImageDataUrl: (value: string) => void;
  removeImageAt: (index: number) => void;
  clearImages: () => void;
  setTextoContexto: (value: string) => void;
  setFormField: <K extends keyof ItemAIDraftFormValues>(field: K, value: ItemAIDraftFormValues[K]) => void;
  applyAnalysis: (analysis: DraftFotoAnaliseResponse) => void;
  resetDraft: () => void;
};

const touch = () => Date.now();

const createDraftId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}`;
};

const buildInitialState = () => ({
  draftId: createDraftId(),
  images: [],
  textoContexto: "",
  analysis: null,
  draftAnalysisId: null,
  formValues: buildInitialFormValues(),
  lastUpdatedAt: touch()
});

export const useItemAIDraftStore = create<ItemAIDraftState>()(
  persist(
    (set) => ({
      ...buildInitialState(),
      addImageDataUrl: (value) =>
        set((state) => {
          if (state.images.length >= 5) {
            return state;
          }
          return {
            images: [...state.images, value],
            analysis: null,
            draftAnalysisId: null,
            lastUpdatedAt: touch()
          };
        }),
      removeImageAt: (index) =>
        set((state) => ({
          images: state.images.filter((_, currentIndex) => currentIndex !== index),
          analysis: null,
          draftAnalysisId: null,
          lastUpdatedAt: touch()
        })),
      clearImages: () =>
        set(() => ({
          images: [],
          analysis: null,
          draftAnalysisId: null,
          lastUpdatedAt: touch()
        })),
      setTextoContexto: (value) => set(() => ({ textoContexto: value, lastUpdatedAt: touch() })),
      setFormField: (field, value) =>
        set((state) => ({
          formValues: {
            ...state.formValues,
            [field]: value
          },
          lastUpdatedAt: touch()
        })),
      applyAnalysis: (analysis) =>
        set((state) => ({
          analysis,
          draftAnalysisId: analysis.draftAnalysisId,
          formValues: {
            ...state.formValues,
            nome: analysis.suggestions.nomeSugerido ?? state.formValues.nome,
            categoria: analysis.suggestions.categoria ?? state.formValues.categoria,
            subcategoria: analysis.suggestions.subcategoria ?? state.formValues.subcategoria,
            cor: analysis.suggestions.corPrincipal ?? state.formValues.cor,
            estampa: analysis.suggestions.estampado,
            condicao: analysis.suggestions.condicao ?? state.formValues.condicao,
            tamanho: analysis.suggestions.tamanho ?? state.formValues.tamanho,
            marca: analysis.suggestions.marca ?? state.formValues.marca
          },
          lastUpdatedAt: touch()
        })),
      resetDraft: () =>
        set(() => ({
          ...buildInitialState()
        }))
    }),
    {
      name: "anna-item-ai-draft-v1"
    }
  )
);
