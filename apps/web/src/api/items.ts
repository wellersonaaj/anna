import { request } from "./client";

export type ItemCategoria = "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO";

export type Item = {
  id: string;
  nome: string;
  categoria: string;
  subcategoria: string;
  status: "DISPONIVEL" | "RESERVADO" | "VENDIDO" | "ENTREGUE" | "INDISPONIVEL";
  cor: string;
  tamanho: string;
  acervoTipo: "PROPRIO" | "CONSIGNACAO";
  acervoNome?: string | null;
  precoVenda?: string | number | null;
  marca?: string | null;
};

export type ClienteContato = {
  nome: string;
  whatsapp?: string;
  instagram?: string;
};

export type HistoricoStatusEntry = {
  id: string;
  pecaId: string;
  clienteId: string | null;
  status: Item["status"];
  criadoEm: string;
  cliente?: {
    id: string;
    nome: string;
    whatsapp: string | null;
    instagram: string | null;
  } | null;
};

export type ItemFotoLote = {
  id: string;
  pecaId: string;
  textoNota: string | null;
  audioUrl: string | null;
  transcricaoAudio: string | null;
  criadoEm: string;
};

export type ItemFoto = {
  id: string;
  pecaId: string;
  loteId?: string | null;
  url: string;
  ordem: number;
  criadoEm: string;
  lote?: ItemFotoLote | null;
};

export type FilaInteressadoEntry = {
  id: string;
  pecaId: string;
  clienteId: string;
  posicao: number;
  criadoEm: string;
  cliente: {
    id: string;
    nome: string;
    whatsapp: string | null;
    instagram: string | null;
  };
};

export type ItemDetail = Item & {
  historicoStatus: HistoricoStatusEntry[];
  venda?: unknown;
  fotos?: ItemFoto[];
  fotoLotes?: ItemFotoLote[];
  filaInteressados?: FilaInteressadoEntry[];
};

export type SalePendingDelivery = {
  id: string;
  peca: {
    id: string;
    nome: string;
  };
  cliente: {
    nome: string;
  };
};

export type ListItemsFilters = {
  status?: Item["status"];
  categoria?: ItemCategoria;
  search?: string;
};

export const listItems = async (brechoId: string, filters?: ListItemsFilters): Promise<Item[]> => {
  const params = new URLSearchParams();
  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.categoria) {
    params.set("categoria", filters.categoria);
  }
  if (filters?.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  const qs = params.toString();
  return request<Item[]>(`/items${qs ? `?${qs}` : ""}`, { brechoId });
};

export const getItem = async (brechoId: string, itemId: string): Promise<ItemDetail> => {
  return request<ItemDetail>(`/items/${itemId}`, { brechoId });
};

export const addItemFoto = async (
  brechoId: string,
  itemId: string,
  payload: { url: string; ordem?: number; loteId?: string }
): Promise<ItemFoto> => {
  return request<ItemFoto>(`/items/${itemId}/fotos`, {
    method: "POST",
    brechoId,
    body: payload
  });
};

export const createFotoLote = async (
  brechoId: string,
  itemId: string,
  payload: { textoNota?: string }
): Promise<ItemFotoLote> => {
  return request<ItemFotoLote>(`/items/${itemId}/foto-lotes`, {
    method: "POST",
    brechoId,
    body: payload
  });
};

export const patchFotoLote = async (
  brechoId: string,
  itemId: string,
  loteId: string,
  payload: { textoNota?: string; audioUrl?: string }
): Promise<ItemFotoLote> => {
  return request<ItemFotoLote>(`/items/${itemId}/foto-lotes/${loteId}`, {
    method: "PATCH",
    brechoId,
    body: payload
  });
};

