-- CreateEnum
CREATE TYPE "BrechoStatus" AS ENUM ('ATIVO', 'TRIAL', 'SUSPENSO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DONO', 'OPERADOR');

-- AlterTable
ALTER TABLE "Brecho" ADD COLUMN "slug" TEXT;
ALTER TABLE "Brecho" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "Brecho" ADD COLUMN "status" "BrechoStatus" NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "Brecho" ADD COLUMN "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "isFounder" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrechoMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brechoId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DONO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrechoMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "ultimoBrechoId" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogadoEm" TIMESTAMP(3),

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsBrechoDia" (
    "id" TEXT NOT NULL,
    "brechoId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "pecasCadastradas" INTEGER NOT NULL DEFAULT 0,
    "pecasVendidas" INTEGER NOT NULL DEFAULT 0,
    "faturamentoBruto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estoqueDisponivel" INTEGER NOT NULL DEFAULT 0,
    "estoqueReservado" INTEGER NOT NULL DEFAULT 0,
    "estoqueIndisponivel" INTEGER NOT NULL DEFAULT 0,
    "pecasParadas30d" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsBrechoDia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsCategoriaDia" (
    "id" TEXT NOT NULL,
    "brechoId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "subcategoria" TEXT,
    "pecasCadastradas" INTEGER NOT NULL DEFAULT 0,
    "pecasVendidas" INTEGER NOT NULL DEFAULT 0,
    "faturamentoBruto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsCategoriaDia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brecho_slug_key" ON "Brecho"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_telefone_key" ON "User"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "BrechoMembership_userId_brechoId_key" ON "BrechoMembership"("userId", "brechoId");

-- CreateIndex
CREATE INDEX "BrechoMembership_brechoId_role_idx" ON "BrechoMembership"("brechoId", "role");

-- CreateIndex
CREATE INDEX "BrechoMembership_userId_ativo_idx" ON "BrechoMembership"("userId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiraEm_idx" ON "AuthSession"("userId", "expiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsBrechoDia_brechoId_data_key" ON "AnalyticsBrechoDia"("brechoId", "data");

-- CreateIndex
CREATE INDEX "AnalyticsBrechoDia_data_idx" ON "AnalyticsBrechoDia"("data");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsCategoriaDia_brechoId_data_categoria_subcategoria_key" ON "AnalyticsCategoriaDia"("brechoId", "data", "categoria", "subcategoria");

-- CreateIndex
CREATE INDEX "AnalyticsCategoriaDia_data_categoria_idx" ON "AnalyticsCategoriaDia"("data", "categoria");

-- AddForeignKey
ALTER TABLE "BrechoMembership" ADD CONSTRAINT "BrechoMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrechoMembership" ADD CONSTRAINT "BrechoMembership_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsBrechoDia" ADD CONSTRAINT "AnalyticsBrechoDia_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsCategoriaDia" ADD CONSTRAINT "AnalyticsCategoriaDia_brechoId_fkey" FOREIGN KEY ("brechoId") REFERENCES "Brecho"("id") ON DELETE CASCADE ON UPDATE CASCADE;
