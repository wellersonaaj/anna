export const DEFAULT_INVENTORY_STATUS_IN = ["DISPONIVEL", "RESERVADO", "INDISPONIVEL"];
export const DEFAULT_SOLD_WITHIN_DAYS = 30;
export const SOLD_WITHIN_DAYS_OPTIONS = [7, 14, 30, 60, 90];
export const SOLD_ITEM_STATUSES = ["VENDIDO", "ENTREGUE"];
const storageKey = (brechoId) => `anna.inventoryPrefs.${brechoId}`;
const defaultPrefs = () => ({
    statusIn: [...DEFAULT_INVENTORY_STATUS_IN],
    soldWithinDays: DEFAULT_SOLD_WITHIN_DAYS
});
const isItemStatus = (value) => value === "DISPONIVEL" ||
    value === "RESERVADO" ||
    value === "VENDIDO" ||
    value === "ENTREGUE" ||
    value === "INDISPONIVEL";
export const readInventoryPrefs = (brechoId) => {
    if (typeof window === "undefined" || !brechoId) {
        return defaultPrefs();
    }
    const raw = window.localStorage.getItem(storageKey(brechoId));
    if (!raw) {
        return defaultPrefs();
    }
    try {
        const parsed = JSON.parse(raw);
        const statusIn = Array.isArray(parsed.statusIn)
            ? parsed.statusIn.filter(isItemStatus)
            : defaultPrefs().statusIn;
        const soldWithinDays = typeof parsed.soldWithinDays === "number" &&
            SOLD_WITHIN_DAYS_OPTIONS.includes(parsed.soldWithinDays)
            ? parsed.soldWithinDays
            : DEFAULT_SOLD_WITHIN_DAYS;
        return { statusIn, soldWithinDays };
    }
    catch {
        return defaultPrefs();
    }
};
export const writeInventoryPrefs = (brechoId, partial) => {
    const next = { ...readInventoryPrefs(brechoId), ...partial };
    if (typeof window !== "undefined" && brechoId) {
        window.localStorage.setItem(storageKey(brechoId), JSON.stringify(next));
    }
    return next;
};
export const includesSoldStatuses = (statusIn) => statusIn.some((status) => SOLD_ITEM_STATUSES.includes(status));