export const presignFotoLoteUpload = async (
  brechoId: string,
  itemId: string,
  loteId: string,
  payload: {
    tipo: "imagem" | "audio";
    contentType: string;
    extensao: "jpg" | "jpeg" | "png" | "webm" | "mp4";
    tamanhoBytes?: number;
  }
): Promise<{ uploadUrl: string; publicUrl: string }> => {
  return request<{ uploadUrl: string; publicUrl: string }>(
    `/items/${itemId}/foto-lotes/${loteId}/presign`,
    {
      method: "POST",
      brechoId,
      body: payload
    }
  );
};

export const transcribeFotoLote = async (
  brechoId: string,
  itemId: string,
  loteId: string
): Promise<ItemFotoLote> => {
  return request<ItemFotoLote>(`/items/${itemId}/foto-lotes/${loteId}/transcribe`, {
    method: "POST",
    brechoId
  });
};

export const putToPresignedUrl = async (
  uploadUrl: string,
  body: Blob,
  contentType: string
): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType
    },
    body
  });
  if (!response.ok) {
    throw new Error(`Upload falhou (${response.status}).`);
  }
};

export const deleteItemFoto = async (brechoId: string, itemId: string, fotoId: string): Promise<void> => {
  return request<void>(`/items/${itemId}/fotos/${fotoId}`, {
    method: "DELETE",
    brechoId
  });
};

export const joinItemFila = async (
  brechoId: string,
  itemId: string,
  payload: { cliente: ClienteContato }
): Promise<FilaInteressadoEntry> => {
  return request<FilaInteressadoEntry>(`/items/${itemId}/fila`, {
    method: "POST",
    brechoId,
    body: payload
  });
};

export const leaveItemFila = async (brechoId: string, itemId: string, entradaId: string): Promise<void> => {
  return request<void>(`/items/${itemId}/fila/${entradaId}`, {
    method: "DELETE",
    brechoId
  });
};

export const createItem = async (
  brechoId: string,
  payload: {
    nome: string;
    categoria: "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO";
    subcategoria: string;
    cor: string;
    estampa: boolean;
    condicao: "OTIMO" | "BOM" | "REGULAR";
    tamanho: string;
    marca?: string;
    precoVenda?: number;
    acervoTipo: "PROPRIO" | "CONSIGNACAO";
    acervoNome?: string;
  }
): Promise<Item> => {
  return request<Item>("/items", {
    method: "POST",
    brechoId,
    body: payload
  });
};

export const listAcervoSuggestions = async (
  brechoId: string,
  query: { q?: string; acervoTipo?: "PROPRIO" | "CONSIGNACAO"; limit?: number }
): Promise<string[]> => {
  const params = new URLSearchParams();

  if (query.q) {
    params.set("q", query.q);
  }

  if (query.acervoTipo) {
    params.set("acervoTipo", query.acervoTipo);
  }

  params.set("limit", String(query.limit ?? 8));

  return request<string[]>(`/acervos/suggestions?${params.toString()}`, { brechoId });
};

export const reserveItem = async (
  brechoId: string,
  itemId: string,
  payload: { cliente: ClienteContato }
): Promise<Item> => {
  return request<Item>(`/items/${itemId}/reserve`, {
    method: "POST",
    brechoId,
    body: payload
  });
};

export const sellItem = async (
  brechoId: string,
  itemId: string,
  payload: {
    cliente: ClienteContato;
    precoVenda: number;
    freteTexto?: string;
    freteValor?: number;
  }
): Promise<Item> => {
  return request<Item>(`/items/${itemId}/sell`, {
    method: "POST",
    brechoId,
    body: payload
  });
};

export const listSalesPendingDelivery = async (brechoId: string): Promise<SalePendingDelivery[]> => {
  return request<SalePendingDelivery[]>("/sales/pending-delivery", { brechoId });
};

export const deliverSale = async (
  brechoId: string,
  saleId: string,
  payload: { codigoRastreio?: string; entregueEm?: string }
): Promise<void> => {
  return request<void>(`/sales/${saleId}/deliver`, {
    method: "POST",
    brechoId,
    body: payload
  });
};
