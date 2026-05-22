export type ClientContactInput = {
  nome?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
};

const digitsOnly = (value: string): string => value.replace(/\D/g, "");

export const normalizeWhatsapp = (raw?: string | null): string | null => {
  if (!raw?.trim()) {
    return null;
  }
  const digits = digitsOnly(raw);
  return digits.length > 0 ? digits : null;
};

export const normalizeInstagram = (raw?: string | null): string | null => {
  if (!raw?.trim()) {
    return null;
  }
  return raw.replace(/^@+/, "").trim().toLowerCase() || null;
};

export const isClientContactComplete = (contact: ClientContactInput): boolean => {
  const nomeOk = (contact.nome?.trim().length ?? 0) >= 2;
  const w = normalizeWhatsapp(contact.whatsapp);
  const i = normalizeInstagram(contact.instagram);
  return nomeOk && Boolean(w || i);
};

export const isClientContactEnriched = (contact: ClientContactInput): boolean => {
  return isClientContactComplete(contact) && Boolean(normalizeWhatsapp(contact.whatsapp) && normalizeInstagram(contact.instagram));
};

export const missingContactChannel = (contact: ClientContactInput): "whatsapp" | "instagram" | null => {
  if (!isClientContactComplete(contact)) {
    return null;
  }
  const w = normalizeWhatsapp(contact.whatsapp);
  const i = normalizeInstagram(contact.instagram);
  if (w && !i) {
    return "instagram";
  }
  if (i && !w) {
    return "whatsapp";
  }
  return null;
};
