-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('daily_ready', 'streak_risk', 'event_available');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'shown', 'dismissed', 'expired');

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "daily_ready_enabled" BOOLEAN NOT NULL DEFAULT true,
    "streak_risk_enabled" BOOLEAN NOT NULL DEFAULT true,
    "event_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "system_day" DATE,
    "event_id" UUID,
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "delivered_at" TIMESTAMPTZ(6),
    "dismissed_at" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_status_scheduled_for_idx" ON "notifications"("user_id", "status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_notification_type_system_day_key" ON "notifications"("user_id", "notification_type", "system_day");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_notification_type_event_id_key" ON "notifications"("user_id", "notification_type", "event_id");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
