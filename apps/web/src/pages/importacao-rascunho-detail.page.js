import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getImportacaoLote, patchImportacaoRascunho, publicarImportacaoRascunho } from "../api/importacoes";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section, Select } from "../components/ui";
const emptyForm = {
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
};
export const ImportacaoRascunhoDetailPage = () => {
    const { loteId, rascunhoId } = useParams();
    const brechoId = useSessionStore((s) => s.brechoId);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form, setForm] = useState(emptyForm);
    const detailQuery = useQuery({
        queryKey: ["importacao", brechoId, loteId],
        queryFn: () => getImportacaoLote(brechoId, loteId),
        enabled: Boolean(loteId)
    });
    const rascunhoEntry = detailQuery.data?.grupos
        .map((grupo) => (grupo.rascunho ? { grupo, rascunho: grupo.rascunho } : null))
        .find((x) => x !== null && x.rascunho.id === rascunhoId);
    useEffect(() => {
        const raw = rascunhoEntry?.rascunho.formValues;
        if (!raw) {
            return;
        }
        setForm({
            nome: String(raw.nome ?? ""),
            categoria: raw.categoria ?? "ROUPA_FEMININA",
            subcategoria: String(raw.subcategoria ?? ""),
            cor: String(raw.cor ?? ""),
            estampa: Boolean(raw.estampa),
            condicao: raw.condicao ?? "OTIMO",
            tamanho: String(raw.tamanho ?? ""),
            marca: String(raw.marca ?? ""),
            precoVenda: raw.precoVenda != null ? String(raw.precoVenda) : "",
            acervoTipo: raw.acervoTipo ?? "PROPRIO",
            acervoNome: String(raw.acervoNome ?? "")
        });
    }, [rascunhoEntry?.rascunho.formValues, rascunhoEntry?.rascunho.id]);
    const saveMutation = useMutation({
        mutationFn: () => patchImportacaoRascunho(brechoId, loteId, rascunhoId, {
            formValues: {
                ...form,
                precoVenda: form.precoVenda.trim() ? Number(form.precoVenda.replace(",", ".")) : undefined,
                marca: form.marca.trim() || undefined,
                acervoNome: form.acervoNome.trim() || undefined
            }
        }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
        }
    });
    const pubMutation = useMutation({
        mutationFn: () => publicarImportacaoRascunho(brechoId, loteId, rascunhoId, {
            helpfulness: "SIM"
        }),
        onSuccess: (data) => {
            void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
            void queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
            void navigate(`/items/${data.itemId}`);
        }
    });
    if (!loteId || !rascunhoId) {
        return null;
    }
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "estoque", topBarTitle: "Revisar pe\u00E7a", fabLink: "/items/new", children: [_jsxs("section", { children: [_jsx("h1", { className: "font-headline text-3xl font-extrabold tracking-tighter", children: "Revisar dados" }), _jsx("p", { className: "mt-1 text-sm text-on-surface-variant", children: "Ajuste os campos e publique no estoque." })] }), rascunhoEntry ? (_jsx("div", { className: "mb-4 flex flex-wrap gap-2", children: rascunhoEntry.grupo.fotos.map((f) => (_jsx("img", { src: f.url, alt: "", className: "h-24 w-20 rounded-lg object-cover" }, f.id))) })) : detailQuery.isLoading ? (_jsx("p", { className: "text-sm", children: "Carregando\u2026" })) : (_jsx("p", { className: "text-sm text-rose-800", children: "Rascunho n\u00E3o encontrado." })), rascunhoEntry?.rascunho.status === "PUBLICADO" ? (_jsxs("p", { children: ["J\u00E1 publicado.", " ", _jsx(Link, { to: `/items/${rascunhoEntry.rascunho.pecaId}`, className: "font-bold text-primary underline", children: "Abrir pe\u00E7a" })] })) : (_jsxs(Section, { title: "Campos", children: [_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx(Field, { label: "Nome", children: _jsx(Input, { value: form.nome, onChange: (e) => setForm((f) => ({ ...f, nome: e.target.value })) }) }), _jsx(Field, { label: "Categoria", children: _jsxs(Select, { value: form.categoria, onChange: (e) => setForm((f) => ({ ...f, categoria: e.target.value })), children: [_jsx("option", { value: "ROUPA_FEMININA", children: "Roupa feminina" }), _jsx("option", { value: "ROUPA_MASCULINA", children: "Roupa masculina" }), _jsx("option", { value: "CALCADO", children: "Cal\u00E7ado" }), _jsx("option", { value: "ACESSORIO", children: "Acess\u00F3rio" })] }) }), _jsx(Field, { label: "Subcategoria", children: _jsx(Input, { value: form.subcategoria, onChange: (e) => setForm((f) => ({ ...f, subcategoria: e.target.value })) }) }), _jsx(Field, { label: "Cor", children: _jsx(Input, { value: form.cor, onChange: (e) => setForm((f) => ({ ...f, cor: e.target.value })) }) }), _jsx(Field, { label: "Estampa", children: _jsx("input", { type: "checkbox", checked: form.estampa, onChange: (e) => setForm((f) => ({ ...f, estampa: e.target.checked })) }) }), _jsx(Field, { label: "Condi\u00E7\u00E3o", children: _jsxs(Select, { value: form.condicao, onChange: (e) => setForm((f) => ({ ...f, condicao: e.target.value })), children: [_jsx("option", { value: "OTIMO", children: "\u00D3timo" }), _jsx("option", { value: "BOM", children: "Bom" }), _jsx("option", { value: "REGULAR", children: "Regular" })] }) }), _jsx(Field, { label: "Tamanho", children: _jsx(Input, { value: form.tamanho, onChange: (e) => setForm((f) => ({ ...f, tamanho: e.target.value })) }) }), _jsx(Field, { label: "Marca", children: _jsx(Input, { value: form.marca, onChange: (e) => setForm((f) => ({ ...f, marca: e.target.value })) }) }), _jsx(Field, { label: "Pre\u00E7o venda (opcional)", children: _jsx(Input, { value: form.precoVenda, onChange: (e) => setForm((f) => ({ ...f, precoVenda: e.target.value })) }) }), _jsx(Field, { label: "Acervo", children: _jsxs(Select, { value: form.acervoTipo, onChange: (e) => setForm((f) => ({ ...f, acervoTipo: e.target.value })), children: [_jsx("option", { value: "PROPRIO", children: "Pr\u00F3prio" }), _jsx("option", { value: "CONSIGNACAO", children: "Consigna\u00E7\u00E3o" })] }) }), _jsx(Field, { label: "Nome do acervo (opcional)", children: _jsx(Input, { value: form.acervoNome, onChange: (e) => setForm((f) => ({ ...f, acervoNome: e.target.value })) }) })] }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [_jsx(Button, { type: "button", disabled: saveMutation.isPending, onClick: () => saveMutation.mutate(), children: saveMutation.isPending ? "Salvando…" : "Salvar rascunho" }), _jsx(Button, { type: "button", className: "!bg-[#006a39]", disabled: pubMutation.isPending, onClick: () => pubMutation.mutate(), children: pubMutation.isPending ? "Publicando…" : "Publicar no estoque" })] }), pubMutation.isError ? (_jsx("p", { className: "mt-2 text-sm text-rose-800", children: pubMutation.error.message })) : null] })), _jsx("p", { className: "mt-6 text-center text-sm", children: _jsx(Link, { to: `/importacoes/${loteId}/rascunhos`, className: "font-bold text-primary underline", children: "Voltar \u00E0 lista" }) })] }));
};
