import { describe, expect, it } from "vitest";
import { allocateShipmentCosts } from "./venda-custo-envio.js";

describe("allocateShipmentCosts", () => {
  it("splits costs proportionally by sale price", () => {
    const allocation = allocateShipmentCosts(
      [
        { id: "a", precoVenda: 30 },
        { id: "b", precoVenda: 70 }
      ],
      10,
      5
    );

    expect(allocation.get("a")).toEqual({ freteCustoLoja: 3, embalagemCusto: 1.5 });
    expect(allocation.get("b")).toEqual({ freteCustoLoja: 7, embalagemCusto: 3.5 });
  });

  it("returns null costs when totals are not provided", () => {
    const allocation = allocateShipmentCosts([{ id: "a", precoVenda: 50 }], null, undefined);
    expect(allocation.get("a")).toEqual({ freteCustoLoja: null, embalagemCusto: null });
  });
});
