import { describe, expect, it } from "vitest";
import { resolveFreteInclusoValor } from "./venda-frete.js";

describe("resolveFreteInclusoValor", () => {
  it("returns null when freight is not included", () => {
    expect(resolveFreteInclusoValor(false, 45, 15)).toBeNull();
  });

  it("returns null when value is omitted", () => {
    expect(resolveFreteInclusoValor(true, 45)).toBeNull();
  });

  it("returns value when valid", () => {
    expect(resolveFreteInclusoValor(true, 45, 15)).toBe(15);
  });

  it("rejects freight greater than sale price", () => {
    expect(() => resolveFreteInclusoValor(true, 45, 50)).toThrow(
      "Frete incluso não pode ser maior que o preço da venda."
    );
  });
});
