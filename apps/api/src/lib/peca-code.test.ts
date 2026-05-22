import { describe, expect, it } from "vitest";
import { formatPecaCodigo } from "../lib/peca-code.js";

describe("formatPecaCodigo", () => {
  it("formats year and sequence with padding", () => {
    expect(formatPecaCodigo(2026, 1)).toBe("26-001");
    expect(formatPecaCodigo(2026, 999)).toBe("26-999");
    expect(formatPecaCodigo(2026, 1000)).toBe("26-1000");
  });
});
