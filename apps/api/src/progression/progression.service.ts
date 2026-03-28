import { Injectable } from "@nestjs/common";
import type { ProgressionHistoryData, ProgressionSummaryData, Rank } from "@kshetra/types";

import { decimalToNumber } from "../common/http/serializers";
import { PrismaService } from "../prisma/prisma.service";
import { StreakService } from "../streak/streak.service";
import { UsersService } from "../users/users.service";

const rankConfigs: Array<{
  rank: Rank;
  xpThreshold: number;
  requiredStreak: number;
}> = [
  { rank: "E", xpThreshold: 0, requiredStreak: 0 },
  { rank: "D", xpThreshold: 500, requiredStreak: 5 },
  { rank: "C", xpThreshold: 1500, requiredStreak: 10 },
  { rank: "B", xpThreshold: 4000, requiredStreak: 14 },
  { rank: "A", xpThreshold: 9000, requiredStreak: 21 },
  { rank: "S", xpThreshold: 20000, requiredStreak: 30 },
];

@Injectable()
export class ProgressionService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly streakService: StreakService,
  ) {}

  calculateLevel(totalXp: number): number {
    return Math.floor(Math.sqrt(Math.max(0, totalXp)));
  }

  async getSummary(userId: string): Promise<ProgressionSummaryData> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const currentRank = user.profile.currentRank;
    const nextConfigIndex = rankConfigs.findIndex((config) => config.rank === currentRank) + 1;
    const nextConfig = rankConfigs[nextConfigIndex] ?? null;
    const nextStreakMilestone =
      this.streakService
        .getMilestones()
        .find((milestone) => milestone.days > user.streak.currentStreakDays) ?? null;

    return {
      rank: currentRank,
      level: this.calculateLevel(user.profile.totalXp),
      total_xp: user.profile.totalXp,
      current_streak_days: user.streak.currentStreakDays,
      longest_streak_days: user.streak.longestStreakDays,
      last_valid_day: user.streak.lastValidDay
        ? user.streak.lastValidDay.toISOString().slice(0, 10)
        : null,
      streak_status: user.streak.streakStatus,
      next_streak_milestone_days: nextStreakMilestone?.days ?? null,
      next_streak_milestone_bonus_xp: nextStreakMilestone?.bonusXp ?? null,
      rank_progress: {
        current_rank: currentRank,
        next_rank: nextConfig?.rank ?? null,
        next_rank_xp_threshold: nextConfig?.xpThreshold ?? null,
        xp_remaining: nextConfig
          ? Math.max(nextConfig.xpThreshold - user.profile.totalXp, 0)
          : 0,
        xp_remaining_to_next_rank: nextConfig
          ? Math.max(nextConfig.xpThreshold - user.profile.totalXp, 0)
          : 0,
        // Phase 2 intentionally does not compute streak validity or rank promotion yet.
        // Raids are also intentionally not enforced before the raid phase exists.
        raids_remaining: 0,
        streak_requirement_remaining: nextConfig
          ? Math.max(nextConfig.requiredStreak - user.streak.currentStreakDays, 0)
          : 0,
      },
    };
  }

  async getHistory(
    userId: string,
    range: ProgressionHistoryData["range"],
  ): Promise<ProgressionHistoryData> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const since = this.getRangeStart(range);

    const [xpLedgerEntries, attributeHistoryEntries, validDays] = await Promise.all([
      this.prisma.xpLedger.findMany({
        where: {
          userId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.userAttributeHistory.findMany({
        where: {
          userId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.validDay.findMany({
        where: {
          userId,
          dayDate: { gte: since },
        },
        orderBy: { dayDate: "desc" },
      }),
    ]);

    const xpByDay = new Map<
      string,
      {
        date: string;
        total_xp_gained: number;
        entries: ProgressionHistoryData["xp_timeline"][number]["entries"];
      }
    >();
    for (const entry of xpLedgerEntries) {
      const day = this.getLocalDateString(user.timezone, entry.createdAt);
      const bucket = xpByDay.get(day) ?? { date: day, total_xp_gained: 0, entries: [] };
      bucket.total_xp_gained += entry.deltaXp;
      bucket.entries.push({
        id: entry.id,
        source: entry.source,
        delta_xp: entry.deltaXp,
        created_at: entry.createdAt.toISOString(),
        quest_id: entry.questId,
      });
      xpByDay.set(day, bucket);
    }

    const attributeByDay = new Map<
      string,
      {
        date: string;
        changes: ProgressionHistoryData["attribute_timeline"][number]["changes"];
      }
    >();
    for (const entry of attributeHistoryEntries) {
      const day = this.getLocalDateString(user.timezone, entry.createdAt);
      const bucket = attributeByDay.get(day) ?? { date: day, changes: [] };
      bucket.changes.push({
        id: entry.id,
        code: entry.attributeCode,
        delta: decimalToNumber(entry.delta),
        created_at: entry.createdAt.toISOString(),
        quest_id: entry.questId,
      });
      attributeByDay.set(day, bucket);
    }

    const milestones = xpLedgerEntries
      .filter((entry) => entry.source === "streak_milestone_bonus")
      .map((entry) => ({
        date: this.getLocalDateString(user.timezone, entry.createdAt),
        streak_days: this.readNumericMetadata(entry.metadata, "streak_days"),
        bonus_xp: entry.deltaXp,
        ledger_id: entry.id,
      }));

    return {
      range,
      xp_timeline: Array.from(xpByDay.values()).sort((a, b) => b.date.localeCompare(a.date)),
      attribute_timeline: Array.from(attributeByDay.values()).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
      valid_days: validDays.map((day) => ({
        date: day.dayDate.toISOString().slice(0, 10),
        is_valid: day.isValid,
        meaningful_completion_count: day.meaningfulCompletionCount,
        total_xp: day.totalXp,
        low_difficulty_xp: day.lowDifficultyXp,
        current_streak_after: day.currentStreakAfter,
      })),
      milestones,
    };
  }

  private getRangeStart(range: ProgressionHistoryData["range"]): Date {
    const days =
      range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
    const now = new Date();
    now.setUTCDate(now.getUTCDate() - days);
    return now;
  }

  private getLocalDateString(timezone: string, date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  private readNumericMetadata(metadata: unknown, key: string): number {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return 0;
    }

    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === "number" ? value : Number(value ?? 0);
  }
}
