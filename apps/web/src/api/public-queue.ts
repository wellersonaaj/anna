import { request } from "./client";
import type { ClienteContato } from "./items";

export type PublicQueueInfo = {
  pecaNome: string;
  pecaCodigo: string | null;
  status: string;
  canJoin: boolean;
  totalNaFila: number;
  fotoUrl: string | null;
};

export type PublicQueueJoinResult = {
  posicao: number;
  totalNaFila: number;
  message: string;
};

export const getPublicQueueInfo = async (token: string) => {
  return request<PublicQueueInfo>(`/public/queue/${token}`, { auth: false });
};

export const joinPublicQueue = async (token: string, cliente: ClienteContato) => {
  return request<PublicQueueJoinResult>(`/public/queue/${token}/join`, {
    method: "POST",
    auth: false,
    body: { cliente }
  });
};

export const createFilaLink = async (brechoId: string, itemId: string) => {
  return request<{ url: string; token: string }>(`/items/${itemId}/fila-link`, {
    method: "POST",
    brechoId
  });
};

export const revokeFilaLink = async (brechoId: string, itemId: string) => {
  return request<void>(`/items/${itemId}/fila-link`, { method: "DELETE", brechoId });
};
