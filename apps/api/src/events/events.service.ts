import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  Event,
  EventAttributeMap,
  EventTemplate,
  UserAttribute,
} from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type {
  ActiveEventPayloadData,
  ActiveEventResponseData,
  EventCompletionInput,
  EventCompletionResponseData,
  EventDismissResponseData,
} from "@kshetra/types";

import { dateToIso, decimalToNumber } from "../common/http/serializers";
import { GuideService } from "../guide/guide.service";
import {
  getLocalHour,
  getNextSystemResetAt,
  getSystemDayString,
  shiftDateString,
  toDateOnly,
} from "../common/time/system-day";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

type EventTemplateMetadata = {
  effort_layer?: "micro" | "structured" | "dungeon" | "raid";
  trigger_reason?: string;
  attribute_weights?: Array<{
    code: "strength" | "wisdom" | "focus" | "mastery" | "wealth" | "bond";
    weight: number;
  }>;
};

type EventRecord = Event & {
  attributeMap: EventAttributeMap[];
};

const ATTRIBUTE_GAIN_BY_EFFORT_LAYER = {
  micro: 1.5,
  structured: 3.0,
  dungeon: 6.0,
  raid: 10.0,
} as const;

const MAX_EVENT_COMPLETION_NOTE_LENGTH = 280;
const RECOVERY_MIN_TRIGGER_HOUR_LOCAL = 14;
const MYSTERY_MIN_TRIGGER_HOUR_LOCAL = 11;
const MYSTERY_COOLDOWN_DAYS = 4;
const RECOVERY_MIN_DAY_XP = 18;
const RECOVERY_MAX_COMPLETIONS = 1;
const RECOVERY_MAX_MANDATORY_COMPLETIONS = 1;
const MYSTERY_MIN_COMPLETIONS = 2;
const MYSTERY_MIN_DAY_XP = 12;
const MAX_EVENT_TRIGGER_RETRIES = 3;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly guideService: GuideService,
  ) {}

  async getActiveEvent(userId: string): Promise<ActiveEventPayloadData> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const systemDay = getSystemDayString(user.timezone);
    const systemDayDate = toDateOnly(systemDay);
    const now = new Date();

    await this.expireStaleEvents(userId, now);

    const existing = await this.findActiveEvent(userId, now);
    if (existing) {
      return {
        active_event: this.toActiveEventResponse(existing, user.timezone),
      };
    }

    const created = await this.tryTriggerEventWithRetry({
      user,
      systemDay,
      systemDayDate,
      now,
    });

    return {
      active_event: created ? this.toActiveEventResponse(created, user.timezone) : null,
    };
  }

  async completeEvent(
    userId: string,
    eventId: string,
    input: EventCompletionInput,
  ): Promise<EventCompletionResponseData> {
    this.validateCompletionInput(input);

    try {
      const completion = await this.prisma.$transaction(
        async (tx) => {
          const event = await tx.event.findUnique({
            where: { id: eventId },
            include: {
              attributeMap: true,
            },
          });

          if (!event || event.userId !== userId) {
            throw new NotFoundException("Event not found.");
          }

          if (event.status === "completed") {
            throw new ConflictException("Event is already completed.");
          }

          if (event.status !== "active") {
            throw new ConflictException("Event is not active.");
          }

          const now = new Date();
          if (event.availableFrom.getTime() > now.getTime() || event.expiresAt.getTime() <= now.getTime()) {
            await tx.event.update({
              where: { id: event.id },
              data: { status: "expired" },
            });
            throw new ConflictException("Event has expired.");
          }

          if (event.attributeMap.length === 0) {
            throw new InternalServerErrorException("Event attribute mapping is missing.");
          }

          const profile = await tx.userProfile.findUnique({
            where: { userId },
            select: {
              totalXp: true,
            },
          });

          if (!profile) {
            throw new NotFoundException("User profile not found.");
          }

          const affectedAttributes = await tx.userAttribute.findMany({
            where: {
              userId,
              attributeCode: {
                in: event.attributeMap.map((entry) => entry.attributeCode),
              },
            },
          });

          const attributeByCode = new Map(
            affectedAttributes.map((attribute) => [attribute.attributeCode, attribute]),
          );
          const totalAttributeGain = this.getTotalAttributeGain(event.metadata);
          const totalWeight = event.attributeMap.reduce(
            (sum, entry) => sum + decimalToNumber(entry.weight),
            0,
          );

          if (totalWeight <= 0) {
            throw new InternalServerErrorException("Event attribute weights are invalid.");
          }

          const attributeChanges = event.attributeMap.map((entry) => {
            const current = attributeByCode.get(entry.attributeCode);

            if (!current) {
              throw new InternalServerErrorException(
                `User attribute ${entry.attributeCode} is missing.`,
              );
            }

            return this.calculateAttributeChange(
              current,
              entry.attributeCode,
              decimalToNumber(entry.weight),
              totalWeight,
              totalAttributeGain,
            );
          });

          const xpAwarded = event.rewardXpBase;
          const newTotalXp = profile.totalXp + xpAwarded;
          const newLevel = this.calculateLevel(newTotalXp);
          const previousLevel = this.calculateLevel(profile.totalXp);

          await tx.eventLog.create({
            data: {
              eventId: event.id,
              userId,
              completed: true,
              note: input.note?.trim() ? input.note.trim() : null,
            },
          });

          await tx.event.update({
            where: { id: event.id },
            data: {
              status: "completed",
              completedAt: now,
            },
          });

          await tx.xpLedger.create({
            data: {
              userId,
              eventId: event.id,
              source: "event_completion",
              deltaXp: xpAwarded,
              totalXpAfter: newTotalXp,
              metadata: {
                event_type: event.eventType,
                event_title: event.title,
                system_day: event.systemDay.toISOString().slice(0, 10),
              },
            },
          });

          for (const change of attributeChanges) {
            await tx.userAttribute.update({
              where: {
                userId_attributeCode: {
                  userId,
                  attributeCode: change.code,
                },
              },
              data: {
                value: change.newValue,
                lastUpdatedAt: now,
              },
            });

            await tx.userAttributeHistory.create({
              data: {
                userId,
                eventId: event.id,
                attributeCode: change.code,
                delta: change.delta,
                previousValue: change.previousValue,
                newValue: change.newValue,
              },
            });
          }

          await tx.userProfile.update({
            where: { userId },
            data: {
              totalXp: newTotalXp,
              currentLevel: newLevel,
            },
          });

          return {
            event_id: event.id,
            xp_awarded: xpAwarded,
            attribute_changes: attributeChanges.map((change) => ({
              code: change.code,
              delta: change.delta,
            })),
            new_total_xp: newTotalXp,
            new_level: newLevel,
            event_status: "completed" as const,
            _guide_context: {
              previous_level: previousLevel,
              threshold_codes: attributeChanges
                .filter((change) => this.crossedRoundAttributeThreshold(change.previousValue, change.newValue))
                .map((change) => change.code),
              event_title: event.title,
            },
          };
        },
        {
          isolationLevel: "Serializable",
        },
      );

      const levelUp = completion.new_level > completion._guide_context.previous_level;
      const thresholdCode = completion._guide_context.threshold_codes[0] ?? null;
      await this.guideService.emitTriggeredMessage(userId, {
        screen: "home",
        triggerType: levelUp ? "level_up" : thresholdCode ? "stat_threshold" : "event_completion",
        triggerKey: levelUp
          ? `event-level-up:${userId}:${completion.new_level}`
          : thresholdCode
            ? `event-stat-threshold:${userId}:${thresholdCode}:${completion.event_id}`
            : `event-completion:${completion.event_id}`,
        priority: levelUp ? 85 : thresholdCode ? 80 : 68,
        stateVariant: levelUp || thresholdCode ? "battle" : "bold",
        fallbackTitle: levelUp ? "Level up" : thresholdCode ? "Stat threshold hit" : "Event cleared",
        fallbackBody: levelUp
          ? `Level ${completion.new_level} came online off that event. Keep pressing while the system is warm.`
          : thresholdCode
            ? `${thresholdCode.charAt(0).toUpperCase() + thresholdCode.slice(1)} crossed a round threshold. The gain now has visible weight.`
            : `${completion._guide_context.event_title} is cleared. Use the opened space before the day closes over it again.`,
        currentState: {
          source: completion._guide_context.event_title,
          xp_awarded: completion.xp_awarded,
          new_level: completion.new_level,
        },
      });

      const { _guide_context, ...response } = completion;
      return response;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Event completion was already recorded.");
      }

      throw error;
    }
  }

  private crossedRoundAttributeThreshold(previousValue: Prisma.Decimal | number, newValue: Prisma.Decimal | number): boolean {
    const previous = typeof previousValue === "number" ? previousValue : decimalToNumber(previousValue);
    const next = typeof newValue === "number" ? newValue : decimalToNumber(newValue);
    return [10, 20, 30].some((threshold) => previous < threshold && next >= threshold);
  }

  async dismissEvent(userId: string, eventId: string): Promise<EventDismissResponseData> {
    return this.prisma.$transaction(
      async (tx) => {
        const event = await tx.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            userId: true,
            status: true,
            availableFrom: true,
            expiresAt: true,
          },
        });

        if (!event || event.userId !== userId) {
          throw new NotFoundException("Event not found.");
        }

        if (event.status === "cancelled") {
          return {
            event_id: event.id,
            event_status: "cancelled",
          };
        }

        if (event.status === "completed") {
          throw new ConflictException("Completed events cannot be dismissed.");
        }

        if (event.status === "expired") {
          throw new ConflictException("Expired events cannot be dismissed.");
        }

        const now = new Date();
        if (event.availableFrom.getTime() > now.getTime() || event.expiresAt.getTime() <= now.getTime()) {
          await tx.event.update({
            where: { id: event.id },
            data: { status: "expired" },
          });
          throw new ConflictException("Event has expired.");
        }

        await tx.event.update({
          where: { id: event.id },
          data: { status: "cancelled" },
        });

        return {
          event_id: event.id,
          event_status: "cancelled",
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );
  }

  private async tryTriggerEventWithRetry(input: {
    user: { id: string; timezone: string };
    systemDay: string;
    systemDayDate: Date;
    now: Date;
  }): Promise<EventRecord | null> {
    for (let attempt = 1; attempt <= MAX_EVENT_TRIGGER_RETRIES; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const active = await this.findActiveEvent(input.user.id, input.now, tx);
            if (active) {
              return active;
            }

            const existingToday = await tx.event.findFirst({
              where: {
                userId: input.user.id,
                systemDay: input.systemDayDate,
              },
            });

            if (existingToday) {
              return null;
            }

            const trigger = await this.evaluateTrigger(tx, input);
            if (!trigger) {
              return null;
            }

            return this.createEventFromTemplate(tx, {
              userId: input.user.id,
              template: trigger.template,
              eventType: trigger.template.eventType,
              systemDayDate: input.systemDayDate,
              now: input.now,
              expiresAt: trigger.expiresAt,
              triggerContext: trigger.triggerContext,
            });
          },
          {
            isolationLevel: "Serializable",
          },
        );
      } catch (error) {
        if (
          error instanceof PrismaClientKnownRequestError &&
          (error.code === "P2034" || error.code === "P2002") &&
          attempt < MAX_EVENT_TRIGGER_RETRIES
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new InternalServerErrorException("Event trigger evaluation could not be completed.");
  }

  private async evaluateTrigger(
    tx: Prisma.TransactionClient,
    input: {
      user: { id: string; timezone: string };
      systemDay: string;
      systemDayDate: Date;
      now: Date;
    },
  ): Promise<{
    template: EventTemplate;
    expiresAt: Date;
    triggerContext: Prisma.InputJsonValue;
  } | null> {
    const localHour = getLocalHour(input.user.timezone, input.now);
    const todayQuests = await tx.quest.findMany({
      where: {
        userId: input.user.id,
        questType: "daily",
        assignedDate: input.systemDayDate,
      },
      select: {
        id: true,
        status: true,
        isMandatory: true,
      },
    });

    if (!todayQuests.length) {
      return null;
    }

    const completedQuestIds = todayQuests
      .filter((quest) => quest.status === "completed")
      .map((quest) => quest.id);
    const completedCount = completedQuestIds.length;
    const mandatoryCompletedCount = todayQuests.filter(
      (quest) => quest.isMandatory && quest.status === "completed",
    ).length;

    const xpEntries = completedQuestIds.length
      ? await tx.xpLedger.findMany({
          where: {
            userId: input.user.id,
            source: "quest_completion",
            questId: { in: completedQuestIds },
          },
          select: {
            deltaXp: true,
          },
        })
      : [];

    const totalQuestXpToday = xpEntries.reduce((sum, entry) => sum + entry.deltaXp, 0);
    const nextResetAt = new Date(getNextSystemResetAt(input.user.timezone, input.now));

    if (
      localHour >= RECOVERY_MIN_TRIGGER_HOUR_LOCAL &&
      completedCount <= RECOVERY_MAX_COMPLETIONS &&
      mandatoryCompletedCount <= RECOVERY_MAX_MANDATORY_COMPLETIONS &&
      totalQuestXpToday < RECOVERY_MIN_DAY_XP &&
      !(await this.hasRecoveryEventToday(tx, input.user.id, input.systemDayDate))
    ) {
      const template = await this.selectTemplate(tx, "recovery", input.systemDayDate);
      if (!template) {
        return null;
      }

      return {
        template,
        expiresAt: nextResetAt,
        triggerContext: {
          trigger_reason: "low_momentum_recovery",
          day_xp: totalQuestXpToday,
          completed_quests: completedCount,
          mandatory_completed: mandatoryCompletedCount,
          system_day: input.systemDay,
        },
      };
    }

    if (
      localHour >= MYSTERY_MIN_TRIGGER_HOUR_LOCAL &&
      completedCount >= MYSTERY_MIN_COMPLETIONS &&
      totalQuestXpToday >= MYSTERY_MIN_DAY_XP &&
      !(await this.hasRecentMysteryEvent(tx, input.user.id, input.systemDay))
    ) {
      const template = await this.selectTemplate(tx, "mystery", input.systemDayDate);
      if (!template) {
        return null;
      }

      const expiresAt = new Date(
        Math.min(
          nextResetAt.getTime(),
          input.now.getTime() + 12 * 60 * 60 * 1000,
        ),
      );

      return {
        template,
        expiresAt,
        triggerContext: {
          trigger_reason: "rare_bonus_window",
          day_xp: totalQuestXpToday,
          completed_quests: completedCount,
          system_day: input.systemDay,
          mystery_cooldown_days: MYSTERY_COOLDOWN_DAYS,
        },
      };
    }

    return null;
  }

  private async createEventFromTemplate(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      template: EventTemplate;
      eventType: EventTemplate["eventType"];
      systemDayDate: Date;
      now: Date;
      expiresAt: Date;
      triggerContext: Prisma.InputJsonValue;
    },
  ): Promise<EventRecord> {
    const event = await tx.event.create({
      data: {
        userId: input.userId,
        templateId: input.template.id,
        eventType: input.eventType,
        title: input.template.title,
        description: input.template.description,
        difficulty: input.template.difficulty,
        rewardXpBase: input.template.rewardXpBase,
        systemDay: input.systemDayDate,
        triggeredAt: input.now,
        availableFrom: input.now,
        expiresAt: input.expiresAt,
        generatedBy: "system",
        triggerContext: input.triggerContext,
        metadata: input.template.metadata as Prisma.InputJsonValue,
      },
      include: {
        attributeMap: true,
      },
    });

    const weights = this.getTemplateMetadata(input.template.metadata).attribute_weights ?? [];
    if (!weights.length) {
      throw new InternalServerErrorException(
        `Event template ${input.template.code} is missing attribute weights.`,
      );
    }

    await tx.eventAttributeMap.createMany({
      data: weights.map((weight) => ({
        eventId: event.id,
        attributeCode: weight.code,
        weight: weight.weight,
      })),
      skipDuplicates: true,
    });

    return {
      ...event,
      attributeMap: weights.map((weight) => ({
        eventId: event.id,
        attributeCode: weight.code,
        weight: new Prisma.Decimal(weight.weight),
      })),
    };
  }

  private async selectTemplate(
    tx: Prisma.TransactionClient,
    eventType: EventTemplate["eventType"],
    systemDayDate: Date,
  ): Promise<EventTemplate | null> {
    const templates = await tx.eventTemplate.findMany({
      where: {
        isActive: true,
        eventType,
      },
      orderBy: { sortOrder: "asc" },
    });

    if (!templates.length) {
      return null;
    }

    const index =
      Math.abs(
        systemDayDate.getUTCFullYear() +
          systemDayDate.getUTCMonth() +
          systemDayDate.getUTCDate(),
      ) % templates.length;

    return templates[index] ?? templates[0] ?? null;
  }

  private async hasRecoveryEventToday(
    tx: Prisma.TransactionClient,
    userId: string,
    systemDayDate: Date,
  ): Promise<boolean> {
    const record = await tx.event.findFirst({
      where: {
        userId,
        eventType: "recovery",
        systemDay: systemDayDate,
      },
      select: { id: true },
    });

    return Boolean(record);
  }

  private async hasRecentMysteryEvent(
    tx: Prisma.TransactionClient,
    userId: string,
    systemDay: string,
  ): Promise<boolean> {
    const cooldownStart = toDateOnly(shiftDateString(systemDay, -(MYSTERY_COOLDOWN_DAYS - 1)));
    const record = await tx.event.findFirst({
      where: {
        userId,
        eventType: "mystery",
        systemDay: {
          gte: cooldownStart,
        },
      },
      select: { id: true },
    });

    return Boolean(record);
  }

  private async expireStaleEvents(userId: string, now: Date): Promise<void> {
    await this.prisma.event.updateMany({
      where: {
        userId,
        status: "active",
        expiresAt: {
          lte: now,
        },
      },
      data: {
        status: "expired",
      },
    });
  }

  private findActiveEvent(
    userId: string,
    now: Date,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<EventRecord | null> {
    return tx.event.findFirst({
      where: {
        userId,
        status: "active",
        availableFrom: {
          lte: now,
        },
        expiresAt: {
          gt: now,
        },
      },
      include: {
        attributeMap: true,
      },
      orderBy: {
        triggeredAt: "desc",
      },
    });
  }

  private validateCompletionInput(input: EventCompletionInput): void {
    if (input.note && input.note.trim().length > MAX_EVENT_COMPLETION_NOTE_LENGTH) {
      throw new ConflictException("Event note is too long.");
    }
  }

  private toActiveEventResponse(
    event: EventRecord,
    timezone: string,
  ): ActiveEventResponseData {
    const triggerContext = this.getTemplateMetadata(event.triggerContext);

    return {
      id: event.id,
      template_id: event.templateId,
      event_type: event.eventType,
      status: event.status,
      title: event.title,
      description: event.description,
      difficulty: event.difficulty,
      reward_xp_base: event.rewardXpBase,
      triggered_at: dateToIso(event.triggeredAt) ?? event.triggeredAt.toISOString(),
      available_from: dateToIso(event.availableFrom) ?? event.availableFrom.toISOString(),
      expires_at: dateToIso(event.expiresAt) ?? event.expiresAt.toISOString(),
      completed_at: dateToIso(event.completedAt),
      generated_by: event.generatedBy,
      trigger_reason:
        typeof triggerContext.trigger_reason === "string"
          ? triggerContext.trigger_reason
          : null,
      next_reset_at: getNextSystemResetAt(timezone),
    };
  }

  private getTemplateMetadata(metadata: Prisma.JsonValue): EventTemplateMetadata {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return {};
    }

    return metadata as EventTemplateMetadata;
  }

  private getTotalAttributeGain(metadata: Prisma.JsonValue): number {
    const effortLayer = this.getTemplateMetadata(metadata).effort_layer ?? "micro";
    return ATTRIBUTE_GAIN_BY_EFFORT_LAYER[effortLayer];
  }

  private calculateAttributeChange(
    current: UserAttribute,
    code: EventAttributeMap["attributeCode"],
    weight: number,
    totalWeight: number,
    totalGain: number,
  ): {
    code: EventAttributeMap["attributeCode"];
    delta: number;
    previousValue: number;
    newValue: number;
  } {
    const previousValue = decimalToNumber(current.value);
    const cap = decimalToNumber(current.cap);
    const rawDelta = this.roundToTwo((totalGain * weight) / totalWeight);
    const newValue = this.roundToTwo(Math.min(cap, previousValue + rawDelta));

    return {
      code,
      delta: this.roundToTwo(newValue - previousValue),
      previousValue,
      newValue,
    };
  }

  private calculateLevel(totalXp: number): number {
    return Math.floor(Math.sqrt(Math.max(0, totalXp)));
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
