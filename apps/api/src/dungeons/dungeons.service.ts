import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  Dungeon,
  DungeonAttributeMap,
  DungeonObjective,
  DungeonTemplate,
  DungeonTemplateObjective,
  UserAttribute,
} from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type {
  ActiveDungeonPayloadData,
  DungeonCompletionRewardData,
  DungeonLogInput,
  DungeonLogResponseData,
  DungeonResponseData,
  StartDungeonInput,
} from "@kshetra/types";

import { dateToIso, decimalToNumber } from "../common/http/serializers";
import { GuideService } from "../guide/guide.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

type DungeonTemplateMetadata = {
  effort_layer?: "micro" | "structured" | "dungeon" | "raid";
  attribute_weights?: Array<{
    code: "strength" | "wisdom" | "focus" | "mastery" | "wealth" | "bond";
    weight: number;
  }>;
  expected_duration_days?: number;
};

type DungeonRecord = Dungeon & {
  objectives: DungeonObjective[];
  attributeMap: DungeonAttributeMap[];
  template: DungeonTemplate | null;
};

const ATTRIBUTE_GAIN_BY_EFFORT_LAYER = {
  micro: 1.5,
  structured: 3.0,
  dungeon: 6.0,
  raid: 10.0,
} as const;

const MAX_DUNGEON_LOG_NOTE_LENGTH = 280;
const MAX_DUNGEON_LOG_DELTA = 1;

