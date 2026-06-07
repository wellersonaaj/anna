export const resolveFreteInclusoValor = (
  freteIncluso: boolean,
  precoVenda: number,
  freteInclusoValor?: number | null
): number | null => {
  if (!freteIncluso) {
    return null;
  }

  if (freteInclusoValor === undefined || freteInclusoValor === null) {
    return null;
  }

  if (freteInclusoValor <= 0) {
    throw new Error("Frete incluso deve ser maior que zero.");
  }

  if (freteInclusoValor > precoVenda) {
    throw new Error("Frete incluso não pode ser maior que o preço da venda.");
  }

  return freteInclusoValor;
};
