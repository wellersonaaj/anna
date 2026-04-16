-- CreateTable
CREATE TABLE "PecaFotoLote" (
    "id" TEXT NOT NULL,
    "pecaId" TEXT NOT NULL,
    "textoNota" TEXT,
    "audioUrl" TEXT,
    "transcricaoAudio" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PecaFotoLote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PecaFotoLote_pecaId_criadoEm_idx" ON "PecaFotoLote"("pecaId", "criadoEm");

-- AddForeignKey
ALTER TABLE "PecaFotoLote" ADD CONSTRAINT "PecaFotoLote_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "Peca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "PecaFoto" ADD COLUMN "loteId" TEXT;

-- AddForeignKey
ALTER TABLE "PecaFoto" ADD CONSTRAINT "PecaFoto_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "PecaFotoLote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
