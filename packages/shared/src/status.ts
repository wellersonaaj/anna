export const itemStatus = {
  DISPONIVEL: "DISPONIVEL",
  RESERVADO: "RESERVADO",
  VENDIDO: "VENDIDO",
  ENTREGUE: "ENTREGUE",
  INDISPONIVEL: "INDISPONIVEL"
} as const;

export type ItemStatus = (typeof itemStatus)[keyof typeof itemStatus];

const allowedTransitions: Record<ItemStatus, ItemStatus[]> = {
  DISPONIVEL: [itemStatus.RESERVADO, itemStatus.VENDIDO, itemStatus.INDISPONIVEL],
  RESERVADO: [itemStatus.VENDIDO, itemStatus.DISPONIVEL],
  VENDIDO: [itemStatus.ENTREGUE],
  ENTREGUE: [],
  INDISPONIVEL: [itemStatus.DISPONIVEL]
};

export const canTransitionStatus = (from: ItemStatus, to: ItemStatus): boolean => {
  return allowedTransitions[from].includes(to);
};
