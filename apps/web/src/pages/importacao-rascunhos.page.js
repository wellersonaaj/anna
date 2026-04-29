import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { classificarImportacaoLote, getImportacaoLote } from "../api/importacoes";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Section } from "../components/ui";
export const ImportacaoRascunhosPage = () => {
    const { loteId } = useParams();
    const brechoId = useSessionStore((s) => s.brechoId);
    const queryClient = useQueryClient();
    const detailQuery = useQuery({
        queryKey: ["importacao", brechoId, loteId],
        queryFn: () => getImportacaoLote(brechoId, loteId),
        enabled: Boolean(loteId)
    });
    const classificarMutation = useMutation({
        mutationFn: () => classificarImportacaoLote(brechoId, loteId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
            void queryClient.invalidateQueries({ queryKey: ["importacoes", brechoId] });
        }
    });
    const grupos = detailQuery.data?.grupos ?? [];
    const todosGruposConfirmados = grupos.length > 0 && grupos.every((g) => g.status === "CONFIRMADO");
    const precisaClassificar = todosGruposConfirmados &&
        grupos.some((g) => !g.rascunho ||
            !g.rascunho.draftAnalysisId ||
            g.rascunho.status === "ERRO_CLASSIFICACAO");
    if (!loteId) {
        return null;
    }
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "estoque", topBarTitle: "Rascunhos", fabLink: "/items/new", children: [_jsxs("section", { children: [_jsx("h1", { className: "font-headline text-3xl font-extrabold tracking-tighter", children: "Dados das pe\u00E7as" }), _jsx("p", { className: "mt-1 text-sm text-on-surface-variant", children: "Gere sugest\u00F5es com IA depois de confirmar os grupos. Revise cada rascunho e publique no estoque." })] }), !todosGruposConfirmados ? (_jsxs("p", { className: "rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm", children: ["Confirme os grupos antes de classificar.", " ", _jsx(Link, { to: `/importacoes/${loteId}/grupos`, className: "font-bold text-primary underline", children: "Ir para grupos" })] })) : null, todosGruposConfirmados && precisaClassificar ? (_jsxs(Section, { title: "Classifica\u00E7\u00E3o com IA", children: [_jsx(Button, { type: "button", disabled: classificarMutation.isPending, onClick: () => classificarMutation.mutate(), children: classificarMutation.isPending ? "Classificando…" : "Preencher dados com IA (todos os grupos)" }), classificarMutation.data ? (_jsxs("p", { className: "mt-2 text-xs text-on-surface-variant", children: ["OK: ", classificarMutation.data.ok, " \u00B7 Falhas: ", classificarMutation.data.fail] })) : null, classificarMutation.isError ? (_jsx("p", { className: "mt-2 text-sm text-rose-800", children: classificarMutation.error.message })) : null] })) : null, _jsx(Section, { title: "Rascunhos por grupo", children: detailQuery.isLoading ? (_jsx("p", { className: "text-sm", children: "Carregando\u2026" })) : (_jsx("ul", { className: "space-y-2", children: grupos.map((g, i) => (_jsxs("li", { className: "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-100 bg-white p-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-bold", children: ["Grupo ", i + 1] }), _jsx("p", { className: "text-xs text-on-surface-variant", children: g.rascunho?.status === "PUBLICADO"
                                            ? "Publicado"
                                            : g.rascunho?.status === "ERRO_CLASSIFICACAO"
                                                ? "Erro na IA — tente classificar de novo"
                                                : g.rascunho
                                                    ? "Rascunho pronto para revisar"
                                                    : "Aguardando classificação" })] }), g.rascunho && g.rascunho.status === "RASCUNHO" ? (_jsx(Link, { to: `/importacoes/${loteId}/rascunhos/${g.rascunho.id}`, className: "text-sm font-bold text-primary underline", children: "Revisar" })) : g.rascunho?.status === "PUBLICADO" && g.rascunho.pecaId ? (_jsx(Link, { to: `/items/${g.rascunho.pecaId}`, className: "text-sm font-bold text-primary underline", children: "Abrir pe\u00E7a" })) : null] }, g.id))) })) }), _jsx("p", { className: "text-center text-sm", children: _jsx(Link, { to: "/importacoes", className: "font-bold text-primary underline", children: "Inbox" }) })] }));
};
