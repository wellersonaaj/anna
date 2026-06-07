export type CostAllocation = {
  freteCustoLoja: number | null;
  embalagemCusto: number | null;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const allocateAmount = (
  items: Array<{ id: string; weight: number }>,
  total: number | null | undefined
): Map<string, number | null> => {
  const result = new Map<string, number | null>();

  if (total === null || total === undefined || total <= 0) {
    for (const item of items) {
      result.set(item.id, null);
    }
    return result;
  }

  const weightSum = items.reduce((sum, item) => sum + item.weight, 0);
  let allocated = 0;

  items.forEach((item, index) => {
    if (index === items.length - 1) {
      result.set(item.id, roundMoney(total - allocated));
      return;
    }

    const share = weightSum > 0 ? item.weight / weightSum : 1 / items.length;
    const portion = roundMoney(total * share);
    allocated += portion;
    result.set(item.id, portion);
  });

  return result;
};

export const allocateShipmentCosts = (
  items: Array<{ id: string; precoVenda: number }>,
  freteCustoLoja?: number | null,
  embalagemCusto?: number | null
): Map<string, CostAllocation> => {
  const weights = items.map((item) => ({
    id: item.id,
    weight: item.precoVenda > 0 ? item.precoVenda : 1
  }));

  const freteById = allocateAmount(weights, freteCustoLoja);
  const embalagemById = allocateAmount(weights, embalagemCusto);

  return new Map(
    items.map((item) => [
      item.id,
      {
        freteCustoLoja: freteById.get(item.id) ?? null,
        embalagemCusto: embalagemById.get(item.id) ?? null
      }
    ])
  );
};