@Injectable()
export class DungeonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly guideService: GuideService,
  ) {}

  async getActiveDungeon(userId: string): Promise<ActiveDungeonPayloadData> {
    await this.usersService.assertUserExists(userId);

    const [activeDungeon, templates] = await Promise.all([
      this.prisma.dungeon.findFirst({
        where: {
          userId,
          status: "active",
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
      this.prisma.dungeonTemplate.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    return {
      active_dungeon: activeDungeon ? this.toDungeonResponse(activeDungeon) : null,
      available_templates: templates.map((template) => ({
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

  async startDungeon(userId: string, input: StartDungeonInput): Promise<ActiveDungeonPayloadData> {
    if (!input.template_id?.trim()) {
      throw new ConflictException("template_id is required.");
    }

    await this.usersService.assertUserExists(userId);

    try {
      const created = await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.dungeon.findFirst({
            where: { userId, status: "active" },
            include: {
              objectives: { orderBy: { sortOrder: "asc" } },
              attributeMap: true,
              template: true,
            },
          });

          if (existing) {
            return existing;
          }

          const template = await tx.dungeonTemplate.findUnique({
            where: { id: input.template_id.trim() },
            include: {
              objectives: {
                orderBy: { sortOrder: "asc" },
              },
            },
          });

          if (!template || !template.isActive) {
            throw new NotFoundException("Dungeon template not found.");
          }

          if (!template.objectives.length) {
            throw new InternalServerErrorException("Dungeon template objectives are missing.");
          }

          const metadata = this.getTemplateMetadata(template.metadata);
          const weights = metadata.attribute_weights ?? [];
          if (!weights.length) {
            throw new InternalServerErrorException("Dungeon template attribute weights are missing.");
          }

          const dungeon = await tx.dungeon.create({
            data: {
              userId,
              templateId: template.id,
              title: template.title,
              description: template.description,
              difficulty: template.difficulty,
              rewardXpBase: template.rewardXpBase,
              generatedBy: "system",
              expiresAt: null,
              metadata: template.metadata as Prisma.InputJsonValue,
            },
          });

          await tx.dungeonObjective.createMany({
            data: template.objectives.map((objective) => ({
              dungeonId: dungeon.id,
              templateObjectiveId: objective.id,
              objectiveCode: objective.objectiveCode,
              title: objective.title,
              description: objective.description,
              targetCount: objective.targetCount,
              currentCount: 0,
              sortOrder: objective.sortOrder,
              metadata: objective.metadata as Prisma.InputJsonValue,
            })),
          });

          await tx.dungeonAttributeMap.createMany({
            data: weights.map((weight) => ({
              dungeonId: dungeon.id,
              attributeCode: weight.code,
              weight: weight.weight,
            })),
          });

          return tx.dungeon.findUniqueOrThrow({
            where: { id: dungeon.id },
            include: {
              objectives: { orderBy: { sortOrder: "asc" } },
              attributeMap: true,
              template: true,
            },
          });
        },
        {
          isolationLevel: "Serializable",
        },
      );

      const templates = await this.prisma.dungeonTemplate.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });

      return {
        active_dungeon: this.toDungeonResponse(created),
        available_templates: templates.map((template) => ({
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
        throw new ConflictException("Only one active dungeon is allowed at a time.");
      }

      throw error;
    }
  }

  async logObjectiveProgress(
    userId: string,
    dungeonId: string,
    objectiveId: string,
    input: DungeonLogInput,
  ): Promise<DungeonLogResponseData> {
    const deltaProgress = input.delta_progress ?? 1;
    const note = input.note?.trim() ? input.note.trim() : null;

    if (!Number.isInteger(deltaProgress) || deltaProgress < 1 || deltaProgress > MAX_DUNGEON_LOG_DELTA) {
      throw new ConflictException(`delta_progress must be an integer between 1 and ${MAX_DUNGEON_LOG_DELTA}.`);
    }

    if (note && note.length > MAX_DUNGEON_LOG_NOTE_LENGTH) {
      throw new ConflictException("Dungeon note is too long.");
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const dungeon = await tx.dungeon.findUnique({
          where: { id: dungeonId },
          include: {
            objectives: {
              orderBy: { sortOrder: "asc" },
            },
            attributeMap: true,
            template: true,
          },
        });

        if (!dungeon || dungeon.userId !== userId) {
          throw new NotFoundException("Dungeon not found.");
        }

        if (dungeon.status === "completed") {
          throw new ConflictException("Dungeon is already completed.");
        }

        if (dungeon.status !== "active") {
          throw new ConflictException("Dungeon is not active.");
        }

        const objective = dungeon.objectives.find((item) => item.id === objectiveId);
        if (!objective) {
          throw new NotFoundException("Dungeon objective not found.");
        }

        if (objective.isCompleted) {
          throw new ConflictException("Objective is already completed.");
        }

        const nextCount = objective.currentCount + deltaProgress;
        if (nextCount > objective.targetCount) {
          throw new ConflictException("Progress cannot exceed the objective target.");
        }

        await tx.dungeonLog.create({
          data: {
            dungeonId: dungeon.id,
            objectiveId: objective.id,
            userId,
            deltaProgress,
            note,
          },
        });

        const now = new Date();
        const updatedObjective = await tx.dungeonObjective.update({
          where: { id: objective.id },
          data: {
            currentCount: nextCount,
            isCompleted: nextCount >= objective.targetCount,
            completedAt: nextCount >= objective.targetCount ? now : null,
          },
        });

        const refreshedDungeon = await tx.dungeon.findUniqueOrThrow({
          where: { id: dungeon.id },
          include: {
            objectives: {
              orderBy: { sortOrder: "asc" },
            },
            attributeMap: true,
            template: true,
          },
        });

        const allCompleted = refreshedDungeon.objectives.every((item) => item.isCompleted);
        let reward: DungeonCompletionRewardData | null = null;

        if (allCompleted && refreshedDungeon.status === "active") {
          reward = await this.completeDungeon(tx, refreshedDungeon, userId, now);
          refreshedDungeon.status = "completed";
          refreshedDungeon.completedAt = now;
        }

        const finalDungeon = reward
          ? await tx.dungeon.findUniqueOrThrow({
              where: { id: dungeon.id },
              include: {
                objectives: {
                  orderBy: { sortOrder: "asc" },
                },
                attributeMap: true,
                template: true,
              },
            })
          : refreshedDungeon;

        return {
          dungeon: this.toDungeonResponse(finalDungeon),
          objective: this.toObjectiveResponse(updatedObjective),
          dungeon_completed: Boolean(reward),
          reward,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    if (result.dungeon_completed && result.reward) {
      await this.guideService.emitTriggeredMessage(userId, {
        screen: "missions",
        triggerType: "dungeon_completion",
        triggerKey: `dungeon-completion:${result.dungeon.id}`,
        priority: 90,
        stateVariant: "battle",
        fallbackTitle: "Dungeon complete",
        fallbackBody: `${result.dungeon.title} is closed. The arc held across multiple sessions, and that weight now counts.`,
        currentState: {
          dungeon_title: result.dungeon.title,
          xp_awarded: result.reward.xp_awarded,
        },
      });
    } else if (result.objective.is_completed) {
      await this.guideService.emitTriggeredMessage(userId, {
        screen: "missions",
        triggerType: "dungeon_objective_completion",
        triggerKey: `dungeon-objective:${result.objective.id}:${result.objective.current_count}`,
        priority: 52,
        stateVariant: "bold",
        fallbackTitle: "Objective closed",
        fallbackBody: `${result.objective.title} is locked. Keep the dungeon moving before the pressure diffuses.`,
        currentState: {
          dungeon_title: result.dungeon.title,
          objective_title: result.objective.title,
        },
      });
    }

    return result;
  }

  private async completeDungeon(
    tx: Prisma.TransactionClient,
    dungeon: DungeonRecord,
    userId: string,
    now: Date,
  ): Promise<DungeonCompletionRewardData> {
    if (dungeon.attributeMap.length === 0) {
      throw new InternalServerErrorException("Dungeon attribute mapping is missing.");
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
          in: dungeon.attributeMap.map((entry) => entry.attributeCode),
        },
      },
    });

    const attributeByCode = new Map(
      affectedAttributes.map((attribute) => [attribute.attributeCode, attribute]),
    );
    const totalAttributeGain = this.getTotalAttributeGain(dungeon.metadata);
    const totalWeight = dungeon.attributeMap.reduce((sum, entry) => sum + decimalToNumber(entry.weight), 0);

    if (totalWeight <= 0) {
      throw new InternalServerErrorException("Dungeon attribute weights are invalid.");
    }

    const attributeChanges = dungeon.attributeMap.map((entry) => {
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

    const xpAwarded = dungeon.rewardXpBase;
    const newTotalXp = profile.totalXp + xpAwarded;
    const newLevel = this.calculateLevel(newTotalXp);

    await tx.dungeon.update({
      where: { id: dungeon.id },
      data: {
        status: "completed",
        completedAt: now,
      },
    });

    await tx.xpLedger.create({
      data: {
        userId,
        dungeonId: dungeon.id,
        source: "dungeon_completion",
        deltaXp: xpAwarded,
        totalXpAfter: newTotalXp,
        metadata: {
          dungeon_title: dungeon.title,
          objective_count: dungeon.objectives.length,
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
          dungeonId: dungeon.id,
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
      xp_awarded: xpAwarded,
      attribute_changes: attributeChanges.map((change) => ({
        code: change.code,
        delta: change.delta,
      })),
      new_total_xp: newTotalXp,
      new_level: newLevel,
      dungeon_status: "completed",
    };
  }

  private toDungeonResponse(dungeon: DungeonRecord): DungeonResponseData {
    const totalObjectives = dungeon.objectives.length;
    const completedObjectives = dungeon.objectives.filter((objective) => objective.isCompleted).length;
    const metadata = this.getTemplateMetadata(dungeon.metadata);

    return {
      id: dungeon.id,
      template_id: dungeon.templateId,
      status: dungeon.status,
      title: dungeon.title,
      description: dungeon.description,
      difficulty: dungeon.difficulty,
      reward_xp_base: dungeon.rewardXpBase,
      started_at: dateToIso(dungeon.startedAt) ?? dungeon.startedAt.toISOString(),
      expires_at: dateToIso(dungeon.expiresAt),
      completed_at: dateToIso(dungeon.completedAt),
      generated_by: dungeon.generatedBy,
      expected_duration_days:
        dungeon.template?.expectedDurationDays ??
        (typeof metadata.expected_duration_days === "number" ? metadata.expected_duration_days : null),
      progress: {
        completed_objectives: completedObjectives,
        total_objectives: totalObjectives,
        completion_ratio:
          totalObjectives === 0 ? 0 : Math.round((completedObjectives / totalObjectives) * 100) / 100,
      },
      objectives: dungeon.objectives.map((objective) => this.toObjectiveResponse(objective)),
    };
  }

  private toObjectiveResponse(objective: DungeonObjective) {
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
      sort_order: objective.sortOrder,
    };
  }

  private getTemplateMetadata(metadata: Prisma.JsonValue): DungeonTemplateMetadata {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return {};
    }

    return metadata as DungeonTemplateMetadata;
  }

  private getTotalAttributeGain(metadata: Prisma.JsonValue): number {
    const effortLayer = this.getTemplateMetadata(metadata).effort_layer ?? "dungeon";
    return ATTRIBUTE_GAIN_BY_EFFORT_LAYER[effortLayer];
  }

  private calculateAttributeChange(
    current: UserAttribute,
    code: DungeonAttributeMap["attributeCode"],
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
