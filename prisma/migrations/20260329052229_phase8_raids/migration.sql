-- CreateEnum
CREATE TYPE "RaidStatus" AS ENUM ('active', 'verification_pending', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "RaidGeneratedBy" AS ENUM ('system');

-- AlterEnum
ALTER TYPE "XpLedgerSource" ADD VALUE 'raid_completion';

-- AlterTable
ALTER TABLE "user_attribute_history" ADD COLUMN     "raid_id" UUID;

-- AlterTable
ALTER TABLE "xp_ledger" ADD COLUMN     "raid_id" UUID;

-- CreateTable
CREATE TABLE "raid_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL,
    "reward_xp_base" INTEGER NOT NULL,
    "expected_duration_days" INTEGER NOT NULL DEFAULT 14,
    "default_attribute_code" "AttributeCode",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "raid_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raid_template_objectives" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "objective_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL DEFAULT 1,
    "requires_verification" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "raid_template_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raids" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "template_id" UUID,
    "status" "RaidStatus" NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL,
    "reward_xp_base" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "generated_by" "RaidGeneratedBy" NOT NULL DEFAULT 'system',
    "verification_summary" TEXT,
    "artifact_reference" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "raids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raid_objectives" (
    "id" UUID NOT NULL,
    "raid_id" UUID NOT NULL,
    "template_objective_id" UUID,
    "objective_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL DEFAULT 1,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "requires_verification" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "raid_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raid_attribute_map" (
    "raid_id" UUID NOT NULL,
    "attribute_code" "AttributeCode" NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.0,

    CONSTRAINT "raid_attribute_map_pkey" PRIMARY KEY ("raid_id","attribute_code")
);

-- CreateTable
CREATE TABLE "raid_logs" (
    "id" UUID NOT NULL,
    "raid_id" UUID NOT NULL,
    "objective_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "delta_progress" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "logged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raid_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raid_templates_code_key" ON "raid_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "raid_template_objectives_template_id_objective_code_key" ON "raid_template_objectives"("template_id", "objective_code");

-- CreateIndex
CREATE INDEX "raids_user_id_status_idx" ON "raids"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "raids_user_id_active_key" ON "raids"("user_id") WHERE "status" IN ('active', 'verification_pending');

-- CreateIndex
CREATE UNIQUE INDEX "raid_objectives_raid_id_objective_code_key" ON "raid_objectives"("raid_id", "objective_code");

-- CreateIndex
CREATE INDEX "raid_logs_raid_id_objective_id_logged_at_idx" ON "raid_logs"("raid_id", "objective_id", "logged_at");

-- AddForeignKey
ALTER TABLE "raid_templates" ADD CONSTRAINT "raid_templates_default_attribute_code_fkey" FOREIGN KEY ("default_attribute_code") REFERENCES "attributes"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_template_objectives" ADD CONSTRAINT "raid_template_objectives_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "raid_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raids" ADD CONSTRAINT "raids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raids" ADD CONSTRAINT "raids_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "raid_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_objectives" ADD CONSTRAINT "raid_objectives_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "raids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_objectives" ADD CONSTRAINT "raid_objectives_template_objective_id_fkey" FOREIGN KEY ("template_objective_id") REFERENCES "raid_template_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_attribute_map" ADD CONSTRAINT "raid_attribute_map_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "raids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_attribute_map" ADD CONSTRAINT "raid_attribute_map_attribute_code_fkey" FOREIGN KEY ("attribute_code") REFERENCES "attributes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_logs" ADD CONSTRAINT "raid_logs_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "raids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_logs" ADD CONSTRAINT "raid_logs_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "raid_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_logs" ADD CONSTRAINT "raid_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "raids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attribute_history" ADD CONSTRAINT "user_attribute_history_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "raids"("id") ON DELETE SET NULL ON UPDATE CASCADE;
