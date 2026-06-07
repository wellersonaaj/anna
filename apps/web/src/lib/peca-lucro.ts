import { parseMoneyLike } from "./money";

export const computeLucroBruto = (
  precoVenda: number,
  precoCusto: number | null | undefined
): number | null => {
  if (precoCusto === null || precoCusto === undefined) {
    return null;
  }

  return precoVenda - precoCusto;
};

export const formatExpectedMarginHint = (
  precoCustoInput: string | number | null | undefined,
  precoVendaInput: string | number | null | undefined
): string | null => {
  const custoRaw = typeof precoCustoInput === "string" ? precoCustoInput.trim() : precoCustoInput;
  const vendaRaw = typeof precoVendaInput === "string" ? precoVendaInput.trim() : precoVendaInput;

  if (custoRaw === "" || custoRaw === null || custoRaw === undefined) {
    return null;
  }
  if (vendaRaw === "" || vendaRaw === null || vendaRaw === undefined) {
    return null;
  }

  const custo = typeof custoRaw === "number" ? custoRaw : parseMoneyLike(custoRaw);
  const venda = typeof vendaRaw === "number" ? vendaRaw : parseMoneyLike(vendaRaw);

  if (Number.isNaN(custo) || Number.isNaN(venda)) {
    return null;
  }

  const lucro = computeLucroBruto(venda, custo);
  if (lucro === null) {
    return null;
  }

  return `Margem esperada: R$ ${lucro.toFixed(2).replace(".", ",")}`;
};
