import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, Streak } from "@prisma/client";
import type { StreakResponseData } from "@kshetra/types";

import { dateToIso } from "../common/http/serializers";
import { PrismaService } from "../prisma/prisma.service";

const VALID_DAY_MIN_COMPLETIONS = 3;
const VALID_DAY_MIN_XP = 18;
const VALID_DAY_MAX_LOW_DIFFICULTY_SHARE = 0.4;

const STREAK_MILESTONES = [
  { days: 3, bonusXp: 10 },
  { days: 7, bonusXp: 25 },
  { days: 14, bonusXp: 60 },
  { days: 30, bonusXp: 150 },
] as const;

@Injectable()
export class StreakService {
  constructor(private readonly prisma: PrismaService) {}

  async createInitial(tx: Prisma.TransactionClient, userId: string): Promise<Streak> {
    return tx.streak.create({
      data: {
        userId,
        currentStreakDays: 0,
        longestStreakDays: 0,
        streakStatus: "inactive",
      },
    });
  }

  async getForUserOrThrow(userId: string): Promise<StreakResponseData> {
    const streak = await this.prisma.streak.findUnique({
      where: { userId },
    });

    if (!streak) {
      throw new NotFoundException("Streak state not found.");
    }

    return this.toResponse(streak);
  }

  async evaluateDayAfterQuestCompletion(
    tx: Prisma.TransactionClient,
    userId: string,
    timezone: string,
  ): Promise<{
    dayBecameValid: boolean;
    streakBonusXp: number;
    currentStreakDays: number;
    totalXpAfterBonuses: number | null;
    levelAfterBonuses: number | null;
  }> {
    const localDate = this.getLocalDateString(timezone);
    const dayDate = this.toDateOnly(localDate);
    const completedQuests = await tx.quest.findMany({
      where: {
        userId,
        questType: "daily",
        assignedDate: dayDate,
        status: "completed",
      },
      select: {
        id: true,
        difficulty: true,
      },
    });

    const questIds = completedQuests.map((quest) => quest.id);
    const xpEntries = questIds.length
      ? await tx.xpLedger.findMany({
          where: {
            userId,
            source: "quest_completion",
            questId: { in: questIds },
          },
          select: {
            questId: true,
            deltaXp: true,
          },
        })
      : [];

    const xpByQuestId = new Map(
      xpEntries
        .filter((entry): entry is { questId: string; deltaXp: number } => Boolean(entry.questId))
        .map((entry) => [entry.questId, entry.deltaXp]),
    );

    const meaningfulCompletionCount = completedQuests.length;
    const totalXp = xpEntries.reduce((sum, entry) => sum + entry.deltaXp, 0);
    const lowDifficultyXp = completedQuests.reduce((sum, quest) => {
      if (quest.difficulty !== "low") {
        return sum;
      }

      return sum + (xpByQuestId.get(quest.id) ?? 0);
    }, 0);

    const lowDifficultyShare = totalXp > 0 ? lowDifficultyXp / totalXp : 0;
    const isValid =
      meaningfulCompletionCount >= VALID_DAY_MIN_COMPLETIONS &&
      totalXp >= VALID_DAY_MIN_XP &&
      lowDifficultyShare <= VALID_DAY_MAX_LOW_DIFFICULTY_SHARE;

    const existingValidDay = await tx.validDay.findUnique({
      where: {
        userId_dayDate: {
          userId,
          dayDate,
        },
      },
    });

    const milestonesAwarded = this.parseAwardedMilestones(
      existingValidDay?.milestonesAwardedJson,
    );
    const wasAlreadyValid = existingValidDay?.isValid ?? false;
    let currentStreakDays = existingValidDay?.currentStreakAfter ?? 0;
    let streakBonusXp = 0;
    let totalXpAfterBonuses: number | null = null;
    let levelAfterBonuses: number | null = null;
    const now = new Date();

    if (isValid && !wasAlreadyValid) {
      const streak = await tx.streak.findUnique({
        where: { userId },
      });

      if (!streak) {
        throw new NotFoundException("Streak state not found.");
      }

      const previousValidDay = streak.lastValidDay
        ? this.formatDateOnly(streak.lastValidDay)
        : null;
      const yesterday = this.shiftDateString(localDate, -1);

      currentStreakDays =
        previousValidDay === yesterday ? streak.currentStreakDays + 1 : 1;

      await tx.streak.update({
        where: { userId },
        data: {
          currentStreakDays,
          longestStreakDays: Math.max(streak.longestStreakDays, currentStreakDays),
          lastValidDay: dayDate,
          streakStatus: "active",
        },
      });

      const milestone = STREAK_MILESTONES.find(
        (candidate) =>
          candidate.days === currentStreakDays &&
          !milestonesAwarded.includes(candidate.days),
      );

      if (milestone) {
        const profile = await tx.userProfile.findUnique({
          where: { userId },
          select: {
            totalXp: true,
          },
        });

        if (!profile) {
          throw new NotFoundException("User profile not found.");
        }

        totalXpAfterBonuses = profile.totalXp + milestone.bonusXp;
        levelAfterBonuses = this.calculateLevel(totalXpAfterBonuses);
        streakBonusXp = milestone.bonusXp;
        milestonesAwarded.push(milestone.days);

        await tx.xpLedger.create({
          data: {
            userId,
            source: "streak_milestone_bonus",
            deltaXp: milestone.bonusXp,
            totalXpAfter: totalXpAfterBonuses,
            metadata: {
              day_date: localDate,
              streak_days: milestone.days,
            },
          },
        });

        await tx.userProfile.update({
          where: { userId },
          data: {
            totalXp: totalXpAfterBonuses,
            currentLevel: levelAfterBonuses,
          },
        });
      }
    }

    await tx.validDay.upsert({
      where: {
        userId_dayDate: {
          userId,
          dayDate,
        },
      },
      update: {
        meaningfulCompletionCount,
        totalXp,
        lowDifficultyXp,
        isValid,
        validatedAt: isValid ? now : null,
        streakAwardedAt: isValid && !wasAlreadyValid ? now : existingValidDay?.streakAwardedAt ?? null,
        currentStreakAfter:
          isValid
            ? currentStreakDays
            : existingValidDay?.currentStreakAfter ?? null,
        milestonesAwardedJson: milestonesAwarded,
      },
      create: {
        userId,
        dayDate,
        meaningfulCompletionCount,
        totalXp,
        lowDifficultyXp,
        isValid,
        validatedAt: isValid ? now : null,
        streakAwardedAt: isValid ? now : null,
        currentStreakAfter: isValid ? currentStreakDays : null,
        milestonesAwardedJson: milestonesAwarded,
      },
    });

    return {
      dayBecameValid: isValid && !wasAlreadyValid,
      streakBonusXp,
      currentStreakDays,
      totalXpAfterBonuses,
      levelAfterBonuses,
    };
  }

  getMilestones(): Array<{ days: number; bonusXp: number }> {
    return [...STREAK_MILESTONES];
  }

  toResponse(streak: Streak): StreakResponseData {
    return {
      current_streak_days: streak.currentStreakDays,
      longest_streak_days: streak.longestStreakDays,
      last_valid_day: dateToIso(streak.lastValidDay),
      streak_status: streak.streakStatus,
    };
  }

  private parseAwardedMilestones(value: Prisma.JsonValue | null | undefined): number[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry));
  }

  private calculateLevel(totalXp: number): number {
    return Math.floor(Math.sqrt(Math.max(0, totalXp)));
  }

  private getLocalDateString(timezone: string, date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  private toDateOnly(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private formatDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private shiftDateString(value: string, days: number): string {
    const date = this.toDateOnly(value);
    date.setUTCDate(date.getUTCDate() + days);
    return this.formatDateOnly(date);
  }
}
