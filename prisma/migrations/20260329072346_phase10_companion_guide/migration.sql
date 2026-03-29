-- CreateEnum
CREATE TYPE "GuideScreen" AS ENUM ('home', 'missions', 'progress', 'profile');

-- CreateEnum
CREATE TYPE "GuideMessageType" AS ENUM ('nudge', 'milestone', 'warning', 'explain');

-- CreateEnum
CREATE TYPE "GuideMessageStatus" AS ENUM ('active', 'shown', 'dismissed', 'expired');

-- CreateEnum
CREATE TYPE "GuideStateVariant" AS ENUM ('calm', 'bold', 'battle');

-- CreateEnum
CREATE TYPE "GuideToneMode" AS ENUM ('energetic_anime');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AiGenerationType" ADD VALUE 'guide_reactive';
ALTER TYPE "AiGenerationType" ADD VALUE 'guide_explain';

-- CreateTable
CREATE TABLE "guide_preferences" (
    "user_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "reactive_popups_enabled" BOOLEAN NOT NULL DEFAULT true,
    "screen_nudges_enabled" BOOLEAN NOT NULL DEFAULT true,
    "tone_mode" "GuideToneMode" NOT NULL DEFAULT 'energetic_anime',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "guide_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "guide_messages" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "screen" "GuideScreen" NOT NULL,
    "message_type" "GuideMessageType" NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "trigger_key" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "state_variant" "GuideStateVariant" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "GuideMessageStatus" NOT NULL DEFAULT 'active',
    "system_day" DATE NOT NULL,
    "source_ai_generation_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shown_at" TIMESTAMPTZ(6),
    "dismissed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "guide_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guide_messages_user_id_status_priority_created_at_idx" ON "guide_messages"("user_id", "status", "priority", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "guide_messages_user_id_trigger_key_key" ON "guide_messages"("user_id", "trigger_key");

-- AddForeignKey
ALTER TABLE "guide_preferences" ADD CONSTRAINT "guide_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_messages" ADD CONSTRAINT "guide_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_messages" ADD CONSTRAINT "guide_messages_source_ai_generation_id_fkey" FOREIGN KEY ("source_ai_generation_id") REFERENCES "ai_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
