import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type {
  Prisma,
  Quest,
  QuestAttributeMap,
  QuestTemplate,
  QuestLogIntensity,
  UserAttribute,
} from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type {
  DailyQuestBundleData,
  QuestCompletionInput,
  QuestCompletionResponseData,
  QuestResponseData,
} from "@kshetra/types";
import { QUEST_LOG_INTENSITIES } from "@kshetra/types";

import {
  AiPlannerService,
  type AiPlannerInput,
} from "../ai/ai-planner.service";
import {
  AiQuestValidatorService,
  type ValidatedDailyQuestPlan,
} from "../ai/ai-quest-validator.service";
import { decimalToNumber, dateToIso } from "../common/http/serializers";
import { PrismaService } from "../prisma/prisma.service";
import { StreakService } from "../streak/streak.service";
import { UsersService } from "../users/users.service";

type QuestTemplateMetadata = {
  effort_layer?: "micro" | "structured" | "dungeon" | "raid";
  attribute_weights?: Array<{
    code: "strength" | "wisdom" | "focus" | "mastery" | "wealth" | "bond";
    weight: number;
  }>;
};

type QuestRecord = Quest & {
  attributeMap: QuestAttributeMap[];
};

type DailyTemplateSet = {
  mandatory: QuestTemplate[];
  optional: QuestTemplate[];
  stretch: QuestTemplate[];
  all: QuestTemplate[];
};

const DAILY_TEMPLATE_COUNTS = {
  mandatory: 3,
  optional: 2,
  stretch: 1,
} as const;

const ATTRIBUTE_GAIN_BY_EFFORT_LAYER = {
  micro: 1.5,
  structured: 3.0,
  dungeon: 6.0,
  raid: 10.0,
} as const;

const MAX_COMPLETION_NOTE_LENGTH = 280;
const MAX_DAILY_BUNDLE_GENERATION_RETRIES = 3;

