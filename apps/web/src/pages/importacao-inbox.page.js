import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { cancelarImportacaoLote, listImportacaoLotes } from "../api/importacoes";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Section } from "../components/ui";
const statusLabel = {
    RECEBENDO_FOTOS: "Enviando fotos",
    AGRUPANDO: "Organizando…",
    REVISAR_GRUPOS: "Revisar grupos",
    CLASSIFICANDO: "Classificando…",
    REVISAR_DADOS: "Revisar dados",
    CONCLUIDO: "Concluído",
    ERRO: "Erro",
    ABANDONADO: "Abandonado"
};
export const ImportacaoInboxPage = () => {
    const brechoId = useSessionStore((s) => s.brechoId);
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ["importacoes", brechoId],
        queryFn: () => listImportacaoLotes(brechoId)
    });
    const cancelarMutation = useMutation({
        mutationFn: (loteId) => cancelarImportacaoLote(brechoId, loteId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["importacoes", brechoId] });
            void queryClient.invalidateQueries({ queryKey: ["importacoes-pendentes", brechoId] });
        }
    });
    const lotesVisiveis = query.data?.filter((l) => l.status !== "ABANDONADO" && !(l.status === "RECEBENDO_FOTOS" && l.totalFotos === 0)) ??
        [];
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "estoque", topBarTitle: "Importa\u00E7\u00F5es", fabLink: "/items/new", children: [_jsxs("section", { className: "flex flex-wrap items-end justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-headline text-4xl font-extrabold tracking-tighter", children: "Importa\u00E7\u00F5es" }), _jsx("p", { className: "mt-1 text-sm text-on-surface-variant", children: "Lotes com v\u00E1rias pe\u00E7as \u2014 fora do estoque at\u00E9 publicar." })] }), _jsx(Link, { to: "/importacoes/criar", children: _jsx(Button, { type: "button", children: "Nova importa\u00E7\u00E3o" }) })] }), _jsx(Section, { title: "Seus lotes", children: query.isLoading ? (_jsx("p", { className: "text-sm", children: "Carregando\u2026" })) : lotesVisiveis.length ? (_jsx("ul", { className: "space-y-3", children: lotesVisiveis.map((l) => (_jsxs("li", { className: "flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-100 bg-white p-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-bold text-on-background", children: new Date(l.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) }), _jsxs("p", { className: "text-xs text-on-surface-variant", children: [statusLabel[l.status] ?? l.status, " \u00B7 ", l.totalFotos, " fotos \u00B7 ", l.totalGrupos, " grupos"] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [l.status === "RECEBENDO_FOTOS" || l.status === "AGRUPANDO" ? (_jsx(Link, { to: `/importacoes/${l.id}/criar`, className: "text-xs font-bold text-primary underline", children: "Continuar fotos" })) : null, l.status === "REVISAR_GRUPOS" ? (_jsx(Link, { to: `/importacoes/${l.id}/grupos`, className: "text-xs font-bold text-primary underline", children: "Revisar grupos" })) : null, (l.status === "REVISAR_DADOS" || l.status === "CLASSIFICANDO" || l.status === "ERRO") && (_jsx(Link, { to: `/importacoes/${l.id}/rascunhos`, className: "text-xs font-bold text-primary underline", children: "Rascunhos" })), l.status === "CONCLUIDO" ? (_jsx("span", { className: "text-xs font-bold text-[#006a39]", children: "Publicado" })) : null, l.status !== "CONCLUIDO" ? (_jsx("button", { type: "button", className: "text-xs font-bold text-primary underline disabled:opacity-60", disabled: cancelarMutation.isPending, onClick: () => {
                                            if (window.confirm("Cancelar esta importação? Ela sairá da lista.")) {
                                                cancelarMutation.mutate(l.id);
                                            }
                                        }, children: "Cancelar" })) : null] })] }, l.id))) })) : (_jsx("p", { className: "text-sm text-on-surface-variant", children: "Nenhuma importa\u00E7\u00E3o ainda." })) }), _jsx("p", { className: "text-center text-sm", children: _jsx(Link, { to: "/", className: "font-bold text-primary underline", children: "Voltar ao estoque" }) })] }));
};
