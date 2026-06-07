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
