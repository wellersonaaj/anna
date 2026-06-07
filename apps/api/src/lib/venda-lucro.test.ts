import { describe, expect, it } from "vitest";
import { computeLucroBruto, computeMargemBrutaPct } from "./venda-lucro.js";

describe("computeLucroBruto", () => {
  it("returns sale price minus cost when cost is set", () => {
    expect(computeLucroBruto(75, 30)).toBe(45);
  });

  it("returns null when cost is missing", () => {
    expect(computeLucroBruto(75, null)).toBeNull();
    expect(computeLucroBruto(75, undefined)).toBeNull();
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
