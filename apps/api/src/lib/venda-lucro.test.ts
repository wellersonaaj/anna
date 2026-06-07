import { describe, expect, it } from "vitest";
import { computeLucroBruto, computeLucroOperacional, computeMargemBrutaPct } from "./venda-lucro.js";

describe("computeLucroBruto", () => {
  it("returns sale price minus cost when cost is set", () => {
    expect(computeLucroBruto(75, 30)).toBe(45);
  });

  it("returns null when cost is missing", () => {
    expect(computeLucroBruto(75, null)).toBeNull();
    expect(computeLucroBruto(75, undefined)).toBeNull();
  });
});

describe("computeLucroOperacional", () => {
  it("subtracts store freight and packaging from gross profit", () => {
    expect(computeLucroOperacional(100, 40, 10, 5)).toBe(45);
  });

  it("returns null when piece cost is missing", () => {
    expect(computeLucroOperacional(100, null, 10, 5)).toBeNull();
  });
});

describe("computeMargemBrutaPct", () => {
  it("returns percentage of gross profit over revenue", () => {
    expect(computeMargemBrutaPct(45, 75)).toBe(60);
  });

  it("returns null when revenue is zero", () => {
    expect(computeMargemBrutaPct(0, 0)).toBeNull();
  });
});
