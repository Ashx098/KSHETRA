import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  NotificationDismissResponseData,
  NotificationPreferencesResponseData,
  NotificationPreferencesUpdateInput,
  NotificationResponseData,
  NotificationsInboxData,
} from "@kshetra/types";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { dateToIso } from "../common/http/serializers";
import { getLocalHour, getSystemDayString, toDateOnly } from "../common/time/system-day";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

const STREAK_RISK_MIN_HOUR_LOCAL = 18;
const NOTIFICATION_PRIORITY = {
  streak_risk: 3,
  event_available: 2,
  daily_ready: 1,
} as const;

type NotificationRecord = any;
type NotificationPreferenceRecord = any;
type NotificationPrismaClient = PrismaService & {
  notification: any;
  notificationPreference: any;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async getHomeNotificationState(userId: string): Promise<{
    top_notification: NotificationResponseData | null;
    notification_count: number;
  }> {
    const prisma = this.prisma as NotificationPrismaClient;
    await this.syncNotifications(userId);

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        status: {
          in: ["pending", "shown"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (!notifications.length) {
      return {
        top_notification: null,
        notification_count: 0,
      };
    }

    const sorted = [...notifications].sort(
      (left: NotificationRecord, right: NotificationRecord) =>
        NOTIFICATION_PRIORITY[right.notificationType as keyof typeof NOTIFICATION_PRIORITY] -
          NOTIFICATION_PRIORITY[left.notificationType as keyof typeof NOTIFICATION_PRIORITY] ||
        right.scheduledFor.getTime() - left.scheduledFor.getTime(),
    );
    const top = sorted[0];

    if (top && top.status === "pending") {
      await prisma.notification.update({
        where: { id: top.id },
        data: {
          status: "shown",
          deliveredAt: new Date(),
        },
      });
      top.status = "shown";
      top.deliveredAt = new Date();
    }

    return {
      top_notification: top ? this.toResponse(top) : null,
      notification_count: notifications.length,
    };
  }

  async getInbox(userId: string): Promise<NotificationsInboxData> {
    const prisma = this.prisma as NotificationPrismaClient;
    await this.syncNotifications(userId);

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        status: {
          in: ["pending", "shown"],
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 20,
    });

    const pendingIds = notifications
      .filter((item: NotificationRecord) => item.status === "pending")
      .map((item: NotificationRecord) => item.id);
    if (pendingIds.length > 0) {
      const now = new Date();
      await prisma.notification.updateMany({
        where: { id: { in: pendingIds } },
        data: {
          status: "shown",
          deliveredAt: now,
        },
      });
      for (const item of notifications as NotificationRecord[]) {
        if (pendingIds.includes(item.id)) {
          item.status = "shown";
          item.deliveredAt = now;
        }
      }
    }

    return {
      notifications: notifications.map((item: NotificationRecord) => this.toResponse(item)),
      unread_count: notifications.filter((item: NotificationRecord) => item.status === "shown").length,
    };
  }

  async dismissNotification(
    userId: string,
    notificationId: string,
  ): Promise<NotificationDismissResponseData> {
    const prisma = this.prisma as NotificationPrismaClient;
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException("Notification not found.");
    }

    if (notification.status === "dismissed") {
      return {
        notification_id: notification.id,
        status: "dismissed",
      };
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: "dismissed",
        dismissedAt: new Date(),
      },
    });

    return {
      notification_id: notification.id,
      status: "dismissed",
    };
  }

  async getPreferences(userId: string): Promise<NotificationPreferencesResponseData> {
    const preferences = await this.ensurePreferences(userId);
    return {
      daily_ready_enabled: preferences.dailyReadyEnabled,
      streak_risk_enabled: preferences.streakRiskEnabled,
      event_alerts_enabled: preferences.eventAlertsEnabled,
      quiet_hours_start: preferences.quietHoursStart,
      quiet_hours_end: preferences.quietHoursEnd,
    };
  }

  async updatePreferences(
    userId: string,
    input: NotificationPreferencesUpdateInput,
  ): Promise<NotificationPreferencesResponseData> {
    const prisma = this.prisma as NotificationPrismaClient;
    await this.usersService.assertUserExists(userId);

    const quietHoursStart = input.quiet_hours_start?.trim() || null;
    const quietHoursEnd = input.quiet_hours_end?.trim() || null;
    this.validateQuietHoursValue(quietHoursStart);
    this.validateQuietHoursValue(quietHoursEnd);

    const updated = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...(input.daily_ready_enabled !== undefined
          ? { dailyReadyEnabled: input.daily_ready_enabled }
          : {}),
        ...(input.streak_risk_enabled !== undefined
          ? { streakRiskEnabled: input.streak_risk_enabled }
          : {}),
        ...(input.event_alerts_enabled !== undefined
          ? { eventAlertsEnabled: input.event_alerts_enabled }
          : {}),
        ...(input.quiet_hours_start !== undefined
          ? { quietHoursStart }
          : {}),
        ...(input.quiet_hours_end !== undefined
          ? { quietHoursEnd }
          : {}),
      },
      create: {
        userId,
        dailyReadyEnabled: input.daily_ready_enabled ?? true,
        streakRiskEnabled: input.streak_risk_enabled ?? true,
        eventAlertsEnabled: input.event_alerts_enabled ?? true,
        quietHoursStart,
        quietHoursEnd,
      },
    });

    return {
      daily_ready_enabled: updated.dailyReadyEnabled,
      streak_risk_enabled: updated.streakRiskEnabled,
      event_alerts_enabled: updated.eventAlertsEnabled,
      quiet_hours_start: updated.quietHoursStart,
      quiet_hours_end: updated.quietHoursEnd,
    };
  }

  private async syncNotifications(userId: string): Promise<void> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const preferences = await this.ensurePreferences(userId);
    const now = new Date();
    const systemDay = getSystemDayString(user.timezone);
    const systemDayDate = toDateOnly(systemDay);

    await this.expireStaleNotifications(userId, systemDayDate, now);

    if (preferences.dailyReadyEnabled) {
      await this.ensureDailyReadyNotification(userId, systemDayDate, now);
    }

    if (preferences.streakRiskEnabled) {
      await this.ensureStreakRiskNotification(userId, user.timezone, systemDayDate, now);
    }

    if (preferences.eventAlertsEnabled) {
      await this.ensureEventNotification(userId, now);
    }
  }

  private async ensurePreferences(userId: string) {
    const prisma = this.prisma as NotificationPrismaClient;
    await this.usersService.assertUserExists(userId);

    return prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
      },
    });
  }

  private async expireStaleNotifications(
    userId: string,
    currentSystemDay: Date,
    now: Date,
  ): Promise<void> {
    const prisma = this.prisma as NotificationPrismaClient;
    await prisma.notification.updateMany({
      where: {
        userId,
        notificationType: {
          in: ["daily_ready", "streak_risk"],
        },
        status: {
          in: ["pending", "shown"],
        },
        systemDay: {
          lt: currentSystemDay,
        },
      },
      data: {
        status: "expired",
      },
    });

    const eventNotifications = await prisma.notification.findMany({
      where: {
        userId,
        notificationType: "event_available",
        status: {
          in: ["pending", "shown"],
        },
      },
      include: {
        event: true,
      },
    });

    const staleIds = eventNotifications
      .filter(
        (notification: NotificationRecord) =>
          !notification.event ||
          notification.event.status !== "active" ||
          notification.event.expiresAt.getTime() <= now.getTime(),
      )
      .map((notification: NotificationRecord) => notification.id);

    if (staleIds.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: staleIds } },
        data: { status: "expired" },
      });
    }
  }

  private async ensureDailyReadyNotification(
    userId: string,
    systemDayDate: Date,
    now: Date,
  ): Promise<void> {
    await this.createNotificationIfMissing({
      userId,
      notificationType: "daily_ready",
      title: "Daily loop ready",
      body: "Today’s deterministic quest bundle is ready.",
      systemDay: systemDayDate,
      scheduledFor: now,
      metadata: {
        category: "daily_reentry",
      },
    });
  }

  private async ensureStreakRiskNotification(
    userId: string,
    timezone: string,
    systemDayDate: Date,
    now: Date,
  ): Promise<void> {
    if (getLocalHour(timezone, now) < STREAK_RISK_MIN_HOUR_LOCAL) {
      return;
    }

    const validDay = await this.prisma.validDay.findUnique({
      where: {
        userId_dayDate: {
          userId,
          dayDate: systemDayDate,
        },
      },
    });

    if (validDay?.isValid) {
      return;
    }

    const completedToday = await this.prisma.quest.findMany({
      where: {
        userId,
        questType: "daily",
        assignedDate: systemDayDate,
        status: "completed",
      },
      select: {
        id: true,
      },
    });

    const questIds = completedToday.map((quest) => quest.id);
    const xpEntries = questIds.length
      ? await this.prisma.xpLedger.findMany({
          where: {
            userId,
            source: "quest_completion",
            questId: { in: questIds },
          },
          select: {
            deltaXp: true,
          },
        })
      : [];
    const totalXp = xpEntries.reduce((sum, entry) => sum + entry.deltaXp, 0);

    if (completedToday.length >= 3 && totalXp >= 18) {
      return;
    }

    await this.createNotificationIfMissing({
      userId,
      notificationType: "streak_risk",
      title: "Valid day at risk",
      body: "The day is still recoverable, but the valid-day floor has not been secured yet.",
      systemDay: systemDayDate,
      scheduledFor: now,
      metadata: {
        completed_quests: completedToday.length,
        total_xp: totalXp,
      },
    });
  }

  private async ensureEventNotification(userId: string, now: Date): Promise<void> {
    const event = await this.prisma.event.findFirst({
      where: {
        userId,
        status: "active",
        availableFrom: { lte: now },
        expiresAt: { gt: now },
      },
      orderBy: { triggeredAt: "desc" },
    });

    if (!event) {
      return;
    }

    await this.createNotificationIfMissing({
      userId,
      notificationType: "event_available",
      title: "Active event available",
      body: `${event.title} is available for a limited window.`,
      eventId: event.id,
      scheduledFor: now,
      metadata: {
        event_type: event.eventType,
      },
    });
  }

  private async createNotificationIfMissing(input: {
    userId: string;
    notificationType: "daily_ready" | "streak_risk" | "event_available";
    title: string;
    body: string;
    systemDay?: Date;
    eventId?: string;
    scheduledFor: Date;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const prisma = this.prisma as NotificationPrismaClient;
    try {
      await prisma.notification.create({
        data: {
          userId: input.userId,
          notificationType: input.notificationType,
          title: input.title,
          body: input.body,
          systemDay: input.systemDay ?? null,
          eventId: input.eventId ?? null,
          scheduledFor: input.scheduledFor,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return;
      }

      throw error;
    }
  }

  private validateQuietHoursValue(value: string | null): void {
    if (!value) {
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(value)) {
      throw new BadRequestException("Quiet hours must use HH:MM format.");
    }
  }

  private toResponse(notification: {
    id: string;
    notificationType: "daily_ready" | "streak_risk" | "event_available";
    status: "pending" | "shown" | "dismissed" | "expired";
    title: string;
    body: string;
    scheduledFor: Date;
    deliveredAt: Date | null;
    dismissedAt: Date | null;
  }): NotificationResponseData {
    return {
      id: notification.id,
      notification_type: notification.notificationType,
      status: notification.status,
      title: notification.title,
      body: notification.body,
      scheduled_for: dateToIso(notification.scheduledFor) ?? notification.scheduledFor.toISOString(),
      delivered_at: dateToIso(notification.deliveredAt),
      dismissed_at: dateToIso(notification.dismissedAt),
    };
  }
}
