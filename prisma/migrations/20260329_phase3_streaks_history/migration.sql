-- AlterEnum
ALTER TYPE "XpLedgerSource" ADD VALUE IF NOT EXISTS 'streak_milestone_bonus';

-- CreateTable
CREATE TABLE "valid_days" (
    "user_id" UUID NOT NULL,
    "day_date" DATE NOT NULL,
    "meaningful_completion_count" INTEGER NOT NULL DEFAULT 0,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "low_difficulty_xp" INTEGER NOT NULL DEFAULT 0,
    "is_valid" BOOLEAN NOT NULL DEFAULT false,
    "validated_at" TIMESTAMPTZ(6),
    "streak_awarded_at" TIMESTAMPTZ(6),
    "current_streak_after" INTEGER,
    "milestones_awarded_json" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "valid_days_pkey" PRIMARY KEY ("user_id","day_date")
);

-- CreateIndex
CREATE INDEX "valid_days_user_id_day_date_idx" ON "valid_days"("user_id", "day_date");

-- AddForeignKey
ALTER TABLE "valid_days" ADD CONSTRAINT "valid_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
