import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Field, Input, formatCurrency } from "./ui";
import { parseMoneyLike } from "../lib/money";
export const formatFreteInclusoLabel = (freteIncluso, freteInclusoValor) => {
    if (!freteIncluso) {
        return "sem frete";
    }
    if (freteInclusoValor !== undefined && freteInclusoValor !== null && String(freteInclusoValor).trim()) {
        const valor = parseMoneyLike(freteInclusoValor);
        if (!Number.isNaN(valor) && valor > 0) {
            return `frete incluso (${formatCurrency(valor)})`;
        }
    }
    return "frete incluso";
};
export const validateFreteInclusoValor = (precoVenda, freteInclusoValorRaw) => {
    const trimmed = freteInclusoValorRaw.trim();
    if (!trimmed) {
        return null;
    }
    const frete = parseMoneyLike(trimmed);
    if (Number.isNaN(frete) || frete <= 0) {
        return "Informe um valor de frete válido maior que zero.";
    }
    if (frete > precoVenda) {
        return "Frete incluso não pode ser maior que o preço total.";
    }
    return null;
};
export const parseFreteInclusoValorForApi = (precoVenda, freteInclusoValorRaw) => {
    const trimmed = freteInclusoValorRaw.trim();
    if (!trimmed) {
        return undefined;
    }
    const frete = parseMoneyLike(trimmed);
    if (Number.isNaN(frete) || frete <= 0) {
        return undefined;
    }
    return frete <= precoVenda ? frete : undefined;
};
export const FreteInclusoDetail = ({ precoVenda, freteInclusoValor, onFreteInclusoValorChange }) => {
    const [expanded, setExpanded] = useState(false);
    const freteNum = parseMoneyLike(freteInclusoValor);
    const hasFrete = freteInclusoValor.trim() && !Number.isNaN(freteNum) && freteNum > 0;
    const pecaNum = hasFrete ? Math.max(precoVenda - freteNum, 0) : precoVenda;
    const validationError = hasFrete ? validateFreteInclusoValor(precoVenda, freteInclusoValor) : null;
    return (_jsxs("div", { className: "rounded-xl border border-rose-100 bg-white", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-primary", onClick: () => setExpanded((prev) => !prev), children: ["Detalhar frete (opcional)", _jsx("span", { children: expanded ? "▲" : "▼" })] }), expanded && (_jsxs("div", { className: "space-y-3 border-t border-rose-50 px-4 pb-4 pt-3", children: [_jsx(Field, { label: "Quanto do total \u00E9 frete? (R$)", children: _jsx(Input, { type: "number", step: "0.01", min: 0, placeholder: "Opcional", value: freteInclusoValor, onChange: (e) => onFreteInclusoValorChange(e.target.value) }) }), hasFrete && !validationError && (_jsxs("p", { className: "text-sm text-gray-600", children: ["Pe\u00E7a: ", formatCurrency(pecaNum), " \u00B7 Frete: ", formatCurrency(freteNum)] })), validationError && _jsx("p", { className: "text-sm text-red-600", children: validationError }), _jsx("p", { className: "text-xs text-gray-500", children: "Frete j\u00E1 est\u00E1 no pre\u00E7o. Na sacola n\u00E3o ser\u00E1 cobrado de novo." })] }))] }));
};
