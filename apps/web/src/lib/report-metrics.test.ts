import { describe, expect, it } from "vitest";
import {
  formatLucroDisplay,
  getLucroCompleteness,
  buildFaturamentoFootnotes
} from "./report-metrics";

describe("getLucroCompleteness", () => {
  it("returns empty when all sales lack cost", () => {
    expect(getLucroCompleteness(5, 5)).toBe("empty");
  });

  it("returns partial when some sales lack cost", () => {
    expect(getLucroCompleteness(2, 5)).toBe("partial");
  });

  it("returns complete when every sale has cost", () => {
    expect(getLucroCompleteness(0, 5)).toBe("complete");
  });
});

describe("formatLucroDisplay", () => {
  const format = (n: number) => `R$ ${n.toFixed(2)}`;

  it("shows dash when incomplete", () => {
    expect(formatLucroDisplay(100, "empty", format)).toBe("—");
  });

  it("shows currency when partial or complete", () => {
    expect(formatLucroDisplay(100, "partial", format)).toBe("R$ 100.00");
  });
});

describe("buildFaturamentoFootnotes", () => {
  const format = (n: number) => `R$ ${n}`;

  it("clarifies pending shipments included in revenue", () => {
    const notes = buildFaturamentoFootnotes(
      {
        faturamentoPecas: 2860,
        freteInclusoInformado: 0,
        aguardandoEnvio: {
          count: 6,
          valorPecas: 1250,
          countNoPeriodo: 6,
          valorNoPeriodo: 1250
        }
      },
      format
    );

    expect(notes.some((n) => n.text.includes("não é um valor extra"))).toBe(true);
    expect(notes.some((n) => n.text.includes("já incluído no faturamento"))).toBe(true);
  });
});
