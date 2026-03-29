-- CreateEnum
CREATE TYPE "DungeonStatus" AS ENUM ('active', 'completed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "DungeonGeneratedBy" AS ENUM ('system');

-- AlterEnum
ALTER TYPE "XpLedgerSource" ADD VALUE 'dungeon_completion';

-- AlterTable
ALTER TABLE "user_attribute_history" ADD COLUMN     "dungeon_id" UUID;

-- AlterTable
ALTER TABLE "xp_ledger" ADD COLUMN     "dungeon_id" UUID;

-- CreateTable
CREATE TABLE "dungeon_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL,
    "reward_xp_base" INTEGER NOT NULL,
    "expected_duration_days" INTEGER NOT NULL DEFAULT 7,
    "default_attribute_code" "AttributeCode",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dungeon_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dungeon_template_objectives" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "objective_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "dungeon_template_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dungeons" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "template_id" UUID,
    "status" "DungeonStatus" NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL,
    "reward_xp_base" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "generated_by" "DungeonGeneratedBy" NOT NULL DEFAULT 'system',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dungeons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dungeon_objectives" (
    "id" UUID NOT NULL,
    "dungeon_id" UUID NOT NULL,
    "template_objective_id" UUID,
    "objective_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL DEFAULT 1,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "dungeon_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dungeon_attribute_map" (
    "dungeon_id" UUID NOT NULL,
    "attribute_code" "AttributeCode" NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.0,

    CONSTRAINT "dungeon_attribute_map_pkey" PRIMARY KEY ("dungeon_id","attribute_code")
);

-- CreateTable
CREATE TABLE "dungeon_logs" (
    "id" UUID NOT NULL,
    "dungeon_id" UUID NOT NULL,
    "objective_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "delta_progress" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "logged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dungeon_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dungeon_templates_code_key" ON "dungeon_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dungeon_template_objectives_template_id_objective_code_key" ON "dungeon_template_objectives"("template_id", "objective_code");

-- CreateIndex
CREATE INDEX "dungeons_user_id_status_idx" ON "dungeons"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dungeons_user_id_active_key" ON "dungeons"("user_id") WHERE "status" = 'active';

-- CreateIndex
CREATE UNIQUE INDEX "dungeon_objectives_dungeon_id_objective_code_key" ON "dungeon_objectives"("dungeon_id", "objective_code");

-- CreateIndex
CREATE INDEX "dungeon_logs_dungeon_id_objective_id_logged_at_idx" ON "dungeon_logs"("dungeon_id", "objective_id", "logged_at");

-- AddForeignKey
ALTER TABLE "dungeon_templates" ADD CONSTRAINT "dungeon_templates_default_attribute_code_fkey" FOREIGN KEY ("default_attribute_code") REFERENCES "attributes"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_template_objectives" ADD CONSTRAINT "dungeon_template_objectives_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "dungeon_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeons" ADD CONSTRAINT "dungeons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeons" ADD CONSTRAINT "dungeons_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "dungeon_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_objectives" ADD CONSTRAINT "dungeon_objectives_dungeon_id_fkey" FOREIGN KEY ("dungeon_id") REFERENCES "dungeons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_objectives" ADD CONSTRAINT "dungeon_objectives_template_objective_id_fkey" FOREIGN KEY ("template_objective_id") REFERENCES "dungeon_template_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_attribute_map" ADD CONSTRAINT "dungeon_attribute_map_dungeon_id_fkey" FOREIGN KEY ("dungeon_id") REFERENCES "dungeons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_attribute_map" ADD CONSTRAINT "dungeon_attribute_map_attribute_code_fkey" FOREIGN KEY ("attribute_code") REFERENCES "attributes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_logs" ADD CONSTRAINT "dungeon_logs_dungeon_id_fkey" FOREIGN KEY ("dungeon_id") REFERENCES "dungeons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_logs" ADD CONSTRAINT "dungeon_logs_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "dungeon_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_logs" ADD CONSTRAINT "dungeon_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_dungeon_id_fkey" FOREIGN KEY ("dungeon_id") REFERENCES "dungeons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attribute_history" ADD CONSTRAINT "user_attribute_history_dungeon_id_fkey" FOREIGN KEY ("dungeon_id") REFERENCES "dungeons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
