export const computeLucroBruto = (
  precoVenda: number,
  precoCusto: number | null | undefined
): number | null => {
  if (precoCusto === null || precoCusto === undefined) {
    return null;
  }

  return precoVenda - precoCusto;
};

export const computeMargemBrutaPct = (
  lucroBruto: number,
  faturamentoPecas: number
): number | null => {
  if (faturamentoPecas <= 0) {
    return null;
  }

  return (lucroBruto / faturamentoPecas) * 100;
};

export const computeLucroOperacional = (
  precoVenda: number,
  precoCusto: number | null | undefined,
  freteCustoLoja: number | null | undefined,
  embalagemCusto: number | null | undefined
): number | null => {
  const lucroBruto = computeLucroBruto(precoVenda, precoCusto);
  if (lucroBruto === null) {
    return null;
  }

  const frete = freteCustoLoja ?? 0;
  const embalagem = embalagemCusto ?? 0;
  return lucroBruto - frete - embalagem;
};
