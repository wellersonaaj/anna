import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { classificarImportacaoLote, getImportacaoLote } from "../api/importacoes";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Section } from "../components/ui";
const nomeSugeridoFromFormValues = (formValues) => {
    if (!formValues || typeof formValues !== "object") {
        return null;
    }
    const nome = formValues.nome;
    return typeof nome === "string" && nome.trim() ? nome.trim() : null;
};
export const ImportacaoRascunhosPage = () => {
    const { loteId } = useParams();
    const brechoId = useSessionStore((s) => s.brechoId);
    const queryClient = useQueryClient();
    const autoClassificacaoLoteRef = useRef(null);
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
    const { data: classificarData, error: classificarError, isError: classificarIsError, isPending: classificarIsPending, mutate: classificar } = classificarMutation;
    const grupos = detailQuery.data?.grupos ?? [];
    const todosGruposConfirmados = grupos.length > 0 && grupos.every((g) => g.status === "CONFIRMADO");
    const precisaClassificar = todosGruposConfirmados &&
        grupos.some((g) => !g.rascunho ||
            !g.rascunho.draftAnalysisId ||
            g.rascunho.status === "ERRO_CLASSIFICACAO");
    useEffect(() => {
        if (!loteId || !precisaClassificar || classificarIsPending) {
            return;
        }
        if (autoClassificacaoLoteRef.current === loteId) {
            return;
        }
        autoClassificacaoLoteRef.current = loteId;
        classificar();
    }, [classificar, classificarIsPending, loteId, precisaClassificar]);
    if (!loteId) {
        return null;
    }
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "estoque", topBarTitle: "Pe\u00E7as", fabLink: "/items/new", children: [_jsxs("section", { children: [_jsx("h1", { className: "font-headline text-3xl font-extrabold tracking-tighter", children: "Dados das pe\u00E7as" }), _jsx("p", { className: "mt-1 text-sm text-on-surface-variant", children: "A IA preenche os dados automaticamente depois que as pe\u00E7as s\u00E3o confirmadas. Revise cada rascunho e publique no estoque." })] }), !todosGruposConfirmados ? (_jsxs("p", { className: "rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm", children: ["Confirme as pe\u00E7as antes de gerar os dados.", " ", _jsx(Link, { to: `/importacoes/${loteId}/grupos`, className: "font-bold text-primary underline", children: "Ir para pe\u00E7as" })] })) : null, todosGruposConfirmados && (precisaClassificar || classificarIsPending || classificarIsError) ? (_jsxs(Section, { title: "An\u00E1lise com IA", children: [classificarIsPending ? (_jsx("p", { className: "text-sm font-semibold text-on-surface-variant", children: "Analisando pe\u00E7as com IA..." })) : precisaClassificar && !classificarIsError ? (_jsx("p", { className: "text-sm font-semibold text-on-surface-variant", children: "Preparando an\u00E1lise das pe\u00E7as..." })) : null, classificarData ? (_jsxs("p", { className: "mt-2 text-xs text-on-surface-variant", children: ["OK: ", classificarData.ok, " \u00B7 Falhas: ", classificarData.fail] })) : null, classificarIsError ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "mt-2 text-sm text-rose-800", children: classificarError.message }), _jsx(Button, { type: "button", className: "mt-3", onClick: () => classificar(), children: "Tentar novamente" })] })) : null] })) : null, _jsx(Section, { title: "Pe\u00E7as para revisar", children: detailQuery.isLoading ? (_jsx("p", { className: "text-sm", children: "Carregando\u2026" })) : (_jsx("ul", { className: "space-y-2", children: grupos.map((g, i) => {
                        const fotoPrincipal = g.fotos[0];
                        const nomeSugerido = nomeSugeridoFromFormValues(g.rascunho?.formValues);
                        const titulo = nomeSugerido ?? `Peça ${i + 1}`;
                        return (_jsxs("li", { className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-white p-3", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [fotoPrincipal ? (_jsx("img", { src: fotoPrincipal.thumbnailUrl ?? fotoPrincipal.url, alt: "", loading: "lazy", width: 56, height: 56, className: "h-14 w-14 shrink-0 rounded-lg object-cover" })) : (_jsx("div", { className: "flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-[10px] font-bold text-outline", children: "Sem foto" })), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate font-bold", children: titulo }), _jsx("p", { className: "text-xs text-on-surface-variant", children: g.rascunho?.status === "PUBLICADO"
                                                        ? "Publicado"
                                                        : g.rascunho?.status === "ERRO_CLASSIFICACAO"
                                                            ? "Erro na IA - tente novamente"
                                                            : g.rascunho
                                                                ? "Rascunho pronto para revisar"
                                                                : classificarIsPending
                                                                    ? "Analisando peça..."
                                                                    : "Aguardando análise" })] })] }), g.rascunho && g.rascunho.status === "RASCUNHO" ? (_jsx(Link, { to: `/importacoes/${loteId}/rascunhos/${g.rascunho.id}`, className: "text-sm font-bold text-primary underline", children: "Revisar" })) : g.rascunho?.status === "PUBLICADO" && g.rascunho.pecaId ? (_jsx(Link, { to: `/items/${g.rascunho.pecaId}`, className: "text-sm font-bold text-primary underline", children: "Abrir pe\u00E7a" })) : null] }, g.id));
                    }) })) }), _jsx("p", { className: "text-center text-sm", children: _jsx(Link, { to: "/importacoes", className: "font-bold text-primary underline", children: "Inbox" }) })] }));
};
