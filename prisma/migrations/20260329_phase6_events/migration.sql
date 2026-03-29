-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('mystery', 'recovery');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('active', 'completed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "EventGeneratedBy" AS ENUM ('system');

-- AlterEnum
ALTER TYPE "XpLedgerSource" ADD VALUE IF NOT EXISTS 'event_completion';

-- CreateTable
CREATE TABLE "event_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL,
    "reward_xp_base" INTEGER NOT NULL,
    "default_attribute_code" "AttributeCode",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "event_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "template_id" UUID,
    "event_type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL,
    "reward_xp_base" INTEGER NOT NULL,
    "system_day" DATE NOT NULL,
    "triggered_at" TIMESTAMPTZ(6) NOT NULL,
    "available_from" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "generated_by" "EventGeneratedBy" NOT NULL DEFAULT 'system',
    "trigger_context" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attribute_map" (
    "event_id" UUID NOT NULL,
    "attribute_code" "AttributeCode" NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.0,

    CONSTRAINT "event_attribute_map_pkey" PRIMARY KEY ("event_id","attribute_code")
);

-- CreateTable
CREATE TABLE "event_logs" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "note" TEXT,
    "logged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "xp_ledger" ADD COLUMN "event_id" UUID;

-- AlterTable
ALTER TABLE "user_attribute_history" ADD COLUMN "event_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "event_templates_code_key" ON "event_templates"("code");

-- CreateIndex
CREATE INDEX "events_user_id_status_expires_at_idx" ON "events"("user_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "events_user_id_event_type_system_day_key" ON "events"("user_id", "event_type", "system_day");

-- CreateIndex
CREATE UNIQUE INDEX "events_user_id_active_key" ON "events"("user_id") WHERE "status" = 'active';

-- CreateIndex
CREATE INDEX "event_logs_event_id_user_id_idx" ON "event_logs"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_logs_event_id_key" ON "event_logs"("event_id");

-- AddForeignKey
ALTER TABLE "event_templates" ADD CONSTRAINT "event_templates_default_attribute_code_fkey" FOREIGN KEY ("default_attribute_code") REFERENCES "attributes"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "event_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attribute_map" ADD CONSTRAINT "event_attribute_map_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attribute_map" ADD CONSTRAINT "event_attribute_map_attribute_code_fkey" FOREIGN KEY ("attribute_code") REFERENCES "attributes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attribute_history" ADD CONSTRAINT "user_attribute_history_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
