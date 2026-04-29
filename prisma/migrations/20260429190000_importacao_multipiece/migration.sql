-- CreateEnum
CREATE TYPE "ImportacaoLoteStatus" AS ENUM (
  'RECEBENDO_FOTOS',
  'AGRUPANDO',
  'REVISAR_GRUPOS',
  'CLASSIFICANDO',
  'REVISAR_DADOS',
  'CONCLUIDO',
  'ERRO',
  'ABANDONADO'
);

-- CreateEnum
CREATE TYPE "ImportacaoFotoUploadStatus" AS ENUM ('PENDENTE', 'ENVIADA', 'ERRO');

-- CreateEnum
CREATE TYPE "ImportacaoGrupoStatus" AS ENUM ('PROPOSTO', 'CONFIRMADO');

-- CreateEnum
CREATE TYPE "ImportacaoRascunhoStatus" AS ENUM ('RASCUNHO', 'PUBLICADO', 'ERRO_CLASSIFICACAO');

-- CreateTable
CREATE TABLE "ImportacaoLote" (
    "id" TEXT NOT NULL,
    "brechoId" TEXT NOT NULL,
    "status" "ImportacaoLoteStatus" NOT NULL DEFAULT 'RECEBENDO_FOTOS',
    "totalFotos" INTEGER NOT NULL DEFAULT 0,
    "totalGrupos" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportacaoLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportacaoFoto" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "ordemOriginal" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanhoBytes" INTEGER,
    "nomeArquivo" TEXT,
    "source" TEXT,
    "statusUpload" "ImportacaoFotoUploadStatus" NOT NULL DEFAULT 'PENDENTE',
    "ignorada" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportacaoFoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportacaoGrupo" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "status" "ImportacaoGrupoStatus" NOT NULL DEFAULT 'PROPOSTO',
    "confiancaAgrupamento" DOUBLE PRECISION,
    "motivoRevisao" TEXT,
    "ordemInicio" INTEGER NOT NULL,
    "ordemFim" INTEGER NOT NULL,
    "temFotosNaoContiguas" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportacaoGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportacaoGrupoFoto" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "fotoId" TEXT NOT NULL,
    "ordemNoGrupo" INTEGER NOT NULL,

    CONSTRAINT "ImportacaoGrupoFoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportacaoRascunho" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "draftAnalysisId" TEXT,
    "formValuesJson" JSONB,
    "status" "ImportacaoRascunhoStatus" NOT NULL DEFAULT 'RASCUNHO',
    "pecaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportacaoRascunho_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AIDraftAnalysis" ADD COLUMN "importacaoLoteId" TEXT,
ADD COLUMN "importacaoGrupoId" TEXT;

-- CreateIndex
CREATE INDEX "ImportacaoLote_brechoId_status_criadoEm_idx" ON "ImportacaoLote"("brechoId", "status", "criadoEm");

-- CreateIndex
CREATE INDEX "ImportacaoFoto_loteId_ordemOriginal_idx" ON "ImportacaoFoto"("loteId", "ordemOriginal");

-- CreateIndex
CREATE UNIQUE INDEX "ImportacaoFoto_loteId_ordemOriginal_key" ON "ImportacaoFoto"("loteId", "ordemOriginal");

-- CreateIndex
CREATE INDEX "ImportacaoGrupo_loteId_ordem_idx" ON "ImportacaoGrupo"("loteId", "ordem");

-- CreateIndex
CREATE INDEX "ImportacaoGrupoFoto_fotoId_idx" ON "ImportacaoGrupoFoto"("fotoId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportacaoGrupoFoto_grupoId_fotoId_key" ON "ImportacaoGrupoFoto"("grupoId", "fotoId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportacaoGrupoFoto_grupoId_ordemNoGrupo_key" ON "ImportacaoGrupoFoto"("grupoId", "ordemNoGrupo");

-- CreateIndex
CREATE UNIQUE INDEX "ImportacaoRascunho_grupoId_key" ON "ImportacaoRascunho"("grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportacaoRascunho_draftAnalysisId_key" ON "ImportacaoRascunho"("draftAnalysisId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportacaoRascunho_pecaId_key" ON "ImportacaoRascunho"("pecaId");

-- CreateIndex
CREATE INDEX "AIDraftAnalysis_importacaoLoteId_idx" ON "AIDraftAnalysis"("importacaoLoteId");

-- CreateIndex
CREATE INDEX "AIDraftAnalysis_importacaoGrupoId_idx" ON "AIDraftAnalysis"("importacaoGrupoId");

-- AddForeignKey
ALTER TABLE "ImportacaoLote" ADD CONSTRAINT "ImportacaoLote_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacaoFoto" ADD CONSTRAINT "ImportacaoFoto_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "ImportacaoLote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacaoGrupo" ADD CONSTRAINT "ImportacaoGrupo_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "ImportacaoLote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacaoGrupoFoto" ADD CONSTRAINT "ImportacaoGrupoFoto_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "ImportacaoGrupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacaoGrupoFoto" ADD CONSTRAINT "ImportacaoGrupoFoto_fotoId_fkey" FOREIGN KEY ("fotoId") REFERENCES "ImportacaoFoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacaoRascunho" ADD CONSTRAINT "ImportacaoRascunho_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "ImportacaoGrupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacaoRascunho" ADD CONSTRAINT "ImportacaoRascunho_draftAnalysisId_fkey" FOREIGN KEY ("draftAnalysisId") REFERENCES "AIDraftAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacaoRascunho" ADD CONSTRAINT "ImportacaoRascunho_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "Peca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDraftAnalysis" ADD CONSTRAINT "AIDraftAnalysis_importacaoLoteId_fkey" FOREIGN KEY ("importacaoLoteId") REFERENCES "ImportacaoLote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDraftAnalysis" ADD CONSTRAINT "AIDraftAnalysis_importacaoGrupoId_fkey" FOREIGN KEY ("importacaoGrupoId") REFERENCES "ImportacaoGrupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