@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly streakService: StreakService,
    private readonly aiPlannerService: AiPlannerService,
    private readonly aiQuestValidatorService: AiQuestValidatorService,
  ) {}

  async getTodayBundle(userId: string): Promise<DailyQuestBundleData> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const localDate = this.getLocalDateString(user.timezone);
    const assignedDate = this.toDateOnly(localDate);

    await this.expirePreviousDailyQuests(userId, assignedDate);

    const existing = await this.findDailyBundle(userId, assignedDate);
    if (existing.length > 0) {
      return this.toDailyBundle(existing, localDate);
    }

    const templates = await this.loadDailyTemplates(this.prisma);
    const aiAttempt = await this.tryAiDailyPlan(userId, user, localDate, templates);

    const acceptedGenerationId =
      aiAttempt.status === "accepted"
        ? await this.persistAiGenerationAttempt({
            userId,
            attempt: aiAttempt,
          })
        : null;

    if (aiAttempt.status !== "accepted") {
      await this.persistAiGenerationAttempt({
        userId,
        attempt: aiAttempt,
      });
    }

    const bundle = await this.runDailyBundleTransactionWithRetry({
      userId,
      assignedDate,
      templates: this.resolveSelectedTemplates(templates, aiAttempt.validatedPlan),
      generatedBy: aiAttempt.generatedBy,
      aiGenerationId: acceptedGenerationId,
    });

    return this.toDailyBundle(bundle, localDate);
  }

  private async runDailyBundleTransactionWithRetry(input: {
    userId: string;
    assignedDate: Date;
    templates: QuestTemplate[];
    generatedBy: "ai" | "template";
    aiGenerationId: string | null;
  }): Promise<QuestRecord[]> {
    for (let attempt = 1; attempt <= MAX_DAILY_BUNDLE_GENERATION_RETRIES; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const existing = await tx.quest.findMany({
              where: {
                userId: input.userId,
                questType: "daily",
                assignedDate: input.assignedDate,
              },
              include: {
                attributeMap: true,
              },
              orderBy: [{ isMandatory: "desc" }, { isStretch: "asc" }, { createdAt: "asc" }],
            });

            if (existing.length === 0) {
              await this.createDailyQuestsFromTemplates(tx, input);
            }

            return await tx.quest.findMany({
              where: {
                userId: input.userId,
                questType: "daily",
                assignedDate: input.assignedDate,
              },
              include: {
                attributeMap: true,
              },
              orderBy: [{ isMandatory: "desc" }, { isStretch: "asc" }, { createdAt: "asc" }],
            });
          },
          {
            isolationLevel: "Serializable",
          },
        );
      } catch (error) {
        if (this.isRetryableDailyBundleConflict(error) && attempt < MAX_DAILY_BUNDLE_GENERATION_RETRIES) {
          continue;
        }

        throw error;
      }
    }

    throw new InternalServerErrorException("Daily quest generation could not be completed.");
  }

  async completeQuest(
    userId: string,
    questId: string,
    input: QuestCompletionInput,
  ): Promise<QuestCompletionResponseData> {
    this.validateCompletionInput(input);

    const user = await this.usersService.getUserStateOrThrow(userId);
    const localDate = this.getLocalDateString(user.timezone);
    const assignedDate = this.toDateOnly(localDate);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const quest = await tx.quest.findUnique({
            where: { id: questId },
            include: {
              attributeMap: true,
            },
          });

          if (!quest || quest.userId !== userId) {
            throw new NotFoundException("Quest not found.");
          }

          if (quest.status === "completed") {
            throw new ConflictException("Quest is already completed.");
          }

          if (quest.status !== "active") {
            throw new ConflictException("Quest is not active.");
          }

          if (quest.assignedDate.getTime() !== assignedDate.getTime()) {
            throw new ConflictException("Quest has expired.");
          }

          if (quest.attributeMap.length === 0) {
            throw new InternalServerErrorException("Quest attribute mapping is missing.");
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
                in: quest.attributeMap.map((item) => item.attributeCode),
              },
            },
          });

          const attributeByCode = new Map(
            affectedAttributes.map((attribute) => [attribute.attributeCode, attribute]),
          );
          const totalAttributeGain = this.getTotalAttributeGain(quest.metadata);
          const totalWeight = quest.attributeMap.reduce(
            (sum, entry) => sum + decimalToNumber(entry.weight),
            0,
          );

          if (totalWeight <= 0) {
            throw new InternalServerErrorException("Quest attribute weights are invalid.");
          }

          // Phase 2 intentionally reads the copied quest-instance map here. Template
          // weights are only used during assignment, never during completion.
          const attributeChanges = quest.attributeMap.map((entry) => {
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

          const xpAwarded = quest.rewardXpBase;
          const newTotalXp = profile.totalXp + xpAwarded;
          const newLevel = this.calculateLevel(newTotalXp);

          await tx.questLog.create({
            data: {
              questId: quest.id,
              userId,
              completed: true,
              intensity: (input.intensity ?? null) as QuestLogIntensity | null,
              note: input.note?.trim() ? input.note.trim() : null,
            },
          });

          await tx.quest.update({
            where: { id: quest.id },
            data: {
              status: "completed",
              completedAt: new Date(),
            },
          });

          await tx.xpLedger.create({
            data: {
              userId,
              questId: quest.id,
              source: "quest_completion",
              deltaXp: xpAwarded,
              totalXpAfter: newTotalXp,
              metadata: {
                quest_type: quest.questType,
                quest_title: quest.title,
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
                lastUpdatedAt: new Date(),
              },
            });

            await tx.userAttributeHistory.create({
              data: {
                userId,
                questId: quest.id,
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

          const streakResult = await this.streakService.evaluateDayAfterQuestCompletion(
            tx,
            userId,
            user.timezone,
          );

          const finalTotalXp = streakResult.totalXpAfterBonuses ?? newTotalXp;
          const finalLevel = streakResult.levelAfterBonuses ?? newLevel;

          return {
            quest_id: quest.id,
            xp_awarded: xpAwarded,
            attribute_changes: attributeChanges.map((change) => ({
              code: change.code,
              delta: change.delta,
            })),
            new_total_xp: finalTotalXp,
            new_level: finalLevel,
            quest_status: "completed",
            streak_bonus_xp: streakResult.streakBonusXp || undefined,
            current_streak_days: streakResult.currentStreakDays || undefined,
            day_became_valid: streakResult.dayBecameValid || undefined,
            // Rank promotion remains deferred. Phase 3 only makes rank progress
            // more visible while streaks and valid-day logic become authoritative.
            rank_up: false,
          };
        },
        {
          isolationLevel: "Serializable",
        },
      );
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Quest completion was already recorded.");
      }

      throw error;
    }
  }

  private async loadDailyTemplates(
    tx: Prisma.TransactionClient | PrismaService,
  ): Promise<DailyTemplateSet> {
    const [mandatory, optional, stretch] = await Promise.all([
      tx.questTemplate.findMany({
        where: {
          isActive: true,
          questType: "daily",
          assignmentKind: "mandatory",
        },
        orderBy: { sortOrder: "asc" },
        take: DAILY_TEMPLATE_COUNTS.mandatory,
      }),
      tx.questTemplate.findMany({
        where: {
          isActive: true,
          questType: "daily",
          assignmentKind: "optional",
        },
        orderBy: { sortOrder: "asc" },
        take: DAILY_TEMPLATE_COUNTS.optional,
      }),
      tx.questTemplate.findMany({
        where: {
          isActive: true,
          questType: "daily",
          assignmentKind: "stretch",
        },
        orderBy: { sortOrder: "asc" },
        take: DAILY_TEMPLATE_COUNTS.stretch,
      }),
    ]);

    const templates = [...mandatory, ...optional, ...stretch];

    if (
      mandatory.length !== DAILY_TEMPLATE_COUNTS.mandatory ||
      optional.length !== DAILY_TEMPLATE_COUNTS.optional
    ) {
      throw new InternalServerErrorException(
        "Daily quest templates are not seeded correctly.",
      );
    }

    return {
      mandatory,
      optional,
      stretch,
      all: templates,
    };
  }

  private async expirePreviousDailyQuests(
    userId: string,
    assignedDate: Date,
  ): Promise<void> {
    await this.prisma.quest.updateMany({
      where: {
        userId,
        questType: "daily",
        status: "active",
        assignedDate: { lt: assignedDate },
      },
      data: {
        status: "expired",
      },
    });
  }

  private async findDailyBundle(
    userId: string,
    assignedDate: Date,
  ): Promise<QuestRecord[]> {
    return this.prisma.quest.findMany({
      where: {
        userId,
        questType: "daily",
        assignedDate,
      },
      include: {
        attributeMap: true,
      },
      orderBy: [{ isMandatory: "desc" }, { isStretch: "asc" }, { createdAt: "asc" }],
    });
  }

  private async tryAiDailyPlan(
    userId: string,
    user: Awaited<ReturnType<UsersService["getUserStateOrThrow"]>>,
    localDate: string,
    templates: DailyTemplateSet,
  ): Promise<{
    status: "accepted" | "rejected" | "failed" | "fallback_used";
    generatedBy: "ai" | "template";
    provider: string | null;
    model: string | null;
    requestPayload: Record<string, unknown>;
    rawResponseText: string | null;
    validatedOutput: Prisma.InputJsonValue | null;
    rejectionReasons: Prisma.InputJsonValue | null;
    validatedPlan: ValidatedDailyQuestPlan | null;
  }> {
    if (!this.aiPlannerService.isConfigured()) {
      return {
        status: "fallback_used",
        generatedBy: "template",
        provider: null,
        model: null,
        requestPayload: {},
        rawResponseText: null,
        validatedOutput: null,
        rejectionReasons: ["AI planner is not configured."],
        validatedPlan: null,
      };
    }

    const [goals, attributes] = await Promise.all([
      this.prisma.userGoal.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.userAttribute.findMany({
        where: { userId },
        orderBy: { attributeCode: "asc" },
      }),
    ]);

    const input: AiPlannerInput = {
      user_id: userId,
      timezone: user.timezone,
      local_date: localDate,
      profile: {
        current_rank: user.profile.currentRank,
        current_level: user.profile.currentLevel,
        total_xp: user.profile.totalXp,
        current_streak_days: user.streak.currentStreakDays,
      },
      goals: goals.map((goal) => ({
        goal_type: goal.goalType,
        title: goal.title,
        description: goal.description,
        priority_weight: decimalToNumber(goal.priorityWeight),
      })),
      attributes: attributes.map((attribute) => ({
        code: attribute.attributeCode,
        value: decimalToNumber(attribute.value),
        cap: decimalToNumber(attribute.cap),
      })),
      allowed_templates: templates.all.map((template) => ({
        code: template.code,
        title: template.title,
        description: template.description,
        assignment_kind: template.assignmentKind,
        difficulty: template.difficulty,
      })),
      hard_rules: {
        mandatory_count: DAILY_TEMPLATE_COUNTS.mandatory,
        optional_count: DAILY_TEMPLATE_COUNTS.optional,
        stretch_count: DAILY_TEMPLATE_COUNTS.stretch,
        allowed_template_codes: templates.all.map((template) => template.code),
        allow_template_invention: false,
        allow_scoring_fields: false,
        allow_progression_mutation: false,
      },
    };

    const result = await this.aiPlannerService.planDailyQuests(input);

    if (result.status !== "success") {
      return {
        status: result.status === "skipped" ? "fallback_used" : "failed",
        generatedBy: "template",
        provider: result.provider,
        model: result.model,
        requestPayload: result.request_payload,
        rawResponseText: result.raw_response_text,
        validatedOutput: null,
        rejectionReasons: result.failure_reason ? [result.failure_reason] : null,
        validatedPlan: null,
      };
    }

    const validation = this.aiQuestValidatorService.validateDailyPlan(
      result.parsed_output,
      templates.all.map((template) => ({
        code: template.code,
        assignment_kind: template.assignmentKind,
      })),
    );

    if (!validation.valid || !validation.normalized) {
      return {
        status: "rejected",
        generatedBy: "template",
        provider: result.provider,
        model: result.model,
        requestPayload: result.request_payload,
        rawResponseText: result.raw_response_text,
        validatedOutput: null,
        rejectionReasons: validation.rejection_reasons,
        validatedPlan: null,
      };
    }

    return {
      status: "accepted",
      generatedBy: "ai",
      provider: result.provider,
      model: result.model,
      requestPayload: result.request_payload,
      rawResponseText: result.raw_response_text,
      validatedOutput: validation.normalized as unknown as Prisma.InputJsonValue,
      rejectionReasons: null,
      validatedPlan: validation.normalized,
    };
  }

  private resolveSelectedTemplates(
    templates: DailyTemplateSet,
    validatedPlan: ValidatedDailyQuestPlan | null,
  ): QuestTemplate[] {
    if (!validatedPlan) {
      return [...templates.mandatory, ...templates.optional, ...templates.stretch];
    }

    const templateByCode = new Map(templates.all.map((template) => [template.code, template]));

    return [
      ...validatedPlan.mandatory.map((code) => this.requireTemplate(templateByCode, code)),
      ...validatedPlan.optional.map((code) => this.requireTemplate(templateByCode, code)),
      ...validatedPlan.stretch.map((code) => this.requireTemplate(templateByCode, code)),
    ];
  }

  private requireTemplate(
    templateByCode: Map<string, QuestTemplate>,
    code: string,
  ): QuestTemplate {
    const template = templateByCode.get(code);

    if (!template) {
      throw new InternalServerErrorException(`Template ${code} was not found.`);
    }

    return template;
  }

  private async persistAiGenerationAttempt(
    input: {
      userId: string;
      attempt: {
        status: "accepted" | "rejected" | "failed" | "fallback_used";
        provider: string | null;
        model: string | null;
        requestPayload: Record<string, unknown>;
        rawResponseText: string | null;
        validatedOutput: Prisma.InputJsonValue | null;
        rejectionReasons: Prisma.InputJsonValue | null;
      };
    },
  ): Promise<string | null> {
    const { attempt, userId } = input;

    const record = await this.prisma.aiGeneration.create({
      data: {
        userId,
        generationType: "daily_quest_plan",
        status: attempt.status,
        provider: attempt.provider,
        modelName: attempt.model,
        requestPayload: attempt.requestPayload as Prisma.InputJsonValue,
        rawResponseText: attempt.rawResponseText,
        validatedOutput: attempt.validatedOutput ?? undefined,
        rejectionReasons: attempt.rejectionReasons ?? undefined,
        createdQuestsCount:
          attempt.status === "accepted"
            ? DAILY_TEMPLATE_COUNTS.mandatory +
              DAILY_TEMPLATE_COUNTS.optional +
              DAILY_TEMPLATE_COUNTS.stretch
            : 0,
      },
      select: { id: true },
    });

    return attempt.status === "accepted" ? record.id : null;
  }

  private async createDailyQuestsFromTemplates(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      assignedDate: Date;
      templates: QuestTemplate[];
      generatedBy: "ai" | "template";
      aiGenerationId: string | null;
    },
  ): Promise<void> {
    for (const template of input.templates) {
      let quest: Quest;

      try {
        const data: Prisma.QuestUncheckedCreateInput = {
          userId: input.userId,
          templateId: template.id,
          questType: "daily",
          title: template.title,
          description: template.description,
          difficulty: template.difficulty,
          status: "active",
          isMandatory: template.assignmentKind === "mandatory",
          isStretch: template.assignmentKind === "stretch",
          rewardXpBase: template.rewardXpBase,
          assignedDate: input.assignedDate,
          generatedBy: input.generatedBy,
          aiGenerationId: input.aiGenerationId,
          metadata: template.metadata as Prisma.InputJsonValue,
        };

        quest = await tx.quest.create({
          data,
        });
      } catch (error) {
        if (
          error instanceof PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }

        throw error;
      }

      const weights = this.getTemplateMetadata(template.metadata).attribute_weights ?? [];

      if (weights.length === 0) {
        throw new InternalServerErrorException(
          `Quest template ${template.code} is missing attribute weights.`,
        );
      }

      await tx.questAttributeMap.createMany({
        data: weights.map((weight) => ({
          questId: quest.id,
          attributeCode: weight.code,
          weight: weight.weight,
        })),
        skipDuplicates: true,
      });
    }
  }

  private toDailyBundle(bundle: QuestRecord[], localDate: string): DailyQuestBundleData {
    const mandatory = bundle
      .filter((quest) => quest.isMandatory)
      .map((quest) => this.toQuestResponse(quest));
    const optional = bundle
      .filter((quest) => !quest.isMandatory && !quest.isStretch)
      .map((quest) => this.toQuestResponse(quest));
    const stretch = bundle.find((quest) => quest.isStretch) ?? null;

    return {
      generated_for_date: localDate,
      mandatory,
      optional,
      stretch: stretch ? this.toQuestResponse(stretch) : null,
    };
  }

  private validateCompletionInput(input: QuestCompletionInput): void {
    if (
      input.intensity &&
      !QUEST_LOG_INTENSITIES.includes(input.intensity)
    ) {
      throw new ConflictException("Invalid intensity value.");
    }

    if (input.note && input.note.trim().length > MAX_COMPLETION_NOTE_LENGTH) {
      throw new ConflictException("Quest note is too long.");
    }
  }

  private calculateLevel(totalXp: number): number {
    return Math.floor(Math.sqrt(Math.max(0, totalXp)));
  }

  private isRetryableDailyBundleConflict(error: unknown): boolean {
    return (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2034"
    );
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

  private getTemplateMetadata(metadata: Prisma.JsonValue): QuestTemplateMetadata {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return {};
    }

    return metadata as QuestTemplateMetadata;
  }

  private getTotalAttributeGain(metadata: Prisma.JsonValue): number {
    const effortLayer = this.getTemplateMetadata(metadata).effort_layer ?? "micro";

    return ATTRIBUTE_GAIN_BY_EFFORT_LAYER[effortLayer];
  }

  private calculateAttributeChange(
    current: UserAttribute,
    code: QuestAttributeMap["attributeCode"],
    weight: number,
    totalWeight: number,
    totalGain: number,
  ): {
    code: QuestAttributeMap["attributeCode"];
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

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toQuestResponse(quest: QuestRecord): QuestResponseData {
    return {
      id: quest.id,
      template_id: quest.templateId,
      quest_type: quest.questType,
      title: quest.title,
      description: quest.description,
      difficulty: quest.difficulty,
      status: quest.status,
      is_mandatory: quest.isMandatory,
      is_stretch: quest.isStretch,
      reward_xp_base: quest.rewardXpBase,
      assigned_date: quest.assignedDate.toISOString().slice(0, 10),
      due_at: dateToIso(quest.dueAt),
      completed_at: dateToIso(quest.completedAt),
      generated_by: quest.generatedBy,
    };
  }
}
