-- AlterTable
ALTER TABLE "Peca" ADD COLUMN "fotoCapaId" TEXT;
ALTER TABLE "Peca" ADD COLUMN "fotoCapaManual" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Peca_fotoCapaId_key" ON "Peca"("fotoCapaId");

-- AddForeignKey
ALTER TABLE "Peca" ADD CONSTRAINT "Peca_fotoCapaId_fkey" FOREIGN KEY ("fotoCapaId") REFERENCES "PecaFoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
