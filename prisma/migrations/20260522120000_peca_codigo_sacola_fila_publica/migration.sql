-- CreateEnum
CREATE TYPE "SacolaStatus" AS ENUM ('ABERTA', 'FECHADA');

-- AlterTable
ALTER TABLE "Peca" ADD COLUMN "codigo" TEXT;

-- CreateTable
CREATE TABLE "PecaCodigoSequencia" (
    "brechoId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "ultimoNum" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PecaCodigoSequencia_pkey" PRIMARY KEY ("brechoId","ano")
);

-- CreateTable
CREATE TABLE "SacolaCliente" (
    "id" TEXT NOT NULL,
    "brechoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "status" "SacolaStatus" NOT NULL DEFAULT 'ABERTA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SacolaCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Remessa" (
    "id" TEXT NOT NULL,
    "sacolaClienteId" TEXT NOT NULL,
    "codigoRastreio" TEXT,
    "freteTexto" TEXT,
    "freteValor" DECIMAL(10,2),
    "enviadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Remessa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PecaFilaLink" (
    "id" TEXT NOT NULL,
    "pecaId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogadoEm" TIMESTAMP(3),

    CONSTRAINT "PecaFilaLink_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN "sacolaClienteId" TEXT,
ADD COLUMN "remessaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Peca_brechoId_codigo_key" ON "Peca"("brechoId", "codigo");

-- CreateIndex
CREATE INDEX "SacolaCliente_brechoId_status_idx" ON "SacolaCliente"("brechoId", "status");

-- CreateIndex
CREATE INDEX "SacolaCliente_clienteId_status_idx" ON "SacolaCliente"("clienteId", "status");

-- Partial unique: one open bag per client per brecho
CREATE UNIQUE INDEX "SacolaCliente_brecho_cliente_aberta_unique"
ON "SacolaCliente"("brechoId", "clienteId")
WHERE "status" = 'ABERTA';

-- CreateIndex
CREATE UNIQUE INDEX "PecaFilaLink_pecaId_key" ON "PecaFilaLink"("pecaId");

-- CreateIndex
CREATE UNIQUE INDEX "PecaFilaLink_tokenHash_key" ON "PecaFilaLink"("tokenHash");

-- AddForeignKey
ALTER TABLE "PecaCodigoSequencia" ADD CONSTRAINT "PecaCodigoSequencia_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SacolaCliente" ADD CONSTRAINT "SacolaCliente_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SacolaCliente" ADD CONSTRAINT "SacolaCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remessa" ADD CONSTRAINT "Remessa_sacolaClienteId_fkey" FOREIGN KEY ("sacolaClienteId") REFERENCES "SacolaCliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_sacolaClienteId_fkey" FOREIGN KEY ("sacolaClienteId") REFERENCES "SacolaCliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_remessaId_fkey" FOREIGN KEY ("remessaId") REFERENCES "Remessa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PecaFilaLink" ADD CONSTRAINT "PecaFilaLink_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "Peca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
