-- AlterTable
ALTER TABLE "Peca" ADD COLUMN     "acervoNome" TEXT;

-- CreateIndex
CREATE INDEX "Peca_brechoId_acervoTipo_acervoNome_idx" ON "Peca"("brechoId", "acervoTipo", "acervoNome");
