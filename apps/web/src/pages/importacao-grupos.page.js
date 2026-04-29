import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { confirmarImportacaoGrupos, getImportacaoLote, patchImportacaoGrupos, agruparImportacaoLote } from "../api/importacoes";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Section } from "../components/ui";
const gruposToPatchBody = (grupos) => ({
    grupos: grupos.map((g) => ({
        fotoIds: g.fotos.map((f) => f.id)
    }))
});
export const ImportacaoGruposPage = () => {
    const { loteId } = useParams();
    const brechoId = useSessionStore((s) => s.brechoId);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [localGrupos, setLocalGrupos] = useState(null);
    const detailQuery = useQuery({
        queryKey: ["importacao", brechoId, loteId],
        queryFn: () => getImportacaoLote(brechoId, loteId),
        enabled: Boolean(loteId)
    });
    useEffect(() => {
        if (detailQuery.data?.grupos) {
            setLocalGrupos(detailQuery.data.grupos);
        }
    }, [detailQuery.data]);
    const saveMutation = useMutation({
        mutationFn: async (grupos) => {
            return patchImportacaoGrupos(brechoId, loteId, gruposToPatchBody(grupos));
        },
        onSuccess: (data) => {
            setLocalGrupos(data.grupos);
            void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
        }
    });
    const confirmMutation = useMutation({
        mutationFn: () => confirmarImportacaoGrupos(brechoId, loteId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
            navigate(`/importacoes/${loteId}/rascunhos`);
        }
    });
    const reagruparMutation = useMutation({
        mutationFn: () => agruparImportacaoLote(brechoId, loteId),
        onSuccess: (data) => {
            setLocalGrupos(data.grupos);
            void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
        }
    });
    const grupos = localGrupos ?? detailQuery.data?.grupos ?? [];
    const moveFoto = (fotoId, fromG, toG) => {
        if (fromG === toG || !localGrupos) {
            return;
        }
        const next = localGrupos.map((g) => ({
            ...g,
            fotos: [...g.fotos]
        }));
        const from = next[fromG];
        const to = next[toG];
        if (!from || !to) {
            return;
        }
        from.fotos = from.fotos.filter((f) => f.id !== fotoId);
        const moved = localGrupos.flatMap((g) => g.fotos).find((f) => f.id === fotoId);
        if (!moved) {
            return;
        }
        to.fotos.push({ ...moved, ordemNoGrupo: to.fotos.length });
        next.forEach((g) => {
            g.fotos = g.fotos
                .sort((a, b) => a.ordemOriginal - b.ordemOriginal)
                .map((f, i) => ({ ...f, ordemNoGrupo: i }));
        });
        setLocalGrupos(next);
    };
    if (!loteId) {
        return null;
    }
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "estoque", topBarTitle: "Grupos", fabLink: "/items/new", children: [_jsxs("section", { children: [_jsx("h1", { className: "font-headline text-3xl font-extrabold tracking-tighter", children: "Revisar grupos" }), _jsx("p", { className: "mt-1 text-sm text-on-surface-variant", children: "Cada grupo deve ser uma pe\u00E7a. Mova fotos entre grupos se precisar, salve e confirme." })] }), detailQuery.isLoading ? (_jsx("p", { className: "text-sm", children: "Carregando\u2026" })) : grupos.length === 0 ? (_jsxs(Section, { title: "Sem grupos", children: [_jsx("p", { className: "mb-3 text-sm", children: "Volte e envie fotos, ou rode a IA de novo." }), _jsx(Link, { to: `/importacoes/${loteId}/criar`, className: "font-bold text-primary underline", children: "Voltar \u00E0s fotos" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { type: "button", onClick: () => saveMutation.mutate(grupos), disabled: saveMutation.isPending, children: saveMutation.isPending ? "Salvando…" : "Salvar grupos" }), _jsx(Button, { type: "button", className: "!bg-[#5e2d86]", disabled: reagruparMutation.isPending, onClick: () => reagruparMutation.mutate(), children: reagruparMutation.isPending ? "Reorganizando…" : "Reorganizar com IA" }), _jsx(Button, { type: "button", className: "!bg-[#006a39]", disabled: confirmMutation.isPending || saveMutation.isPending, onClick: () => confirmMutation.mutate(), children: confirmMutation.isPending ? "Confirmando…" : "Confirmar grupos e continuar" })] }), _jsx("div", { className: "stack gap-4", style: { marginTop: 16 }, children: grupos.map((g, gi) => (_jsxs(Section, { title: `Grupo ${gi + 1} · fotos ${g.fotos.length}`, children: [g.motivoRevisao ? _jsx("p", { className: "mb-2 text-xs text-[#8a6d00]", children: g.motivoRevisao }) : null, _jsx("div", { className: "flex flex-wrap gap-2", children: g.fotos.map((f) => (_jsxs("div", { className: "w-[100px]", children: [_jsx("img", { src: f.url, alt: "", className: "h-28 w-full rounded-lg object-cover" }), _jsx("label", { className: "mt-1 block text-[10px] font-bold uppercase text-on-surface-variant", children: "Mover para" }), _jsx("select", { className: "mt-0.5 w-full rounded-lg border border-[#d9b9bc] bg-white px-1 py-1 text-[11px]", value: gi, onChange: (e) => moveFoto(f.id, gi, Number(e.target.value)), children: grupos.map((_, ti) => (_jsxs("option", { value: ti, children: ["Grupo ", ti + 1] }, ti))) })] }, f.id))) })] }, g.id))) })] })), _jsx("p", { className: "mt-6 text-center text-sm", children: _jsx(Link, { to: "/importacoes", className: "font-bold text-primary underline", children: "Inbox" }) })] }));
};
