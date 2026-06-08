import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { updateSale } from "../api/items";
import { FreteInclusoDetail, parseFreteInclusoValorForApi, validateFreteInclusoValor } from "./frete-incluso-detail";
import { Button, Field, Input } from "./ui";
import { parseMoneyLike } from "../lib/money";
export const EditSaleForm = ({ brechoId, saleId, pecaNome, initialPreco, initialPrecoCusto, initialFreteIncluso, initialFreteInclusoValor, canEditFreteIncluso, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    const [preco, setPreco] = useState(String(initialPreco));
    const [precoCusto, setPrecoCusto] = useState(initialPrecoCusto != null ? String(initialPrecoCusto) : "");
    const [freteIncluso, setFreteIncluso] = useState(initialFreteIncluso);
    const [freteInclusoValor, setFreteInclusoValor] = useState(initialFreteInclusoValor ? String(initialFreteInclusoValor) : "");
    const [freteValidationError, setFreteValidationError] = useState(null);
    const precoNum = parseMoneyLike(preco);
    const precoValid = !Number.isNaN(precoNum) && precoNum > 0;
    const mutation = useMutation({
        mutationFn: () => {
            const precoVenda = parseMoneyLike(preco);
            if (Number.isNaN(precoVenda) || precoVenda <= 0) {
                throw new Error("Informe um preço válido.");
            }
            const showFreteDetail = freteIncluso && (canEditFreteIncluso || initialFreteIncluso);
            if (showFreteDetail) {
                const freteError = validateFreteInclusoValor(precoVenda, freteInclusoValor);
                if (freteError) {
                    throw new Error(freteError);
                }
            }
            const parsedFrete = showFreteDetail
                ? parseFreteInclusoValorForApi(precoVenda, freteInclusoValor)
                : undefined;
            const custoTrim = precoCusto.trim();
            const parsedCusto = custoTrim ? parseMoneyLike(custoTrim) : null;
            if (custoTrim && (Number.isNaN(parsedCusto) || parsedCusto < 0)) {
                throw new Error("Informe um custo válido.");
            }
            return updateSale(brechoId, saleId, {
                precoVenda,
                ...(custoTrim ? { precoCusto: parsedCusto } : {}),
                ...(canEditFreteIncluso
                    ? {
                        freteIncluso,
                        freteInclusoValor: freteIncluso ? (parsedFrete ?? null) : null
                    }
                    : initialFreteIncluso
                        ? { freteInclusoValor: parsedFrete ?? null }
                        : {})
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["pending-sacolas", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["sales-period-summary", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["sales-missing-cost", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["client", brechoId] });
            onSuccess?.();
            onClose();
        }
    });
    const showFreteDetail = freteIncluso && (canEditFreteIncluso || initialFreteIncluso);
    return (_jsxs("div", { className: "rounded-2xl border border-rose-100 bg-white p-4 shadow-lg", children: [_jsx("h4", { className: "mb-1 font-bold text-gray-900", children: "Editar venda" }), _jsx("p", { className: "mb-4 text-sm text-gray-500", children: pecaNome }), _jsxs("div", { className: "space-y-4", children: [_jsx(Field, { label: "Pre\u00E7o (R$)", children: _jsx(Input, { type: "number", step: "0.01", min: 0, value: preco, onChange: (e) => setPreco(e.target.value) }) }), _jsx(Field, { label: "Quanto voc\u00EA pagou? (R$)", children: _jsx(Input, { type: "number", step: "0.01", min: 0, placeholder: "Opcional", value: precoCusto, onChange: (e) => setPrecoCusto(e.target.value) }) }), canEditFreteIncluso && (_jsx(Field, { label: "Frete no pre\u00E7o?", children: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", className: freteIncluso ? "" : "bg-zinc-200 text-gray-800", onClick: () => {
                                        setFreteIncluso(true);
                                        setFreteValidationError(null);
                                    }, children: "Sim" }), _jsx(Button, { type: "button", className: !freteIncluso ? "" : "bg-zinc-200 text-gray-800", onClick: () => {
                                        setFreteIncluso(false);
                                        setFreteInclusoValor("");
                                        setFreteValidationError(null);
                                    }, children: "N\u00E3o" })] }) })), !canEditFreteIncluso && initialFreteIncluso && (_jsx("p", { className: "text-xs text-amber-700", children: "Pe\u00E7a j\u00E1 entregue: ajuste o pre\u00E7o e o frete incluso, se informado." })), !canEditFreteIncluso && !initialFreteIncluso && (_jsx("p", { className: "text-xs text-amber-700", children: "Pe\u00E7a j\u00E1 entregue: s\u00F3 o pre\u00E7o pode ser ajustado." })), showFreteDetail && precoValid && (_jsx(FreteInclusoDetail, { precoVenda: precoNum, freteInclusoValor: freteInclusoValor, onFreteInclusoValorChange: (value) => {
                            setFreteInclusoValor(value);
                            setFreteValidationError(validateFreteInclusoValor(precoNum, value));
                        } })), (freteValidationError || mutation.isError) && (_jsx("p", { className: "text-sm text-red-600", children: freteValidationError ??
                            (mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar.") })), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", disabled: mutation.isPending || Boolean(freteValidationError), onClick: () => mutation.mutate(), children: mutation.isPending ? "Salvando..." : "Salvar" }), _jsx(Button, { type: "button", className: "bg-zinc-200 text-gray-800", onClick: onClose, children: "Cancelar" })] })] })] }));
};
