import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { agruparImportacaoLote, createImportacaoLote, getImportacaoLote, presignImportFoto, putToPresignedUrl, registerImportFoto } from "../api/importacoes";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Section } from "../components/ui";
const extFromMime = (mime) => {
    const m = mime.split(";")[0]?.trim().toLowerCase() ?? "image/jpeg";
    if (m === "image/png") {
        return "png";
    }
    if (m === "image/webp") {
        return "webp";
    }
    return "jpg";
};
export const ImportacaoCriarPage = () => {
    const { loteId: loteIdParam } = useParams();
    const brechoId = useSessionStore((s) => s.brechoId);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [loteId, setLoteId] = useState(loteIdParam ?? null);
    const [fila, setFila] = useState([]);
    const [criarError, setCriarError] = useState(null);
    const creatingRef = useRef(false);
    useEffect(() => {
        if (loteIdParam) {
            setLoteId(loteIdParam);
        }
    }, [loteIdParam]);
    useEffect(() => {
        if (loteId || loteIdParam || creatingRef.current) {
            return;
        }
        creatingRef.current = true;
        void (async () => {
            try {
                const l = await createImportacaoLote(brechoId);
                setLoteId(l.id);
                void navigate(`/importacoes/${l.id}/criar`, { replace: true });
            }
            catch (e) {
                setCriarError(e instanceof Error ? e.message : "Falha ao criar lote.");
            }
        })();
    }, [brechoId, loteId, loteIdParam, navigate]);
    const detailQuery = useQuery({
        queryKey: ["importacao", brechoId, loteId],
        queryFn: () => getImportacaoLote(brechoId, loteId),
        enabled: Boolean(loteId)
    });
    const nextOrdem = useMemo(() => {
        const fromServer = detailQuery.data?.fotos?.length
            ? Math.max(...detailQuery.data.fotos.map((f) => f.ordemOriginal)) + 1
            : 0;
        const fromFila = fila.length ? Math.max(...fila.map((f) => f.ordemOriginal)) + 1 : 0;
        return Math.max(fromServer, fromFila, 0);
    }, [detailQuery.data?.fotos, fila]);
    const onPickFiles = useCallback((list) => {
        if (!list?.length) {
            return;
        }
        let o = nextOrdem;
        const added = [];
        for (let i = 0; i < list.length; i++) {
            const file = list.item(i);
            if (!file || !file.type.startsWith("image/")) {
                continue;
            }
            added.push({
                ordemOriginal: o,
                file,
                previewUrl: URL.createObjectURL(file),
                status: "pendente"
            });
            o++;
        }
        if (added.length) {
            setFila((prev) => [...prev, ...added]);
        }
    }, [nextOrdem]);
    const uploadMutation = useMutation({
        mutationFn: async ({ brechoId: bid, loteId: lid, pend }) => {
            let fail = 0;
            const uploadOneRow = async (row) => {
                const mime = row.file.type.split(";")[0]?.trim() || "image/jpeg";
                const ext = extFromMime(mime);
                const signed = await presignImportFoto(bid, lid, {
                    contentType: mime,
                    extensao: ext,
                    ordemOriginal: row.ordemOriginal,
                    tamanhoBytes: row.file.size
                });
                await putToPresignedUrl(signed.uploadUrl, row.file, mime);
                await registerImportFoto(bid, lid, {
                    ordemOriginal: row.ordemOriginal,
                    url: signed.publicUrl,
                    mime,
                    tamanhoBytes: row.file.size,
                    nomeArquivo: row.file.name,
                    source: "galeria"
                });
            };
            for (const row of pend) {
                setFila((prev) => prev.map((r) => (r.ordemOriginal === row.ordemOriginal ? { ...r, status: "enviando" } : r)));
                try {
                    await uploadOneRow(row);
                    setFila((prev) => prev.map((r) => (r.ordemOriginal === row.ordemOriginal ? { ...r, status: "ok" } : r)));
                }
                catch (e) {
                    fail++;
                    const msg = e instanceof Error ? e.message : "Erro no upload.";
                    setFila((prev) => prev.map((r) => r.ordemOriginal === row.ordemOriginal ? { ...r, status: "erro", error: msg } : r));
                }
            }
            await queryClient.invalidateQueries({ queryKey: ["importacao", bid, lid] });
            await queryClient.invalidateQueries({ queryKey: ["importacoes", bid] });
            await queryClient.invalidateQueries({ queryKey: ["importacoes-pendentes", bid] });
            return { brechoId: bid, loteId: lid, fail };
        },
        onSuccess: (result) => {
            if (result.fail === 0) {
                agruparMutation.mutate({ brechoId: result.brechoId, loteId: result.loteId });
            }
        }
    });
    const agruparMutation = useMutation({
        mutationFn: async ({ brechoId: bid, loteId: lid }) => {
            return agruparImportacaoLote(bid, lid);
        },
        onSuccess: async (_detail, vars) => {
            await queryClient.invalidateQueries({ queryKey: ["importacao", vars.brechoId, vars.loteId] });
            await queryClient.invalidateQueries({ queryKey: ["importacoes", vars.brechoId] });
            navigate(`/importacoes/${vars.loteId}/grupos`);
        }
    });
    const totalFotosServidor = detailQuery.data?.fotos?.length ?? 0;
    const filaPendente = fila.some((f) => f.status === "pendente" || f.status === "erro");
    const filaEnviando = fila.some((f) => f.status === "enviando");
    const podeAgrupar = totalFotosServidor > 0 && !filaPendente && !filaEnviando && !uploadMutation.isPending;
    const filaEmProcessamento = uploadMutation.isPending || agruparMutation.isPending;
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "estoque", topBarTitle: "Nova importa\u00E7\u00E3o", fabLink: "/items/new", children: [_jsxs("section", { children: [_jsx("h1", { className: "font-headline text-3xl font-extrabold tracking-tighter", children: "Fotos do lote" }), _jsx("p", { className: "mt-1 text-sm text-on-surface-variant", children: "Selecione na ordem em que quer agrupar (a ordem importa). Ao enviar, a IA organiza as fotos automaticamente." })] }), criarError ? _jsx("p", { className: "rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900", children: criarError }) : null, _jsxs(Section, { title: "Adicionar fotos", children: [_jsxs("p", { className: "mb-2 text-sm text-on-surface-variant", children: ["No servidor: ", _jsx("strong", { children: totalFotosServidor }), " \u00B7 Na fila local: ", _jsx("strong", { children: fila.length })] }), _jsxs("label", { className: "inline-flex cursor-pointer", children: [_jsx("span", { className: "inline-flex h-11 items-center rounded-xl border-2 border-primary bg-white px-4 text-sm font-bold text-primary", children: "Escolher da galeria" }), _jsx("input", { type: "file", accept: "image/*", multiple: true, className: "sr-only", onChange: (e) => {
                                    onPickFiles(e.target.files);
                                    e.target.value = "";
                                } })] }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [_jsx(Button, { type: "button", disabled: !loteId ||
                                    (!filaPendente && !fila.some((f) => f.status === "erro")) ||
                                    filaEmProcessamento, onClick: () => {
                                    if (!loteId) {
                                        return;
                                    }
                                    const pend = fila.filter((f) => f.status === "pendente" || f.status === "erro");
                                    if (pend.length === 0) {
                                        return;
                                    }
                                    uploadMutation.mutate({ brechoId, loteId, pend });
                                }, children: uploadMutation.isPending
                                    ? "Enviando…"
                                    : agruparMutation.isPending
                                        ? "Organizando…"
                                        : "Enviar e organizar fotos" }), !filaPendente && totalFotosServidor > 0 ? (_jsx(Button, { type: "button", disabled: !podeAgrupar || agruparMutation.isPending, onClick: () => {
                                    if (!loteId) {
                                        return;
                                    }
                                    agruparMutation.mutate({ brechoId, loteId });
                                }, className: "!bg-[#006a39]", children: agruparMutation.isPending ? "Organizando…" : "Organizar fotos com IA" })) : null] }), uploadMutation.isError ? (_jsx("p", { className: "mt-2 text-sm text-rose-800", children: uploadMutation.error?.message ?? "Falha ao enviar fotos." })) : null, agruparMutation.isError ? (_jsx("p", { className: "mt-2 text-sm text-rose-800", children: agruparMutation.error?.message ?? "Falha ao agrupar." })) : null] }), fila.length > 0 ? (_jsx(Section, { title: "Fila de envio (miniaturas)", children: _jsx("div", { className: "grid grid-cols-3 gap-2 sm:grid-cols-4", children: fila.map((r) => (_jsxs("div", { className: "relative overflow-hidden rounded-xl border border-rose-100", children: [_jsx("img", { src: r.previewUrl, alt: "", className: "aspect-square w-full object-cover" }), _jsxs("span", { className: "absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white", children: ["#", r.ordemOriginal + 1] }), _jsx("span", { className: "absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white", children: r.status })] }, r.ordemOriginal))) }) })) : null, _jsx("p", { className: "text-center text-sm", children: _jsx(Link, { to: "/importacoes", className: "font-bold text-primary underline", children: "Ver importa\u00E7\u00F5es" }) })] }));
};
