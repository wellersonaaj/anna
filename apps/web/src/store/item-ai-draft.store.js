import { create } from "zustand";
import { persist } from "zustand/middleware";
const buildInitialFormValues = () => ({
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
const touch = () => Date.now();
const createDraftId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `draft-${Date.now()}`;
};
const buildInitialState = () => ({
    draftId: createDraftId(),
    imageDataUrl: null,
    textoContexto: "",
    analysis: null,
    formValues: buildInitialFormValues(),
    lastUpdatedAt: touch()
});
export const useItemAIDraftStore = create()(persist((set) => ({
    ...buildInitialState(),
    setImageDataUrl: (value) => set(() => ({
        imageDataUrl: value,
        analysis: value ? null : null,
        lastUpdatedAt: touch()
    })),
    setTextoContexto: (value) => set(() => ({ textoContexto: value, lastUpdatedAt: touch() })),
    setFormField: (field, value) => set((state) => ({
        formValues: {
            ...state.formValues,
            [field]: value
        },
        lastUpdatedAt: touch()
    })),
    applyAnalysis: (analysis) => set((state) => ({
        analysis,
        formValues: {
            ...state.formValues,
            nome: analysis.suggestions.nomeSugerido ?? state.formValues.nome,
            categoria: analysis.suggestions.categoria ?? state.formValues.categoria,
            subcategoria: analysis.suggestions.subcategoria ?? state.formValues.subcategoria,
            cor: analysis.suggestions.corPrincipal ?? state.formValues.cor,
            estampa: analysis.suggestions.estampado,
            condicao: analysis.suggestions.condicao ?? state.formValues.condicao
        },
        lastUpdatedAt: touch()
    })),
    resetDraft: () => set(() => ({
        ...buildInitialState()
    }))
}), {
    name: "anna-item-ai-draft-v1"
}));
