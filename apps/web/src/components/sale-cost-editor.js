import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { updateSale } from "../api/items";
import { Button, Input, formatCurrency } from "./ui";
import { parseMoneyLike } from "../lib/money";
export const SaleCostEditor = ({ brechoId, saleId, pecaId, pecaNome, pecaCodigo, precoVenda, criadoEm, clienteNome, pecaPrecoCusto, pecaThumbnailUrl, initialPrecoCusto, compact = false, onSuccess }) => {
    const queryClient = useQueryClient();
    const [custo, setCusto] = useState(initialPrecoCusto != null ? String(initialPrecoCusto) : pecaPrecoCusto != null ? String(pecaPrecoCusto) : "");
    const mutation = useMutation({
        mutationFn: () => {
            const precoCusto = parseMoneyLike(custo);
            if (Number.isNaN(precoCusto) || precoCusto < 0) {
                throw new Error("Informe um custo válido.");
            }
            return updateSale(brechoId, saleId, { precoCusto });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sales-period-summary", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["sales-missing-cost", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, pecaId] });
            await queryClient.invalidateQueries({ queryKey: ["pending-sacolas", brechoId] });
            onSuccess?.();
        }
    });
    if (compact) {
        return (_jsxs("div", { className: "flex flex-wrap items-end gap-2", children: [_jsx(Input, { type: "number", step: "0.01", min: 0, placeholder: "Quanto voc\u00EA pagou? (R$)", value: custo, onChange: (event) => setCusto(event.target.value), className: "min-w-[10rem] flex-1" }), _jsx(Button, { type: "button", disabled: mutation.isPending, onClick: () => mutation.mutate(), children: mutation.isPending ? "Salvando..." : "Salvar" }), mutation.isError && (_jsx("p", { className: "w-full text-xs text-red-600", children: mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar." }))] }));
    }
    return (_jsx("article", { className: "rounded-2xl border border-rose-50 bg-white p-3", children: _jsxs("div", { className: "flex items-start gap-3", children: [pecaThumbnailUrl ? (_jsx("img", { src: pecaThumbnailUrl, alt: `Foto da peça ${pecaNome}`, className: "h-14 w-14 shrink-0 rounded-xl object-cover", loading: "lazy" })) : (_jsx("div", { className: "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-xs text-outline", children: "Sem foto" })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs(Link, { to: `/pecas/${pecaId}`, className: "text-sm font-bold text-gray-900 hover:text-primary", children: [pecaCodigo ? `${pecaCodigo} · ` : "", pecaNome] }), _jsxs("p", { className: "text-xs text-gray-500", children: ["Vendido por ", formatCurrency(precoVenda), clienteNome ? ` · ${clienteNome}` : "", criadoEm ? ` · ${new Date(criadoEm).toLocaleDateString("pt-BR")}` : ""] }), pecaPrecoCusto != null && initialPrecoCusto == null && (_jsxs("p", { className: "mt-1 text-xs text-gray-500", children: ["Custo no cadastro: ", formatCurrency(pecaPrecoCusto), " \u2014 voc\u00EA pode copiar"] })), _jsxs("div", { className: "mt-2 flex flex-wrap items-end gap-2", children: [_jsx(Input, { type: "number", step: "0.01", min: 0, placeholder: "Quanto voc\u00EA pagou? (R$)", value: custo, onChange: (event) => setCusto(event.target.value), className: "min-w-[10rem] flex-1" }), _jsx(Button, { type: "button", disabled: mutation.isPending, onClick: () => mutation.mutate(), children: mutation.isPending ? "Salvando..." : "Salvar" })] }), mutation.isError && (_jsx("p", { className: "mt-1 text-xs text-red-600", children: mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar." }))] })] }) }));
};
