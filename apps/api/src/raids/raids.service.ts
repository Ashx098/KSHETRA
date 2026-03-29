import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { UserAttribute } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type {
  ActiveRaidPayloadData,
  RaidCompletionInput,
  RaidCompletionRewardData,
  RaidLogInput,
  RaidLogResponseData,
  RaidObjectiveResponseData,
  RaidResponseData,
  StartRaidInput,
} from "@kshetra/types";

import { dateToIso, decimalToNumber } from "../common/http/serializers";
import { GuideService } from "../guide/guide.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

type RaidTemplateMetadata = {
  effort_layer?: "micro" | "structured" | "dungeon" | "raid";
  attribute_weights?: Array<{
    code: "strength" | "wisdom" | "focus" | "mastery" | "wealth" | "bond";
    weight: number;
  }>;
  expected_duration_days?: number;
};

type RaidRecord = any;
type RaidObjectiveRecord = any;
type RaidAttributeMapRecord = any;

type RaidPrismaClient = PrismaService & {
  raid: any;
  raidTemplate: any;
  raidObjective: any;
  raidAttributeMap: any;
  raidLog: any;
};

const ATTRIBUTE_GAIN_BY_EFFORT_LAYER = {
  micro: 1.5,
  structured: 3.0,
  dungeon: 6.0,
  raid: 10.0,
} as const;

const MAX_RAID_LOG_NOTE_LENGTH = 280;
const MAX_RAID_LOG_DELTA = 1;
const MIN_RAID_COMPLETION_SUMMARY_LENGTH = 60;
const MAX_ARTIFACT_REFERENCE_LENGTH = 300;
const MIN_RAID_COMPLETION_WINDOW_HOURS = 12;

