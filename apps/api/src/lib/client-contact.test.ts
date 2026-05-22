import { describe, expect, it } from "vitest";
import {
  isClientContactComplete,
  isClientContactEnriched,
  missingContactChannel
} from "@anna/shared";

describe("client contact helpers", () => {
  it("requires nome and one contact channel", () => {
    expect(isClientContactComplete({ nome: "Ana", whatsapp: "31999999999" })).toBe(true);
    expect(isClientContactComplete({ nome: "Ana", instagram: "ana" })).toBe(true);
    expect(isClientContactComplete({ nome: "Ana" })).toBe(false);
    expect(isClientContactComplete({ nome: "A", whatsapp: "319" })).toBe(false);
  });

  it("detects enriched profile", () => {
    expect(isClientContactEnriched({ nome: "Ana", whatsapp: "31", instagram: "ana" })).toBe(true);
    expect(isClientContactEnriched({ nome: "Ana", whatsapp: "31" })).toBe(false);
  });

  it("suggests missing channel", () => {
    expect(missingContactChannel({ nome: "Ana", instagram: "ana" })).toBe("whatsapp");
    expect(missingContactChannel({ nome: "Ana", whatsapp: "31" })).toBe("instagram");
    expect(missingContactChannel({ nome: "Ana", whatsapp: "31", instagram: "a" })).toBe(null);
  });
});
