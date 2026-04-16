import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { createItem, listAcervoSuggestions, listItems } from "../api/items";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section, Select, StatusBadge } from "../components/ui";
const createItemFormSchema = z.object({
    nome: z.string().min(2),
    categoria: z.enum(["ROUPA_FEMININA", "ROUPA_MASCULINA", "CALCADO", "ACESSORIO"]),
    subcategoria: z.string().min(2),
    cor: z.string().min(2),
    estampa: z.boolean().default(false),
    condicao: z.enum(["OTIMO", "BOM", "REGULAR"]),
    tamanho: z.string().min(1),
    marca: z.string().optional(),
    precoVenda: z.coerce.number().optional(),
    acervoTipo: z.enum(["PROPRIO", "CONSIGNACAO"]),
    acervoNome: z.string().trim().min(2).max(80).optional().or(z.literal(""))
});
export const InventoryPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const acervoSuggestionsListId = useId();
    const queryClient = useQueryClient();
    const { register, handleSubmit, formState, reset, watch } = useForm({
        resolver: zodResolver(createItemFormSchema),
        defaultValues: {
            acervoTipo: "PROPRIO",
            categoria: "ROUPA_FEMININA",
            condicao: "OTIMO",
            estampa: false,
            acervoNome: ""
        }
    });
    const acervoTipo = watch("acervoTipo");
    const acervoNome = watch("acervoNome");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterCategoria, setFilterCategoria] = useState("");
    const [filterSearch, setFilterSearch] = useState("");
    const listFilters = useMemo(() => ({
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterCategoria ? { categoria: filterCategoria } : {}),
        ...(filterSearch.trim() ? { search: filterSearch.trim() } : {})
    }), [filterStatus, filterCategoria, filterSearch]);
    const itemsQuery = useQuery({
        queryKey: ["items", brechoId, listFilters],
        queryFn: () => listItems(brechoId, listFilters)
    });
    const createItemMutation = useMutation({
        mutationFn: (data) => createItem(brechoId, {
            ...data,
            acervoNome: data.acervoNome?.trim() || undefined
        }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["acervo-suggestions", brechoId] });
            reset();
        }
    });
    const acervoSuggestionsQuery = useQuery({
        queryKey: ["acervo-suggestions", brechoId, acervoTipo, acervoNome],
        queryFn: () => listAcervoSuggestions(brechoId, {
            q: acervoNome?.trim() || undefined,
            acervoTipo,
            limit: 8
        })
    });
    return (_jsxs(AppShell, { children: [_jsxs("header", { children: [_jsx("h1", { style: { marginBottom: 4 }, children: "Estoque" }), _jsx("p", { style: { marginTop: 0, opacity: 0.8 }, children: "Fluxos P0 com foco em cadastro e baixa r\u00E1pida." })] }), _jsxs(Section, { title: "Cadastro r\u00E1pido de pe\u00E7a", children: [_jsxs("form", { className: "grid cols-2", onSubmit: handleSubmit((data) => createItemMutation.mutate(data)), children: [_jsx(Field, { label: "Nome", children: _jsx(Input, { ...register("nome") }) }), _jsx(Field, { label: "Categoria", children: _jsxs(Select, { ...register("categoria"), children: [_jsx("option", { value: "ROUPA_FEMININA", children: "Roupa feminina" }), _jsx("option", { value: "ROUPA_MASCULINA", children: "Roupa masculina" }), _jsx("option", { value: "CALCADO", children: "Cal\u00E7ado" }), _jsx("option", { value: "ACESSORIO", children: "Acess\u00F3rio" })] }) }), _jsx(Field, { label: "Subcategoria", children: _jsx(Input, { ...register("subcategoria") }) }), _jsx(Field, { label: "Cor", children: _jsx(Input, { ...register("cor") }) }), _jsx(Field, { label: "Tem estampa?", children: _jsx("input", { type: "checkbox", ...register("estampa") }) }), _jsx(Field, { label: "Condi\u00E7\u00E3o", children: _jsxs(Select, { ...register("condicao"), children: [_jsx("option", { value: "OTIMO", children: "\u00D3timo" }), _jsx("option", { value: "BOM", children: "Bom" }), _jsx("option", { value: "REGULAR", children: "Regular" })] }) }), _jsx(Field, { label: "Tamanho", children: _jsx(Input, { ...register("tamanho") }) }), _jsx(Field, { label: "Marca", children: _jsx(Input, { ...register("marca") }) }), _jsx(Field, { label: "Pre\u00E7o venda", children: _jsx(Input, { type: "number", step: "0.01", ...register("precoVenda") }) }), _jsx(Field, { label: "Acervo", children: _jsxs(Select, { ...register("acervoTipo"), children: [_jsx("option", { value: "PROPRIO", children: "Pr\u00F3prio" }), _jsx("option", { value: "CONSIGNACAO", children: "Consigna\u00E7\u00E3o" })] }) }), _jsxs(Field, { label: "Nome do acervo", children: [_jsx(Input, { list: acervoSuggestionsListId, placeholder: "Ex.: Acervo Ver\u00E3o 2026", ...register("acervoNome") }), _jsx("datalist", { id: acervoSuggestionsListId, children: acervoSuggestionsQuery.data?.map((suggestion) => (_jsx("option", { value: suggestion }, suggestion))) })] }), _jsx("div", { className: "stack", style: { justifyContent: "end" }, children: _jsx(Button, { type: "submit", disabled: createItemMutation.isPending, children: createItemMutation.isPending ? "Salvando..." : "Cadastrar peça" }) })] }), formState.errors.root && _jsx("small", { children: formState.errors.root.message })] }), _jsxs(Section, { title: "Itens cadastrados", children: [_jsxs("div", { className: "grid cols-2", style: { marginBottom: 16 }, children: [_jsx(Field, { label: "Status", children: _jsxs(Select, { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), children: [_jsx("option", { value: "", children: "Todos" }), _jsx("option", { value: "DISPONIVEL", children: "Dispon\u00EDvel" }), _jsx("option", { value: "RESERVADO", children: "Reservado" }), _jsx("option", { value: "VENDIDO", children: "Vendido" }), _jsx("option", { value: "ENTREGUE", children: "Entregue" }), _jsx("option", { value: "INDISPONIVEL", children: "Indispon\u00EDvel" })] }) }), _jsx(Field, { label: "Categoria", children: _jsxs(Select, { value: filterCategoria, onChange: (e) => setFilterCategoria(e.target.value), children: [_jsx("option", { value: "", children: "Todas" }), _jsx("option", { value: "ROUPA_FEMININA", children: "Roupa feminina" }), _jsx("option", { value: "ROUPA_MASCULINA", children: "Roupa masculina" }), _jsx("option", { value: "CALCADO", children: "Cal\u00E7ado" }), _jsx("option", { value: "ACESSORIO", children: "Acess\u00F3rio" })] }) }), _jsx(Field, { label: "Busca (nome, subcategoria, marca, acervo)", children: _jsx(Input, { value: filterSearch, onChange: (e) => setFilterSearch(e.target.value), placeholder: "Digite para filtrar..." }) }), _jsx("div", { className: "stack", style: { justifyContent: "end", alignItems: "stretch" }, children: _jsx(Button, { type: "button", onClick: () => {
                                        setFilterStatus("");
                                        setFilterCategoria("");
                                        setFilterSearch("");
                                    }, children: "Limpar filtros" }) })] }), itemsQuery.isLoading ? (_jsx("p", { children: "Carregando..." })) : (_jsx("div", { className: "stack", children: itemsQuery.data?.map((item) => (_jsxs("article", { className: "card", style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsxs("div", { className: "stack", style: { gap: 6 }, children: [_jsx("strong", { children: item.nome }), _jsxs("small", { children: [item.categoria, " - ", item.subcategoria] }), _jsx(StatusBadge, { status: item.status })] }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx(Link, { to: `/items/${item.id}`, children: "Fotos / fila" }), item.status === "DISPONIVEL" && (_jsx(Link, { to: `/reserve/${item.id}`, style: {
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                height: 40,
                                                padding: "0 14px",
                                                borderRadius: 10,
                                                background: "#b60e3d",
                                                color: "#fff",
                                                textDecoration: "none",
                                                fontWeight: 600
                                            }, children: "Reservar" })), (item.status === "DISPONIVEL" || item.status === "RESERVADO") && (_jsx(Link, { to: `/sell/${item.id}`, children: "Vender" }))] })] }, item.id))) }))] }), _jsx(Link, { to: "/deliveries", children: "Ir para entregas pendentes" })] }));
};
