-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rank" AS ENUM ('E', 'D', 'C', 'B', 'A', 'S');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('fitness', 'learning', 'career', 'relationship', 'spiritual', 'project');

-- CreateEnum
CREATE TYPE "AttributeCode" AS ENUM ('strength', 'wisdom', 'focus', 'mastery', 'wealth', 'bond');

-- CreateEnum
CREATE TYPE "StreakStatus" AS ENUM ('inactive', 'active', 'broken');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "system_name" TEXT NOT NULL DEFAULT 'Kshetra',
    "current_rank" "Rank" NOT NULL DEFAULT 'E',
    "current_level" INTEGER NOT NULL DEFAULT 0,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "fatigue_score" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "motivation_mode" TEXT,
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "goal_type" "GoalType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority_weight" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attributes" (
    "code" "AttributeCode" NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "attributes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "user_attributes" (
    "user_id" UUID NOT NULL,
    "attribute_code" "AttributeCode" NOT NULL,
    "value" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "cap" DECIMAL(6,2) NOT NULL DEFAULT 30,
    "growth_rate" DECIMAL(6,3) NOT NULL DEFAULT 1.0,
    "last_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_attributes_pkey" PRIMARY KEY ("user_id","attribute_code")
);

-- CreateTable
CREATE TABLE "streaks" (
    "user_id" UUID NOT NULL,
    "current_streak_days" INTEGER NOT NULL DEFAULT 0,
    "longest_streak_days" INTEGER NOT NULL DEFAULT 0,
    "last_valid_day" DATE,
    "streak_status" "StreakStatus" NOT NULL DEFAULT 'inactive',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "streaks_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attributes" ADD CONSTRAINT "user_attributes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attributes" ADD CONSTRAINT "user_attributes_attribute_code_fkey" FOREIGN KEY ("attribute_code") REFERENCES "attributes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

