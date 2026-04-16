-- CreateEnum
CREATE TYPE "Plano" AS ENUM ('BASICO', 'MEDIO', 'PRO', 'TRIAL');

-- CreateEnum
CREATE TYPE "StatusPeca" AS ENUM ('DISPONIVEL', 'RESERVADO', 'VENDIDO', 'ENTREGUE', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('ROUPA_FEMININA', 'ROUPA_MASCULINA', 'CALCADO', 'ACESSORIO');

-- CreateEnum
CREATE TYPE "Condicao" AS ENUM ('OTIMO', 'BOM', 'REGULAR');

-- CreateEnum
CREATE TYPE "AcervoTipo" AS ENUM ('PROPRIO', 'CONSIGNACAO');

-- CreateEnum
CREATE TYPE "EmailJobStatus" AS ENUM ('PENDENTE', 'PROCESSANDO', 'ENVIADO', 'ERRO');

-- CreateTable
CREATE TABLE "Brecho" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "plano" "Plano" NOT NULL,
    "trialExpiraEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brecho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Peca" (
    "id" TEXT NOT NULL,
    "brechoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "subcategoria" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "estampa" BOOLEAN NOT NULL DEFAULT false,
    "condicao" "Condicao" NOT NULL,
    "tamanho" TEXT NOT NULL,
    "marca" TEXT,
    "precoVenda" DECIMAL(10,2),
    "acervoTipo" "AcervoTipo" NOT NULL DEFAULT 'PROPRIO',
    "consignanteId" TEXT,
    "status" "StatusPeca" NOT NULL DEFAULT 'DISPONIVEL',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Peca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PecaFoto" (
    "id" TEXT NOT NULL,
    "pecaId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "aiAmbiente" TEXT,
    "aiQualidade" TEXT,
    "aiConfianca" DOUBLE PRECISION,
    "aiPredicaoJson" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PecaFoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PecaStatusHistorico" (
    "id" TEXT NOT NULL,
    "pecaId" TEXT NOT NULL,
    "clienteId" TEXT,
    "status" "StatusPeca" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PecaStatusHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "brechoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" TEXT NOT NULL,
    "pecaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "precoVenda" DECIMAL(10,2) NOT NULL,
    "freteTexto" TEXT,
    "freteValor" DECIMAL(10,2),
    "ganhosTotal" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrega" (
    "id" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "codigoRastreio" TEXT,
    "entregueEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilaInteressado" (
    "id" TEXT NOT NULL,
    "pecaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "posicao" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilaInteressado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "pecaFotoId" TEXT NOT NULL,
    "nomeSugerido" TEXT,
    "categoria" TEXT,
    "subcategoria" TEXT,
    "corPrincipal" TEXT,
    "estampado" BOOLEAN NOT NULL DEFAULT false,
    "descricaoEstampa" TEXT,
    "condicao" TEXT,
    "confianca" DOUBLE PRECISION NOT NULL,
    "ambienteFoto" TEXT,
    "qualidadeFoto" TEXT,
    "multiplasPecas" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "textoContexto" TEXT,
    "transcricaoAudio" TEXT,
    "modeloUsado" TEXT NOT NULL,
    "tokensConsumidos" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailJob" (
    "id" TEXT NOT NULL,
    "brechoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" "EmailJobStatus" NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),

    CONSTRAINT "EmailJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brecho_telefone_key" ON "Brecho"("telefone");

-- CreateIndex
CREATE INDEX "Peca_brechoId_status_criadoEm_idx" ON "Peca"("brechoId", "status", "criadoEm");

-- CreateIndex
CREATE INDEX "Peca_brechoId_categoria_subcategoria_idx" ON "Peca"("brechoId", "categoria", "subcategoria");

-- CreateIndex
CREATE UNIQUE INDEX "PecaFoto_pecaId_ordem_key" ON "PecaFoto"("pecaId", "ordem");

-- CreateIndex
CREATE INDEX "PecaStatusHistorico_pecaId_criadoEm_idx" ON "PecaStatusHistorico"("pecaId", "criadoEm");

-- CreateIndex
CREATE INDEX "Cliente_brechoId_nome_idx" ON "Cliente"("brechoId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_pecaId_key" ON "Venda"("pecaId");

-- CreateIndex
CREATE UNIQUE INDEX "Entrega_vendaId_key" ON "Entrega"("vendaId");

-- CreateIndex
CREATE INDEX "FilaInteressado_pecaId_posicao_idx" ON "FilaInteressado"("pecaId", "posicao");

-- CreateIndex
CREATE UNIQUE INDEX "FilaInteressado_pecaId_clienteId_key" ON "FilaInteressado"("pecaId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "FilaInteressado_pecaId_posicao_key" ON "FilaInteressado"("pecaId", "posicao");

-- AddForeignKey
ALTER TABLE "Peca" ADD CONSTRAINT "Peca_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PecaFoto" ADD CONSTRAINT "PecaFoto_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "Peca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PecaStatusHistorico" ADD CONSTRAINT "PecaStatusHistorico_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "Peca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PecaStatusHistorico" ADD CONSTRAINT "PecaStatusHistorico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "Peca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaInteressado" ADD CONSTRAINT "FilaInteressado_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "Peca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaInteressado" ADD CONSTRAINT "FilaInteressado_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_pecaFotoId_fkey" FOREIGN KEY ("pecaFotoId") REFERENCES "PecaFoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailJob" ADD CONSTRAINT "EmailJob_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
