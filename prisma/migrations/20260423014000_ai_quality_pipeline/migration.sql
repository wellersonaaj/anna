-- AlterTable
ALTER TABLE "AIDraftAnalysis"
ADD COLUMN "fallbacksAppliedJson" JSONB,
ADD COLUMN "fieldConfidenceJson" JSONB,
ADD COLUMN "stage1Json" JSONB,
ADD COLUMN "stage1LatencyMs" INTEGER,
ADD COLUMN "stage1Tokens" INTEGER,
ADD COLUMN "stage2Json" JSONB,
ADD COLUMN "stage2LatencyMs" INTEGER,
ADD COLUMN "stage2Tokens" INTEGER;

-- AlterTable
ALTER TABLE "AIDraftFeedback"
ADD COLUMN "reasonCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
