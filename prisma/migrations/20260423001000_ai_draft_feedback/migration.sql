-- CreateEnum
CREATE TYPE "AIDraftHelpfulness" AS ENUM ('SIM', 'PARCIAL', 'NAO');

-- CreateTable
CREATE TABLE "AIDraftAnalysis" (
    "id" TEXT NOT NULL,
    "brechoId" TEXT NOT NULL,
    "textoContexto" TEXT,
    "imagensJson" JSONB NOT NULL,
    "sugestoesJson" JSONB NOT NULL,
    "metaJson" JSONB NOT NULL,
    "warningsJson" JSONB NOT NULL,
    "modeloUsado" TEXT NOT NULL,
    "tokensConsumidos" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIDraftAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIDraftFeedback" (
    "id" TEXT NOT NULL,
    "brechoId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "itemId" TEXT,
    "helpfulness" "AIDraftHelpfulness" NOT NULL,
    "finalValuesJson" JSONB NOT NULL,
    "changedFields" TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIDraftFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIDraftAnalysis_brechoId_criadoEm_idx" ON "AIDraftAnalysis"("brechoId", "criadoEm");

-- CreateIndex
CREATE INDEX "AIDraftFeedback_brechoId_criadoEm_idx" ON "AIDraftFeedback"("brechoId", "criadoEm");

-- CreateIndex
CREATE INDEX "AIDraftFeedback_analysisId_idx" ON "AIDraftFeedback"("analysisId");

-- CreateIndex
CREATE INDEX "AIDraftFeedback_itemId_idx" ON "AIDraftFeedback"("itemId");

-- AddForeignKey
ALTER TABLE "AIDraftAnalysis" ADD CONSTRAINT "AIDraftAnalysis_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDraftFeedback" ADD CONSTRAINT "AIDraftFeedback_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDraftFeedback" ADD CONSTRAINT "AIDraftFeedback_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "AIDraftAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDraftFeedback" ADD CONSTRAINT "AIDraftFeedback_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Peca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
