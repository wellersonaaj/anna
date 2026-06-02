import type { ItemStatus } from "../api/items";

export type InventoryPrefs = {
  statusIn: ItemStatus[];
  soldWithinDays: number;
};

export const DEFAULT_INVENTORY_STATUS_IN: ItemStatus[] = ["DISPONIVEL", "RESERVADO", "INDISPONIVEL"];

export const DEFAULT_SOLD_WITHIN_DAYS = 30;

export const SOLD_WITHIN_DAYS_OPTIONS = [7, 14, 30, 60, 90] as const;

export const SOLD_ITEM_STATUSES: ItemStatus[] = ["VENDIDO", "ENTREGUE"];

const storageKey = (brechoId: string) => `anna.inventoryPrefs.${brechoId}`;

const defaultPrefs = (): InventoryPrefs => ({
  statusIn: [...DEFAULT_INVENTORY_STATUS_IN],
  soldWithinDays: DEFAULT_SOLD_WITHIN_DAYS
});

const isItemStatus = (value: unknown): value is ItemStatus =>
  value === "DISPONIVEL" ||
  value === "RESERVADO" ||
  value === "VENDIDO" ||
  value === "ENTREGUE" ||
  value === "INDISPONIVEL";

export const readInventoryPrefs = (brechoId: string): InventoryPrefs => {
  if (typeof window === "undefined" || !brechoId) {
    return defaultPrefs();
  }

  const raw = window.localStorage.getItem(storageKey(brechoId));
  if (!raw) {
    return defaultPrefs();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<InventoryPrefs>;
    const statusIn = Array.isArray(parsed.statusIn)
      ? parsed.statusIn.filter(isItemStatus)
      : defaultPrefs().statusIn;
    const soldWithinDays =
      typeof parsed.soldWithinDays === "number" &&
      SOLD_WITHIN_DAYS_OPTIONS.includes(parsed.soldWithinDays as (typeof SOLD_WITHIN_DAYS_OPTIONS)[number])
        ? parsed.soldWithinDays
        : DEFAULT_SOLD_WITHIN_DAYS;

    return { statusIn, soldWithinDays };
  } catch {
    return defaultPrefs();
  }
};

export const writeInventoryPrefs = (brechoId: string, partial: Partial<InventoryPrefs>): InventoryPrefs => {
  const next = { ...readInventoryPrefs(brechoId), ...partial };
  if (typeof window !== "undefined" && brechoId) {
    window.localStorage.setItem(storageKey(brechoId), JSON.stringify(next));
  }
  return next;
};

export const includesSoldStatuses = (statusIn: ItemStatus[]): boolean =>
  statusIn.some((status) => SOLD_ITEM_STATUSES.includes(status));
