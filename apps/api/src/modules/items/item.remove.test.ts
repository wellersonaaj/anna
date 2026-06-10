import type { PrismaClient } from "@prisma/client";
import { beforeAll, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/anna_test";

let itemService: typeof import("./item.service.js").itemService;

beforeAll(async () => {
  ({ itemService } = await import("./item.service.js"));
});

const createPrismaMock = (item: {
  id: string;
  status: "DISPONIVEL" | "INDISPONIVEL" | "RESERVADO" | "VENDIDO" | "ENTREGUE";
  venda: { id: string } | null;
} | null) => {
  const deleteFn = vi.fn().mockResolvedValue(undefined);
  const findFirstFn = vi.fn().mockResolvedValue(item);

  return {
    prisma: {
      peca: {
        findFirst: findFirstFn,
        delete: deleteFn
      }
    } as unknown as PrismaClient,
    deleteFn,
    findFirstFn
  };
};

describe("itemService.remove", () => {
  it("throws when item is not found", async () => {
    const { prisma, deleteFn } = createPrismaMock(null);

    await expect(itemService.remove(prisma, "brecho-1", "item-1")).rejects.toThrow("Item not found.");
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("throws when item status is VENDIDO", async () => {
    const { prisma, deleteFn } = createPrismaMock({
      id: "item-1",
      status: "VENDIDO",
      venda: { id: "venda-1" }
    });

    await expect(itemService.remove(prisma, "brecho-1", "item-1")).rejects.toThrow("Item cannot be deleted.");
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("throws when item status is ENTREGUE", async () => {
    const { prisma, deleteFn } = createPrismaMock({
      id: "item-1",
      status: "ENTREGUE",
      venda: { id: "venda-1" }
    });

    await expect(itemService.remove(prisma, "brecho-1", "item-1")).rejects.toThrow("Item cannot be deleted.");
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("throws when item has a linked sale", async () => {
    const { prisma, deleteFn } = createPrismaMock({
      id: "item-1",
      status: "RESERVADO",
      venda: { id: "venda-1" }
    });

    await expect(itemService.remove(prisma, "brecho-1", "item-1")).rejects.toThrow("Item cannot be deleted.");
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("deletes item when status is DISPONIVEL", async () => {
    const { prisma, deleteFn } = createPrismaMock({
      id: "item-1",
      status: "DISPONIVEL",
      venda: null
    });

    await itemService.remove(prisma, "brecho-1", "item-1");
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: "item-1" } });
  });

  it("deletes item when status is INDISPONIVEL", async () => {
    const { prisma, deleteFn } = createPrismaMock({
      id: "item-1",
      status: "INDISPONIVEL",
      venda: null
    });

    await itemService.remove(prisma, "brecho-1", "item-1");
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: "item-1" } });
  });

  it("deletes item when status is RESERVADO without sale", async () => {
    const { prisma, deleteFn } = createPrismaMock({
      id: "item-1",
      status: "RESERVADO",
      venda: null
    });

    await itemService.remove(prisma, "brecho-1", "item-1");
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: "item-1" } });
  });
});
