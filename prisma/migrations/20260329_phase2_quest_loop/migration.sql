-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('daily', 'weekly', 'event');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('active', 'completed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "QuestCategory" AS ENUM ('daily', 'weekly', 'event', 'dungeon_objective', 'raid_objective');

-- CreateEnum
CREATE TYPE "QuestDifficulty" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "QuestAssignment" AS ENUM ('mandatory', 'optional', 'stretch');

-- CreateEnum
CREATE TYPE "QuestGeneratedBy" AS ENUM ('system', 'ai', 'template');

-- CreateEnum
CREATE TYPE "QuestLogIntensity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "XpLedgerSource" AS ENUM ('quest_completion');

-- CreateTable
CREATE TABLE "quest_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quest_category" "QuestCategory" NOT NULL,
    "quest_type" "QuestType" NOT NULL,
    "assignment_kind" "QuestAssignment" NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL,
    "reward_xp_base" INTEGER NOT NULL,
    "default_attribute_code" "AttributeCode",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quest_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "template_id" UUID,
    "quest_type" "QuestType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'active',
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "is_stretch" BOOLEAN NOT NULL DEFAULT false,
    "reward_xp_base" INTEGER NOT NULL,
    "assigned_date" DATE NOT NULL,
    "due_at" TIMESTAMPTZ(6),
    "generated_by" "QuestGeneratedBy" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_attribute_map" (
    "quest_id" UUID NOT NULL,
    "attribute_code" "AttributeCode" NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.0,

    CONSTRAINT "quest_attribute_map_pkey" PRIMARY KEY ("quest_id","attribute_code")
);

-- CreateTable
CREATE TABLE "quest_logs" (
    "id" UUID NOT NULL,
    "quest_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "intensity" "QuestLogIntensity",
    "note" TEXT,
    "logged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_ledger" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "quest_id" UUID,
    "source" "XpLedgerSource" NOT NULL,
    "delta_xp" INTEGER NOT NULL,
    "total_xp_after" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_attribute_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "quest_id" UUID,
    "attribute_code" "AttributeCode" NOT NULL,
    "delta" DECIMAL(6,2) NOT NULL,
    "previous_value" DECIMAL(6,2) NOT NULL,
    "new_value" DECIMAL(6,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_attribute_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quest_templates_code_key" ON "quest_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "quests_user_id_assigned_date_template_id_key" ON "quests"("user_id", "assigned_date", "template_id");

-- CreateIndex
CREATE INDEX "quests_user_id_assigned_date_quest_type_idx" ON "quests"("user_id", "assigned_date", "quest_type");

-- CreateIndex
CREATE UNIQUE INDEX "quest_logs_quest_id_key" ON "quest_logs"("quest_id");

-- CreateIndex
CREATE INDEX "quest_logs_quest_id_user_id_idx" ON "quest_logs"("quest_id", "user_id");

-- CreateIndex
CREATE INDEX "xp_ledger_user_id_created_at_idx" ON "xp_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "user_attribute_history_user_id_created_at_idx" ON "user_attribute_history"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "quest_templates" ADD CONSTRAINT "quest_templates_default_attribute_code_fkey" FOREIGN KEY ("default_attribute_code") REFERENCES "attributes"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "quest_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_attribute_map" ADD CONSTRAINT "quest_attribute_map_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_attribute_map" ADD CONSTRAINT "quest_attribute_map_attribute_code_fkey" FOREIGN KEY ("attribute_code") REFERENCES "attributes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_logs" ADD CONSTRAINT "quest_logs_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_logs" ADD CONSTRAINT "quest_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attribute_history" ADD CONSTRAINT "user_attribute_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attribute_history" ADD CONSTRAINT "user_attribute_history_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attribute_history" ADD CONSTRAINT "user_attribute_history_attribute_code_fkey" FOREIGN KEY ("attribute_code") REFERENCES "attributes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attribute_history" ADD CONSTRAINT "user_attribute_history_user_id_attribute_code_fkey" FOREIGN KEY ("user_id", "attribute_code") REFERENCES "user_attributes"("user_id", "attribute_code") ON DELETE CASCADE ON UPDATE CASCADE;
