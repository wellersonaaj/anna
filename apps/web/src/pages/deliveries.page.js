import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { deliverSale, listSalesPendingDelivery } from "../api/items";
import { AppShell, Button, Field, Input, Section } from "../components/ui";
import { useSessionStore } from "../store/session.store";
export const DeliveriesPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const [rastreioPorVenda, setRastreioPorVenda] = useState({});
    const pendingSalesQuery = useQuery({
        queryKey: ["pending-sales", brechoId],
        queryFn: () => listSalesPendingDelivery(brechoId)
    });
    const deliverMutation = useMutation({
        mutationFn: (vars) => deliverSale(brechoId, vars.saleId, {
            codigoRastreio: vars.codigoRastreio?.trim() || undefined,
            entregueEm: new Date().toISOString()
        }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["pending-sales", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
        }
    });
    return (_jsxs(AppShell, { children: [_jsx(Link, { to: "/", children: "Voltar ao estoque" }), _jsx(Section, { title: "Aguardando entrega", children: pendingSalesQuery.isLoading ? (_jsx("p", { children: "Carregando..." })) : (_jsx("div", { className: "stack", children: pendingSalesQuery.data?.length ? (pendingSalesQuery.data.map((sale) => (_jsxs("article", { className: "card stack", style: { gap: 8 }, children: [_jsx("strong", { children: sale.peca.nome }), _jsxs("small", { children: ["Cliente: ", sale.cliente.nome] }), _jsx(Field, { label: "C\u00F3digo de rastreio (opcional)", children: _jsx(Input, { placeholder: "Ex.: BR123456789BR", value: rastreioPorVenda[sale.id] ?? "", onChange: (event) => setRastreioPorVenda((prev) => ({
                                        ...prev,
                                        [sale.id]: event.target.value
                                    })) }) }), _jsx(Button, { type: "button", disabled: deliverMutation.isPending, onClick: () => deliverMutation.mutate({
                                    saleId: sale.id,
                                    codigoRastreio: rastreioPorVenda[sale.id]
                                }), children: "Marcar entregue" })] }, sale.id)))) : (_jsx("p", { children: "Nenhuma venda pendente de entrega." })) })) })] }));
};
