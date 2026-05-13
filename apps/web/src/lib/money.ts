const normalizeSingleSeparatorNumber = (raw: string, separator: "," | "."): string => {
  const separatorCount = raw.split(separator).length - 1;
  const lastSeparatorIndex = raw.lastIndexOf(separator);
  const fractionalPartLength = raw.length - lastSeparatorIndex - 1;

  if (separatorCount === 1 && fractionalPartLength > 0 && fractionalPartLength <= 2) {
    return raw.replace(separator, ".");
  }

  return raw.split(separator).join("");
};

const sanitizeMoneyString = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[Rr]\$/g, "")
    .replace(/[^\d,.-]/g, "");

export const parseMoneyLike = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === "") {
    return Number.NaN;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  let raw = sanitizeMoneyString(value);
  if (!raw || raw === "-" || raw === "," || raw === ".") {
    return Number.NaN;
  }

  let sign = 1;
  if (raw.startsWith("-")) {
    sign = -1;
    raw = raw.slice(1);
  }

  if (!raw) {
    return Number.NaN;
  }

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  let normalized = raw;
  if (hasComma && hasDot) {
    const commaIndex = raw.lastIndexOf(",");
    const dotIndex = raw.lastIndexOf(".");
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalized = raw.split(thousandSeparator).join("").replace(decimalSeparator, ".");
  } else if (hasComma) {
    normalized = normalizeSingleSeparatorNumber(raw, ",");
  } else if (hasDot) {
    normalized = normalizeSingleSeparatorNumber(raw, ".");
  }

  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) {
    return Number.NaN;
  }

  return sign * parsed;
};

export const formatCurrencySafe = (
  value: string | number | null | undefined,
  fallback = "Preço a confirmar"
): string => {
  const parsed = parseMoneyLike(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const moneyInputValue = (value: string | number | null | undefined): string => {
  const parsed = parseMoneyLike(value);
  if (Number.isNaN(parsed)) {
    return "";
  }
  return String(parsed);
};
