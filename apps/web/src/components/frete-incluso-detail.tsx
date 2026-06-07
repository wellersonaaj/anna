import { useState } from "react";
import { Field, Input, formatCurrency } from "./ui";
import { parseMoneyLike } from "../lib/money";

export const formatFreteInclusoLabel = (
  freteIncluso: boolean,
  freteInclusoValor?: string | number | null
): string => {
  if (!freteIncluso) {
    return "sem frete";
  }

  if (freteInclusoValor !== undefined && freteInclusoValor !== null && String(freteInclusoValor).trim()) {
    const valor = parseMoneyLike(freteInclusoValor);
    if (!Number.isNaN(valor) && valor > 0) {
      return `frete incluso (${formatCurrency(valor)})`;
    }
  }

  return "frete incluso";
};

type FreteInclusoDetailProps = {
  precoVenda: number;
  freteInclusoValor: string;
  onFreteInclusoValorChange: (value: string) => void;
};

export const validateFreteInclusoValor = (
  precoVenda: number,
  freteInclusoValorRaw: string
): string | null => {
  const trimmed = freteInclusoValorRaw.trim();
  if (!trimmed) {
    return null;
  }

  const frete = parseMoneyLike(trimmed);
  if (Number.isNaN(frete) || frete <= 0) {
    return "Informe um valor de frete válido maior que zero.";
  }

  if (frete > precoVenda) {
    return "Frete incluso não pode ser maior que o preço total.";
  }

  return null;
};

export const parseFreteInclusoValorForApi = (
  precoVenda: number,
  freteInclusoValorRaw: string
): number | undefined => {
  const trimmed = freteInclusoValorRaw.trim();
  if (!trimmed) {
    return undefined;
  }

  const frete = parseMoneyLike(trimmed);
  if (Number.isNaN(frete) || frete <= 0) {
    return undefined;
  }

  return frete <= precoVenda ? frete : undefined;
};

export const FreteInclusoDetail = ({
  precoVenda,
  freteInclusoValor,
  onFreteInclusoValorChange
}: FreteInclusoDetailProps) => {
  const [expanded, setExpanded] = useState(false);
  const freteNum = parseMoneyLike(freteInclusoValor);
  const hasFrete = freteInclusoValor.trim() && !Number.isNaN(freteNum) && freteNum > 0;
  const pecaNum = hasFrete ? Math.max(precoVenda - freteNum, 0) : precoVenda;
  const validationError = hasFrete ? validateFreteInclusoValor(precoVenda, freteInclusoValor) : null;

  return (
    <div className="rounded-xl border border-rose-100 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-primary"
        onClick={() => setExpanded((prev) => !prev)}
      >
        Detalhar frete (opcional)
        <span>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-rose-50 px-4 pb-4 pt-3">
          <Field label="Quanto do total é frete? (R$)">
            <Input
              type="number"
              step="0.01"
              min={0}
              placeholder="Opcional"
              value={freteInclusoValor}
              onChange={(e) => onFreteInclusoValorChange(e.target.value)}
            />
          </Field>
          {hasFrete && !validationError && (
            <p className="text-sm text-gray-600">
              Peça: {formatCurrency(pecaNum)} · Frete: {formatCurrency(freteNum)}
            </p>
          )}
          {validationError && <p className="text-sm text-red-600">{validationError}</p>}
          <p className="text-xs text-gray-500">
            Frete já está no preço. Na sacola não será cobrado de novo.
          </p>
        </div>
      )}
    </div>
  );
};
