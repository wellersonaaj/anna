import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { createItem, listAcervoSuggestions } from "../api/items";
import { AppShell, Button, Field, Input, Section, Select } from "../components/ui";
import { useSessionStore } from "../store/session.store";
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
export const ItemManualCreatePage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const acervoSuggestionsListId = useId();
    const { register, handleSubmit, formState, watch } = useForm({
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
    const acervoSuggestionsQuery = useQuery({
        queryKey: ["acervo-suggestions", brechoId, acervoTipo, acervoNome],
        queryFn: () => listAcervoSuggestions(brechoId, {
            q: acervoNome?.trim() || undefined,
            acervoTipo,
            limit: 8
        })
    });
    const createItemMutation = useMutation({
        mutationFn: (data) => createItem(brechoId, {
            ...data,
            acervoNome: data.acervoNome?.trim() || undefined
        }),
        onSuccess: async (created) => {
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
            navigate(`/items/${created.id}`);
        }
    });
    return (_jsxs(AppShell, { children: [_jsx(Link, { to: "/items/new", className: "text-sm font-semibold text-on-surface-variant", children: "\u2190 Voltar para cadastro com IA" }), _jsxs("header", { children: [_jsx("h1", { className: "mb-1 font-headline text-3xl font-extrabold tracking-tight", children: "Cadastro manual" }), _jsx("p", { className: "mt-0 text-sm text-on-surface-variant", children: "Preencha os campos essenciais quando n\u00E3o quiser usar an\u00E1lise autom\u00E1tica." })] }), _jsxs(Section, { title: "Dados da pe\u00E7a", children: [_jsxs("form", { className: "grid cols-2", onSubmit: handleSubmit((data) => createItemMutation.mutate(data)), children: [_jsx(Field, { label: "Nome", children: _jsx(Input, { ...register("nome") }) }), _jsx(Field, { label: "Categoria", children: _jsxs(Select, { ...register("categoria"), children: [_jsx("option", { value: "ROUPA_FEMININA", children: "Roupa feminina" }), _jsx("option", { value: "ROUPA_MASCULINA", children: "Roupa masculina" }), _jsx("option", { value: "CALCADO", children: "Cal\u00E7ado" }), _jsx("option", { value: "ACESSORIO", children: "Acess\u00F3rio" })] }) }), _jsx(Field, { label: "Subcategoria", children: _jsx(Input, { ...register("subcategoria") }) }), _jsx(Field, { label: "Cor", children: _jsx(Input, { ...register("cor") }) }), _jsx(Field, { label: "Tem estampa?", children: _jsx("input", { type: "checkbox", ...register("estampa") }) }), _jsx(Field, { label: "Condi\u00E7\u00E3o", children: _jsxs(Select, { ...register("condicao"), children: [_jsx("option", { value: "OTIMO", children: "\u00D3timo" }), _jsx("option", { value: "BOM", children: "Bom" }), _jsx("option", { value: "REGULAR", children: "Regular" })] }) }), _jsx(Field, { label: "Tamanho", children: _jsx(Input, { ...register("tamanho") }) }), _jsx(Field, { label: "Marca", children: _jsx(Input, { ...register("marca") }) }), _jsx(Field, { label: "Pre\u00E7o venda", children: _jsx(Input, { type: "number", step: "0.01", ...register("precoVenda") }) }), _jsx(Field, { label: "Acervo", children: _jsxs(Select, { ...register("acervoTipo"), children: [_jsx("option", { value: "PROPRIO", children: "Pr\u00F3prio" }), _jsx("option", { value: "CONSIGNACAO", children: "Consigna\u00E7\u00E3o" })] }) }), _jsxs(Field, { label: "Nome do acervo", children: [_jsx(Input, { list: acervoSuggestionsListId, placeholder: "Ex.: Acervo Ver\u00E3o 2026", ...register("acervoNome") }), _jsx("datalist", { id: acervoSuggestionsListId, children: acervoSuggestionsQuery.data?.map((suggestion) => (_jsx("option", { value: suggestion }, suggestion))) })] }), _jsx("div", { className: "stack", style: { justifyContent: "end" }, children: _jsx(Button, { type: "submit", disabled: createItemMutation.isPending, children: createItemMutation.isPending ? "Salvando..." : "Cadastrar peça" }) })] }), formState.errors.root && _jsx("small", { children: formState.errors.root.message })] })] }));
};
