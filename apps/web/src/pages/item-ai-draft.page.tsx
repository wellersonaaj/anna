import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  addItemFoto,
  analisarFotoRascunho,
  createFotoLote,
  createItem,
  listAcervoSuggestions,
  presignFotoLoteUpload,
  putToPresignedUrl
} from "../api/items";
import { ApiError } from "../api/client";
import { AppShell, Button, Field, Input, Section, Select } from "../components/ui";
import { resizeImageToJpeg } from "../lib/imageResize";
import { useSessionStore } from "../store/session.store";
import { useItemAIDraftStore } from "../store/item-ai-draft.store";

const toDataUrl = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== "string") {
        reject(new Error("Falha ao ler a imagem."));
        return;
      }
      resolve(value);
    };
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(blob);
  });
};

const parseDataUrl = (
  dataUrl: string
): {
  mime: "image/jpeg" | "image/png";
  base64: string;
} => {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
  if (!match) {
    throw new Error("Formato de imagem inválido para análise.");
  }
  const mime = match[1];
  const base64 = match[2];
  if (!mime || !base64) {
    throw new Error("Formato de imagem inválido para análise.");
  }
  return {
    mime: mime as "image/jpeg" | "image/png",
    base64
  };
};

export const ItemAIDraftPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    imageDataUrl,
    textoContexto,
    analysis,
    formValues,
    setImageDataUrl,
    setTextoContexto,
    setFormField,
    applyAnalysis,
    resetDraft
  } = useItemAIDraftStore();

  const acervoSuggestionsQuery = useQuery({
    queryKey: ["acervo-suggestions", brechoId, formValues.acervoTipo, formValues.acervoNome],
    queryFn: () =>
      listAcervoSuggestions(brechoId, {
        q: formValues.acervoNome.trim() || undefined,
        acervoTipo: formValues.acervoTipo,
        limit: 8
      })
  });

  const handleImagePicked = async (file: File | null) => {
    if (!file) {
      return;
    }
    try {
      const jpeg = await resizeImageToJpeg(file);
      const dataUrl = await toDataUrl(jpeg);
      setImageDataUrl(dataUrl);
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível preparar a imagem.");
    }
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!imageDataUrl) {
        throw new Error("Selecione uma foto para analisar.");
      }
      const parsed = parseDataUrl(imageDataUrl);
      return analisarFotoRascunho(brechoId, {
        imageBase64: parsed.base64,
        imageMime: parsed.mime,
        textoNota: textoContexto.trim() || undefined
      });
    },
    onSuccess: (result) => {
      applyAnalysis(result);
      setActionError(null);
    },
    onError: (error) => {
      setActionError(error instanceof ApiError ? error.message : "Não foi possível analisar a foto.");
    }
  });

  const requiredMissing = [
    !imageDataUrl ? "foto" : null,
    !formValues.nome.trim() ? "nome" : null,
    !formValues.categoria ? "categoria" : null,
    !formValues.cor.trim() ? "cor" : null,
    !formValues.condicao ? "condição" : null,
    !formValues.tamanho.trim() ? "tamanho" : null
  ].filter(Boolean);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (requiredMissing.length > 0 || !imageDataUrl) {
        throw new Error(`Complete os campos obrigatórios: ${requiredMissing.join(", ")}.`);
      }

      const imageBlob = await (await fetch(imageDataUrl)).blob();
      const created = await createItem(brechoId, {
        nome: formValues.nome.trim(),
        categoria: formValues.categoria,
        subcategoria: formValues.subcategoria.trim() || "sem_subcategoria",
        cor: formValues.cor.trim(),
        estampa: formValues.estampa,
        condicao: formValues.condicao,
        tamanho: formValues.tamanho.trim(),
        marca: formValues.marca.trim() || undefined,
        precoVenda: formValues.precoVenda.trim()
          ? Number(formValues.precoVenda.replace(",", "."))
          : undefined,
        acervoTipo: formValues.acervoTipo,
        acervoNome: formValues.acervoNome.trim() || undefined
      });

      const lote = await createFotoLote(brechoId, created.id, {
        textoNota: textoContexto.trim() || undefined
      });
      const signed = await presignFotoLoteUpload(brechoId, created.id, lote.id, {
        tipo: "imagem",
        contentType: "image/jpeg",
        extensao: "jpeg",
        tamanhoBytes: imageBlob.size
      });
      await putToPresignedUrl(signed.uploadUrl, imageBlob, "image/jpeg");
      await addItemFoto(brechoId, created.id, { url: signed.publicUrl, loteId: lote.id });

      await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, created.id] });

      return created.id;
    },
    onSuccess: (itemId) => {
      resetDraft();
      setActionError(null);
      navigate(`/items/${itemId}`);
    },
    onError: (error) => {
      setActionError(error instanceof ApiError ? error.message : String(error));
    }
  });

  return (
    <AppShell>
      <Link to="/">← Voltar ao estoque</Link>

      <header>
        <h1 style={{ marginBottom: 4 }}>Cadastrar com IA</h1>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          Envie uma foto, opcionalmente descreva o contexto, revise os campos e conclua.
        </p>
      </header>

      {actionError && (
        <p style={{ color: "#b60e3d", fontSize: 14 }} role="alert">
          {actionError}
        </p>
      )}

      <Section title="1. Foto e contexto">
        <div className="stack" style={{ gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="button" onClick={() => cameraInputRef.current?.click()}>
              Tirar foto
            </Button>
            <Button type="button" onClick={() => galleryInputRef.current?.click()}>
              Escolher da galeria
            </Button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(event) => {
              void handleImagePicked(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              void handleImagePicked(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
          {imageDataUrl ? (
            <img
              src={imageDataUrl}
              alt="Pré-visualização da foto selecionada"
              style={{ width: "100%", maxWidth: 360, borderRadius: 12, border: "1px solid #e7d5d6" }}
            />
          ) : (
            <p style={{ opacity: 0.8, margin: 0 }}>Nenhuma foto selecionada ainda.</p>
          )}
          <Field label="Contexto em texto (opcional)">
            <textarea
              value={textoContexto}
              onChange={(event) => setTextoContexto(event.target.value)}
              rows={3}
              style={{
                width: "100%",
                border: "1px solid #d9b9bc",
                borderRadius: 10,
                padding: 12,
                fontFamily: "inherit",
                fontSize: 15
              }}
              placeholder="Ex.: vestido com brilho, costas com zíper e caimento reto..."
            />
          </Field>
          <Button type="button" onClick={() => analyzeMutation.mutate()} disabled={!imageDataUrl || analyzeMutation.isPending}>
            {analyzeMutation.isPending ? "Analisando..." : "Sugerir com IA"}
          </Button>
        </div>
      </Section>

      <Section title="2. Revisão rápida dos dados">
        {analysis && (
          <div
            style={{
              fontSize: 13,
              padding: 12,
              background: "#f0f7f2",
              borderRadius: 10,
              border: "1px solid #c5e0cc",
              marginBottom: 10
            }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>Sugestões da IA aplicadas automaticamente</strong>
            <p style={{ margin: 0 }}>
              Confiança: {Math.round(analysis.meta.confianca * 100)}% · Ambiente: {analysis.meta.ambienteFoto ?? "—"} ·
              Qualidade: {analysis.meta.qualidadeFoto ?? "—"}
            </p>
            {analysis.warnings.lowConfidence && (
              <p style={{ color: "#7a5a00", margin: "8px 0 0", fontWeight: 600 }}>
                Confiança baixa — revise os campos manualmente.
              </p>
            )}
            {analysis.warnings.multiplasPecas && (
              <p style={{ color: "#7a5a00", margin: "8px 0 0", fontWeight: 600 }}>
                Vários itens detectados — resultado pode ser impreciso.
              </p>
            )}
          </div>
        )}

        <div className="grid cols-2">
          <Field label="Nome">
            <Input value={formValues.nome} onChange={(event) => setFormField("nome", event.target.value)} />
          </Field>
          <Field label="Categoria">
            <Select
              value={formValues.categoria}
              onChange={(event) => setFormField("categoria", event.target.value as typeof formValues.categoria)}
            >
              <option value="ROUPA_FEMININA">Roupa feminina</option>
              <option value="ROUPA_MASCULINA">Roupa masculina</option>
              <option value="CALCADO">Calçado</option>
              <option value="ACESSORIO">Acessório</option>
            </Select>
          </Field>
          <Field label="Subcategoria">
            <Input
              value={formValues.subcategoria}
              onChange={(event) => setFormField("subcategoria", event.target.value)}
              placeholder="Ex.: vestido, saia, tênis..."
            />
          </Field>
          <Field label="Cor">
            <Input value={formValues.cor} onChange={(event) => setFormField("cor", event.target.value)} />
          </Field>
          <Field label="Condição">
            <Select
              value={formValues.condicao}
              onChange={(event) => setFormField("condicao", event.target.value as typeof formValues.condicao)}
            >
              <option value="OTIMO">Ótimo</option>
              <option value="BOM">Bom</option>
              <option value="REGULAR">Regular</option>
            </Select>
          </Field>
          <Field label="Tamanho">
            <Input value={formValues.tamanho} onChange={(event) => setFormField("tamanho", event.target.value)} />
          </Field>
          <Field label="Marca">
            <Input value={formValues.marca} onChange={(event) => setFormField("marca", event.target.value)} />
          </Field>
          <Field label="Preço venda">
            <Input
              type="number"
              step="0.01"
              value={formValues.precoVenda}
              onChange={(event) => setFormField("precoVenda", event.target.value)}
            />
          </Field>
          <Field label="Acervo">
            <Select
              value={formValues.acervoTipo}
              onChange={(event) => setFormField("acervoTipo", event.target.value as typeof formValues.acervoTipo)}
            >
              <option value="PROPRIO">Próprio</option>
              <option value="CONSIGNACAO">Consignação</option>
            </Select>
          </Field>
          <Field label="Nome do acervo">
            <Input
              list="acervo-suggestions-ai-draft"
              value={formValues.acervoNome}
              onChange={(event) => setFormField("acervoNome", event.target.value)}
            />
            <datalist id="acervo-suggestions-ai-draft">
              {acervoSuggestionsQuery.data?.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </Field>
          <Field label="Tem estampa?">
            <input
              type="checkbox"
              checked={formValues.estampa}
              onChange={(event) => setFormField("estampa", event.target.checked)}
            />
          </Field>
        </div>

        <div className="stack" style={{ marginTop: 12, gap: 8 }}>
          <Button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={requiredMissing.length > 0 || submitMutation.isPending}
          >
            {submitMutation.isPending ? "Concluindo cadastro..." : "Concluir cadastro"}
          </Button>
          {requiredMissing.length > 0 && (
            <small style={{ color: "#8b2f2f" }}>
              Obrigatórios pendentes: {requiredMissing.join(", ")}.
            </small>
          )}
        </div>
      </Section>
    </AppShell>
  );
};
