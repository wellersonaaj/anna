import { PrismaClient, StatusPeca } from "@prisma/client";

const prisma = new PrismaClient();

const main = async () => {
  const vendas = await prisma.venda.findMany({
    where: {
      sacolaClienteId: null,
      entrega: null,
      peca: { status: StatusPeca.VENDIDO }
    },
    include: { peca: { select: { brechoId: true } } }
  });

  const groups = new Map<string, typeof vendas>();
  for (const venda of vendas) {
    const key = `${venda.peca.brechoId}:${venda.clienteId}`;
    const list = groups.get(key) ?? [];
    list.push(venda);
    groups.set(key, list);
  }

  for (const [key, groupVendas] of groups) {
    const parts = key.split(":");
    const brechoId = parts[0];
    const clienteId = parts[1];
    if (!brechoId || !clienteId) continue;
    let sacola = await prisma.sacolaCliente.findFirst({
      where: { brechoId, clienteId, status: "ABERTA" }
    });

    if (!sacola) {
      sacola = await prisma.sacolaCliente.create({
        data: { brechoId, clienteId, status: "ABERTA" }
      });
    }

    for (const venda of groupVendas) {
      await prisma.venda.update({
        where: { id: venda.id },
        data: { sacolaClienteId: sacola.id }
      });
    }

    console.log(`Sacola ${sacola.id}: ${groupVendas.length} vendas vinculadas.`);
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
