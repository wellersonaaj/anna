import { create } from "zustand";
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
    images: [],
    textoContexto: "",
    analysis: null,
    draftAnalysisId: null,
    formValues: buildInitialFormValues(),
    lastUpdatedAt: touch()
});
export const useItemAIDraftStore = create()((set) => ({
    ...buildInitialState(),
    addImageDataUrl: (value) => set((state) => ({
        images: [...state.images, value],
        analysis: null,
        draftAnalysisId: null,
        lastUpdatedAt: touch()
    })),
    removeImageAt: (index) => set((state) => ({
        images: state.images.filter((_, currentIndex) => currentIndex !== index),
        analysis: null,
        draftAnalysisId: null,
        lastUpdatedAt: touch()
    })),
    clearImages: () => set(() => ({
        images: [],
        analysis: null,
        draftAnalysisId: null,
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
    resetDraft: () => set(() => ({
        ...buildInitialState()
    }))
}));
