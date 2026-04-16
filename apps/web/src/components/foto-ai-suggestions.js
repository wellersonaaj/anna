import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const categoriaLabels = {
    ROUPA_FEMININA: "Roupa feminina",
    ROUPA_MASCULINA: "Roupa masculina",
    CALCADO: "Calçado",
    ACESSORIO: "Acessório"
};
const condicaoLabels = {
    OTIMO: "Ótimo",
    BOM: "Bom",
    REGULAR: "Regular"
};
export const FotoAiSuggestionsCard = ({ analysis }) => {
    const lowConfidence = analysis.confianca < 0.6;
    const multiplas = analysis.multiplasPecas;
    return (_jsxs("div", { style: {
            fontSize: 13,
            marginTop: 8,
            padding: 12,
            background: "#f0f7f2",
            borderRadius: 10,
            border: "1px solid #c5e0cc"
        }, children: [_jsx("strong", { style: { display: "block", marginBottom: 8 }, children: "Sugest\u00E3o da IA (revise antes de usar)" }), lowConfidence && (_jsx("p", { style: { color: "#7a5a00", margin: "0 0 6px", fontWeight: 600 }, children: "Confian\u00E7a baixa \u2014 confira manualmente." })), multiplas && (_jsx("p", { style: { color: "#7a5a00", margin: "0 0 6px", fontWeight: 600 }, children: "V\u00E1rios itens na foto \u2014 resultado pode ser impreciso." })), _jsxs("ul", { style: { margin: 0, paddingLeft: 18, lineHeight: 1.5 }, children: [analysis.nomeSugerido && (_jsxs("li", { children: [_jsx("strong", { children: "Nome:" }), " ", analysis.nomeSugerido] })), analysis.categoria && (_jsxs("li", { children: [_jsx("strong", { children: "Categoria:" }), " ", categoriaLabels[analysis.categoria] ?? analysis.categoria] })), analysis.subcategoria && (_jsxs("li", { children: [_jsx("strong", { children: "Subcategoria:" }), " ", analysis.subcategoria] })), analysis.corPrincipal && (_jsxs("li", { children: [_jsx("strong", { children: "Cor:" }), " ", analysis.corPrincipal] })), _jsxs("li", { children: [_jsx("strong", { children: "Estampa:" }), " ", analysis.estampado ? "Sim" : "Não", analysis.descricaoEstampa ? ` (${analysis.descricaoEstampa})` : ""] }), analysis.condicao && (_jsxs("li", { children: [_jsx("strong", { children: "Condi\u00E7\u00E3o:" }), " ", condicaoLabels[analysis.condicao] ?? analysis.condicao] })), _jsxs("li", { children: [_jsx("strong", { children: "Confian\u00E7a:" }), " ", Math.round(analysis.confianca * 100), "%"] }), (analysis.ambienteFoto || analysis.qualidadeFoto) && (_jsxs("li", { style: { opacity: 0.85 }, children: [_jsx("strong", { children: "Foto:" }), " ", analysis.ambienteFoto ?? "—", " \u00B7 qualidade ", analysis.qualidadeFoto ?? "—"] }))] })] }));
};