@Injectable()
export class RaidsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly guideService: GuideService,
  ) {}

  async getActiveRaid(userId: string): Promise<ActiveRaidPayloadData> {
    const prisma = this.prisma as RaidPrismaClient;
    await this.usersService.assertUserExists(userId);

    const [activeRaid, templates] = await Promise.all([
      prisma.raid.findFirst({
        where: {
          userId,
          status: {
            in: ["active", "verification_pending"],
          },
        },
        include: {
          objectives: {
            orderBy: { sortOrder: "asc" },
          },
          attributeMap: true,
          template: true,
        },
        orderBy: {
          startedAt: "desc",
        },
      }),
      prisma.raidTemplate.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    return {
      active_raid: activeRaid ? this.toRaidResponse(activeRaid) : null,
      available_templates: templates.map((template: any) => ({
        id: template.id,
        code: template.code,
        title: template.title,
        description: template.description,
        difficulty: template.difficulty,
        reward_xp_base: template.rewardXpBase,
        expected_duration_days: template.expectedDurationDays,
      })),
    };
  }

  async startRaid(userId: string, input: StartRaidInput): Promise<ActiveRaidPayloadData> {
    const prisma = this.prisma as RaidPrismaClient;
    if (!input.template_id?.trim()) {
      throw new ConflictException("template_id is required.");
    }

    await this.usersService.assertUserExists(userId);

    try {
      const created = await prisma.$transaction(
        async (tx) => {
          const raidTx = tx as RaidPrismaClient;
          const existing = await raidTx.raid.findFirst({
            where: {
              userId,
              status: {
                in: ["active", "verification_pending"],
              },
            },
            include: {
              objectives: { orderBy: { sortOrder: "asc" } },
              attributeMap: true,
              template: true,
            },
          });

          if (existing) {
            return existing;
          }

          const template = await raidTx.raidTemplate.findUnique({
            where: { id: input.template_id.trim() },
            include: {
              objectives: {
                orderBy: { sortOrder: "asc" },
              },
            },
          });

          if (!template || !template.isActive) {
            throw new NotFoundException("Raid template not found.");
          }

          if (!template.objectives.length) {
            throw new InternalServerErrorException("Raid template objectives are missing.");
          }

          const metadata = this.getTemplateMetadata(template.metadata);
          const weights = metadata.attribute_weights ?? [];
          if (!weights.length) {
            throw new InternalServerErrorException("Raid template attribute weights are missing.");
          }

          const raid = await raidTx.raid.create({
            data: {
              userId,
              templateId: template.id,
              title: template.title,
              description: template.description,
              difficulty: template.difficulty,
              rewardXpBase: template.rewardXpBase,
              generatedBy: "system",
              metadata: template.metadata as Prisma.InputJsonValue,
            },
          });

          await raidTx.raidObjective.createMany({
            data: template.objectives.map((objective: any) => ({
              raidId: raid.id,
              templateObjectiveId: objective.id,
              objectiveCode: objective.objectiveCode,
              title: objective.title,
              description: objective.description,
              targetCount: objective.targetCount,
              currentCount: 0,
              requiresVerification: objective.requiresVerification,
              sortOrder: objective.sortOrder,
              metadata: objective.metadata as Prisma.InputJsonValue,
            })),
          });

          await raidTx.raidAttributeMap.createMany({
            data: weights.map((weight: { code: string; weight: number }) => ({
              raidId: raid.id,
              attributeCode: weight.code,
              weight: weight.weight,
            })),
          });

          return raidTx.raid.findUniqueOrThrow({
            where: { id: raid.id },
            include: {
              objectives: { orderBy: { sortOrder: "asc" } },
              attributeMap: true,
              template: true,
            },
          });
        },
        { isolationLevel: "Serializable" },
      );

      const templates = await prisma.raidTemplate.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });

      return {
        active_raid: this.toRaidResponse(created),
        available_templates: templates.map((template: any) => ({
          id: template.id,
          code: template.code,
          title: template.title,
          description: template.description,
          difficulty: template.difficulty,
          reward_xp_base: template.rewardXpBase,
          expected_duration_days: template.expectedDurationDays,
        })),
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Only one active raid is allowed at a time.");
      }

      throw error;
    }
  }

  async logObjectiveProgress(
    userId: string,
    raidId: string,
    objectiveId: string,
    input: RaidLogInput,
  ): Promise<RaidLogResponseData> {
    const deltaProgress = input.delta_progress ?? 1;
    const note = input.note?.trim() ? input.note.trim() : null;

    if (!Number.isInteger(deltaProgress) || deltaProgress < 1 || deltaProgress > MAX_RAID_LOG_DELTA) {
      throw new ConflictException(`delta_progress must be an integer between 1 and ${MAX_RAID_LOG_DELTA}.`);
    }

    if (note && note.length > MAX_RAID_LOG_NOTE_LENGTH) {
      throw new ConflictException("Raid note is too long.");
    }

    const prisma = this.prisma as RaidPrismaClient;
    const result = await prisma.$transaction(
      async (tx) => {
        const raidTx = tx as RaidPrismaClient;
        const raid = await raidTx.raid.findUnique({
          where: { id: raidId },
          include: {
            objectives: {
              orderBy: { sortOrder: "asc" },
            },
            attributeMap: true,
            template: true,
          },
        });

        if (!raid || raid.userId !== userId) {
          throw new NotFoundException("Raid not found.");
        }

        if (raid.status === "completed") {
          throw new ConflictException("Raid is already completed.");
        }

        if (raid.status === "cancelled") {
          throw new ConflictException("Raid is cancelled.");
        }

        const objective = raid.objectives.find((item: RaidObjectiveRecord) => item.id === objectiveId);
        if (!objective) {
          throw new NotFoundException("Raid objective not found.");
        }

        if (objective.isCompleted) {
          throw new ConflictException("Objective is already completed.");
        }

        const nextCount = objective.currentCount + deltaProgress;
        if (nextCount > objective.targetCount) {
          throw new ConflictException("Progress cannot exceed the objective target.");
        }

        await raidTx.raidLog.create({
          data: {
            raidId: raid.id,
            objectiveId: objective.id,
            userId,
            deltaProgress,
            note,
          },
        });

        const now = new Date();
        await raidTx.raidObjective.update({
          where: { id: objective.id },
          data: {
            currentCount: nextCount,
            isCompleted: nextCount >= objective.targetCount,
            completedAt: nextCount >= objective.targetCount ? now : null,
          },
        });

        const refreshedRaid = await raidTx.raid.findUniqueOrThrow({
          where: { id: raid.id },
          include: {
            objectives: {
              orderBy: { sortOrder: "asc" },
            },
            attributeMap: true,
            template: true,
          },
        });

        const readyForVerification = refreshedRaid.objectives.every(
          (item: RaidObjectiveRecord) => item.isCompleted,
        );
        if (readyForVerification && refreshedRaid.status === "active") {
          await raidTx.raid.update({
            where: { id: raid.id },
            data: { status: "verification_pending" },
          });
          refreshedRaid.status = "verification_pending";
        }

        return {
          raid: this.toRaidResponse(refreshedRaid),
          objective: this.toObjectiveResponse(
            (refreshedRaid.objectives.find((item: RaidObjectiveRecord) => item.id === objective.id) ??
              objective) as RaidObjectiveRecord,
          ),
        };
      },
      { isolationLevel: "Serializable" },
    );

    if (result.raid.ready_for_verification) {
      await this.guideService.emitTriggeredMessage(userId, {
        screen: "missions",
        triggerType: "raid_ready_for_verification",
        triggerKey: `raid-ready:${result.raid.id}`,
        priority: 88,
        stateVariant: "battle",
        fallbackTitle: "Verification unlocked",
        fallbackBody: `${result.raid.title} is ready for verification. Write the summary cleanly and close the arc with intent.`,
        currentState: {
          raid_title: result.raid.title,
        },
      });
    } else if (result.objective.is_completed) {
      await this.guideService.emitTriggeredMessage(userId, {
        screen: "missions",
        triggerType: "raid_objective_completion",
        triggerKey: `raid-objective:${result.objective.id}:${result.objective.current_count}`,
        priority: 58,
        stateVariant: "bold",
        fallbackTitle: "Raid objective closed",
        fallbackBody: `${result.objective.title} is finished. This arc is asking for real closure, not half-finished motion.`,
        currentState: {
          raid_title: result.raid.title,
          objective_title: result.objective.title,
        },
      });
    }

    return result;
  }

  async completeRaid(
    userId: string,
    raidId: string,
    input: RaidCompletionInput,
  ): Promise<RaidCompletionRewardData> {
    const verificationSummary = input.verification_summary?.trim() ?? "";
    const artifactReference = input.artifact_reference?.trim() || null;

    if (verificationSummary.length < MIN_RAID_COMPLETION_SUMMARY_LENGTH) {
      throw new ConflictException(
        `verification_summary must be at least ${MIN_RAID_COMPLETION_SUMMARY_LENGTH} characters.`,
      );
    }

    if (artifactReference && artifactReference.length > MAX_ARTIFACT_REFERENCE_LENGTH) {
      throw new ConflictException("artifact_reference is too long.");
    }

    const prisma = this.prisma as RaidPrismaClient;
    const completion = await prisma.$transaction(
      async (tx) => {
        const raidTx = tx as RaidPrismaClient;
        const raid = await raidTx.raid.findUnique({
          where: { id: raidId },
          include: {
            objectives: {
              orderBy: { sortOrder: "asc" },
            },
            attributeMap: true,
            template: true,
          },
        });

        if (!raid || raid.userId !== userId) {
          throw new NotFoundException("Raid not found.");
        }

        if (raid.status === "completed") {
          throw new ConflictException("Raid is already completed.");
        }

        if (raid.status === "cancelled") {
          throw new ConflictException("Raid is cancelled.");
        }

        if (!raid.objectives.every((objective: RaidObjectiveRecord) => objective.isCompleted)) {
          throw new ConflictException("All raid objectives must be completed first.");
        }

        const durationMs = Date.now() - raid.startedAt.getTime();
        if (durationMs < MIN_RAID_COMPLETION_WINDOW_HOURS * 60 * 60 * 1000) {
          throw new ConflictException(
            `Raid completion requires at least ${MIN_RAID_COMPLETION_WINDOW_HOURS} hours from start.`,
          );
        }

        if (!raid.attributeMap.length) {
          throw new InternalServerErrorException("Raid attribute mapping is missing.");
        }

        const profile = await tx.userProfile.findUnique({
          where: { userId },
          select: { totalXp: true },
        });

        if (!profile) {
          throw new NotFoundException("User profile not found.");
        }

        const affectedAttributes = await tx.userAttribute.findMany({
          where: {
            userId,
            attributeCode: {
              in: raid.attributeMap.map((entry: RaidAttributeMapRecord) => entry.attributeCode),
            },
          },
        });

        const attributeByCode = new Map(
          affectedAttributes.map((attribute: UserAttribute) => [attribute.attributeCode, attribute]),
        );
        const totalAttributeGain = this.getTotalAttributeGain(raid.metadata);
        const totalWeight = raid.attributeMap.reduce(
          (sum: number, entry: RaidAttributeMapRecord) => sum + decimalToNumber(entry.weight),
          0,
        );

        if (totalWeight <= 0) {
          throw new InternalServerErrorException("Raid attribute weights are invalid.");
        }

        const attributeChanges = raid.attributeMap.map((entry: RaidAttributeMapRecord) => {
          const current = attributeByCode.get(entry.attributeCode);
          if (!current) {
            throw new InternalServerErrorException(`User attribute ${entry.attributeCode} is missing.`);
          }

          return this.calculateAttributeChange(
            current,
            entry.attributeCode,
            decimalToNumber(entry.weight),
            totalWeight,
            totalAttributeGain,
          );
        });

        const now = new Date();
        const xpAwarded = raid.rewardXpBase;
        const newTotalXp = profile.totalXp + xpAwarded;
        const newLevel = this.calculateLevel(newTotalXp);

        await raidTx.raid.update({
          where: { id: raid.id },
          data: {
            status: "completed",
            completedAt: now,
            verificationSummary,
            artifactReference,
          },
        });

        await tx.xpLedger.create({
          data: {
            userId,
            raidId: raid.id,
            source: "raid_completion",
            deltaXp: xpAwarded,
            totalXpAfter: newTotalXp,
            metadata: {
              raid_title: raid.title,
              objective_count: raid.objectives.length,
              rank_significance: "soft_only",
            },
          } as any,
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
              raidId: raid.id,
              attributeCode: change.code,
              delta: change.delta,
              previousValue: change.previousValue,
              newValue: change.newValue,
            } as any,
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
          xp_awarded: xpAwarded,
          attribute_changes: attributeChanges.map((change: any) => ({
            code: change.code,
            delta: change.delta,
          })),
          new_total_xp: newTotalXp,
          new_level: newLevel,
          raid_status: "completed" as const,
          completion_message: "Raid complete. This milestone carries rank significance, but does not hard-gate rank progression yet.",
        };
      },
      { isolationLevel: "Serializable" },
    );

    await this.guideService.emitTriggeredMessage(userId, {
      screen: "missions",
      triggerType: "raid_completion",
      triggerKey: `raid-completion:${raidId}`,
      priority: 100,
      stateVariant: "battle",
      fallbackTitle: "Raid complete",
      fallbackBody: "The raid is finished. This was not a daily task dressed up as one; it was a real milestone.",
      currentState: {
        raid_id: raidId,
        xp_awarded: completion.xp_awarded,
        new_level: completion.new_level,
      },
    });

    return completion;
  }

  private toRaidResponse(raid: RaidRecord): RaidResponseData {
    const totalObjectives = raid.objectives.length;
    const completedObjectives = raid.objectives.filter(
      (objective: RaidObjectiveRecord) => objective.isCompleted,
    ).length;
    const metadata = this.getTemplateMetadata(raid.metadata);

    return {
      id: raid.id,
      template_id: raid.templateId,
      status: raid.status,
      title: raid.title,
      description: raid.description,
      difficulty: raid.difficulty,
      reward_xp_base: raid.rewardXpBase,
      started_at: dateToIso(raid.startedAt) ?? raid.startedAt.toISOString(),
      completed_at: dateToIso(raid.completedAt),
      generated_by: raid.generatedBy,
      expected_duration_days:
        raid.template?.expectedDurationDays ??
        (typeof metadata.expected_duration_days === "number" ? metadata.expected_duration_days : null),
      verification_summary: raid.verificationSummary,
      artifact_reference: raid.artifactReference,
      ready_for_verification:
        raid.objectives.length > 0 &&
        raid.objectives.every((objective: RaidObjectiveRecord) => objective.isCompleted),
      minimum_completion_window_hours: MIN_RAID_COMPLETION_WINDOW_HOURS,
      progress: {
        completed_objectives: completedObjectives,
        total_objectives: totalObjectives,
        completion_ratio:
          totalObjectives === 0 ? 0 : Math.round((completedObjectives / totalObjectives) * 100) / 100,
      },
      objectives: raid.objectives.map((objective: RaidObjectiveRecord) =>
        this.toObjectiveResponse(objective),
      ),
    };
  }

  private toObjectiveResponse(objective: RaidObjectiveRecord): RaidObjectiveResponseData {
    return {
      id: objective.id,
      objective_code: objective.objectiveCode,
      title: objective.title,
      description: objective.description,
      target_count: objective.targetCount,
      current_count: objective.currentCount,
      remaining_count: Math.max(objective.targetCount - objective.currentCount, 0),
      is_completed: objective.isCompleted,
      completed_at: dateToIso(objective.completedAt),
      requires_verification: objective.requiresVerification,
      sort_order: objective.sortOrder,
    };
  }

  private getTemplateMetadata(metadata: Prisma.JsonValue): RaidTemplateMetadata {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return {};
    }

    return metadata as RaidTemplateMetadata;
  }

  private getTotalAttributeGain(metadata: Prisma.JsonValue): number {
    const effortLayer = this.getTemplateMetadata(metadata).effort_layer ?? "raid";
    return ATTRIBUTE_GAIN_BY_EFFORT_LAYER[effortLayer];
  }

  private calculateAttributeChange(
    current: UserAttribute,
    code: RaidAttributeMapRecord["attributeCode"],
    weight: number,
    totalWeight: number,
    totalGain: number,
  ) {
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
