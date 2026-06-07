-- CreateEnum
CREATE TYPE "DespesaCategoria" AS ENUM ('MARKETING', 'PLATAFORMAS', 'EMBALAGEM', 'OUTROS');

-- CreateTable
CREATE TABLE "BrechoDespesa" (
    "id" TEXT NOT NULL,
    "brechoId" TEXT NOT NULL,
    "categoria" "DespesaCategoria" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,
    "dataCompetencia" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrechoDespesa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrechoDespesa_brechoId_dataCompetencia_idx" ON "BrechoDespesa"("brechoId", "dataCompetencia");

-- AddForeignKey
ALTER TABLE "BrechoDespesa" ADD CONSTRAINT "BrechoDespesa_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Remessa" ADD COLUMN "freteCustoLoja" DECIMAL(10,2);
ALTER TABLE "Remessa" ADD COLUMN "embalagemCusto" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN "freteCustoLoja" DECIMAL(10,2);
ALTER TABLE "Venda" ADD COLUMN "embalagemCusto" DECIMAL(10,2);
