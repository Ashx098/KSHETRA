-- CreateEnum
CREATE TYPE "AiGenerationType" AS ENUM ('daily_quest_plan');

-- CreateEnum
CREATE TYPE "AiGenerationStatus" AS ENUM ('accepted', 'rejected', 'fallback_used', 'failed');

-- CreateTable
CREATE TABLE "ai_generations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "generation_type" "AiGenerationType" NOT NULL,
    "status" "AiGenerationStatus" NOT NULL,
    "provider" TEXT,
    "model_name" TEXT,
    "request_payload" JSONB NOT NULL,
    "raw_response_text" TEXT,
    "validated_output" JSONB,
    "rejection_reasons" JSONB,
    "created_quests_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "quests" ADD COLUMN "ai_generation_id" UUID;

-- CreateIndex
CREATE INDEX "ai_generations_user_id_created_at_idx" ON "ai_generations"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_ai_generation_id_fkey" FOREIGN KEY ("ai_generation_id") REFERENCES "ai_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
