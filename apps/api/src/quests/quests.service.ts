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
import { GuideService } from "../guide/guide.service";
import {
  getNextSystemResetAt,
  getSystemDayString,
  toDateOnly,
} from "../common/time/system-day";
import { PrismaService } from "../prisma/prisma.service";
import { StreakService } from "../streak/streak.service";
import { UsersService } from "../users/users.service";

type QuestTemplateMetadata = {
  effort_layer?: "micro" | "structured" | "dungeon" | "raid";
  cooldown_days?: number;
  max_occurrences_in_7d?: number;
  attribute_family?: "strength" | "wisdom" | "focus" | "mastery" | "wealth" | "bond";
  goal_tags?: string[];
  framing_tags?: string[];
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
const RECENT_MANDATORY_LOOKBACK_DAYS = 3;
const RECENT_TEMPLATE_LOOKBACK_DAYS = 7;
const RANK_CONTEXT_BY_RANK = {
  E: { label: "Foundation", subtitle: "Build the floor and make the loop repeatable." },
  D: { label: "Momentum", subtitle: "Consistency is forming and the day is starting to hold." },
  C: { label: "Consolidation", subtitle: "Progress is compounding into a dependable pattern." },
  B: { label: "Expansion", subtitle: "Capacity is widening across more demanding layers." },
  A: { label: "Command", subtitle: "You are operating the system with real control." },
  S: { label: "Ascension", subtitle: "The full structure is integrated and sustained." },
} as const;

@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly streakService: StreakService,
    private readonly guideService: GuideService,
    private readonly aiPlannerService: AiPlannerService,
    private readonly aiQuestValidatorService: AiQuestValidatorService,
  ) {}

  async getTodayBundle(userId: string): Promise<DailyQuestBundleData> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const systemDate = getSystemDayString(user.timezone);
    const assignedDate = toDateOnly(systemDate);

    await this.expirePreviousDailyQuests(userId, assignedDate);

    const existing = await this.findDailyBundle(userId, assignedDate);
    if (existing.length > 0) {
      return this.toDailyBundle(existing, systemDate, user.timezone);
    }

    const templates = await this.loadDailyTemplates(this.prisma);
    const generationContext = await this.buildGenerationContext(userId, user.timezone, assignedDate);
    const fallbackPlan = this.composeDeterministicDailyPlan(templates, generationContext);
    const aiAttempt = await this.tryAiDailyPlan(
      userId,
      user,
      systemDate,
      templates,
      generationContext,
      fallbackPlan,
    );

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
      templates: this.resolveSelectedTemplates(templates, aiAttempt.validatedPlan ?? fallbackPlan),
      generatedBy: aiAttempt.generatedBy,
      aiGenerationId: acceptedGenerationId,
    });

    return this.toDailyBundle(bundle, systemDate, user.timezone);
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
    const systemDate = getSystemDayString(user.timezone);
    const assignedDate = toDateOnly(systemDate);

    try {
      const completion = await this.prisma.$transaction(
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
          const previousLevel = this.calculateLevel(profile.totalXp);

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
            quest_status: "completed" as const,
            streak_bonus_xp: streakResult.streakBonusXp || undefined,
            current_streak_days: streakResult.currentStreakDays || undefined,
            day_became_valid: streakResult.dayBecameValid || undefined,
            // Rank promotion remains deferred. Phase 3 only makes rank progress
            // more visible while streaks and valid-day logic become authoritative.
            rank_up: false,
            _guide_context: {
              previous_level: previousLevel,
              threshold_codes: attributeChanges
                .filter((change) => this.crossedRoundAttributeThreshold(change.previousValue, change.newValue))
                .map((change) => change.code),
              quest_title: quest.title,
            },
          };
        },
        {
          isolationLevel: "Serializable",
        },
      );

      await this.emitHomeGuideMessage(userId, {
        triggerType: "quest_completion",
        baseTitle: completion._guide_context.quest_title,
        xpAwarded: completion.xp_awarded,
        newLevel: completion.new_level,
        previousLevel: completion._guide_context.previous_level,
        dayBecameValid: completion.day_became_valid ?? false,
        thresholdCodes: completion._guide_context.threshold_codes,
      });

      const { _guide_context, ...response } = completion;
      return response;
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

  private async emitHomeGuideMessage(userId: string, input: {
    triggerType: string;
    baseTitle: string;
    xpAwarded: number;
    newLevel: number;
    previousLevel: number;
    dayBecameValid: boolean;
    thresholdCodes: string[];
  }): Promise<void> {
    const levelUp = input.newLevel > input.previousLevel;
    const statSpike = input.thresholdCodes[0] ?? null;

    if (levelUp) {
      await this.guideService.emitTriggeredMessage(userId, {
        screen: "home",
        triggerType: "level_up",
        triggerKey: `level-up:${userId}:${input.newLevel}`,
        priority: 85,
        stateVariant: "battle",
        fallbackTitle: "Level up",
        fallbackBody: `Level ${input.newLevel} is live. The floor just rose, so move like the system expects more from you.`,
        currentState: {
          level: input.newLevel,
          xp_awarded: input.xpAwarded,
          source: input.baseTitle,
        },
      });
      return;
    }

    if (statSpike) {
      await this.guideService.emitTriggeredMessage(userId, {
        screen: "home",
        triggerType: "stat_threshold",
        triggerKey: `stat-threshold:${userId}:${statSpike}:${input.newLevel}:${input.baseTitle}`,
        priority: 80,
        stateVariant: "battle",
        fallbackTitle: "Stat threshold hit",
        fallbackBody: `${statSpike.charAt(0).toUpperCase() + statSpike.slice(1)} just hit a round threshold. That is not noise anymore.`,
        currentState: {
          attribute: statSpike,
          source: input.baseTitle,
        },
      });
      return;
    }

    if (input.dayBecameValid) {
      await this.guideService.emitTriggeredMessage(userId, {
        screen: "home",
        triggerType: "valid_day_secured",
        triggerKey: `valid-day:${userId}:${input.baseTitle}:${input.newLevel}`,
        priority: 75,
        stateVariant: "bold",
        fallbackTitle: "Day secured",
        fallbackBody: "The day is now valid. What happens next sharpens the pattern instead of merely rescuing it.",
        currentState: {
          source: input.baseTitle,
          xp_awarded: input.xpAwarded,
        },
      });
      return;
    }

    await this.guideService.emitTriggeredMessage(userId, {
      screen: "home",
      triggerType: input.triggerType,
      triggerKey: `${input.triggerType}:${userId}:${input.baseTitle}:${Date.now()}`,
      priority: 60,
      stateVariant: "bold",
      fallbackTitle: "Clean hit",
      fallbackBody: `${input.baseTitle} is done. Keep the chain moving before the day cools off.`,
      currentState: {
        source: input.baseTitle,
        xp_awarded: input.xpAwarded,
      },
    });
  }

  private crossedRoundAttributeThreshold(previousValue: Prisma.Decimal | number, newValue: Prisma.Decimal | number): boolean {
    const previous = typeof previousValue === "number" ? previousValue : decimalToNumber(previousValue);
    const next = typeof newValue === "number" ? newValue : decimalToNumber(newValue);
    return [10, 20, 30].some((threshold) => previous < threshold && next >= threshold);
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
      }),
      tx.questTemplate.findMany({
        where: {
          isActive: true,
          questType: "daily",
          assignmentKind: "optional",
        },
        orderBy: { sortOrder: "asc" },
      }),
      tx.questTemplate.findMany({
        where: {
          isActive: true,
          questType: "daily",
          assignmentKind: "stretch",
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    const templates = [...mandatory, ...optional, ...stretch];

    if (
      mandatory.length < DAILY_TEMPLATE_COUNTS.mandatory ||
      optional.length < DAILY_TEMPLATE_COUNTS.optional ||
      stretch.length < DAILY_TEMPLATE_COUNTS.stretch
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
    generationContext: Awaited<ReturnType<QuestsService["buildGenerationContext"]>>,
    fallbackPlan: ValidatedDailyQuestPlan,
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
      recent_history: {
        assigned_template_codes: generationContext.recentAssignedTemplateCodes,
        completed_template_codes: generationContext.recentCompletedTemplateCodes,
      },
      underused_attributes: generationContext.underusedAttributes,
      active_arcs: {
        dungeon_theme: generationContext.activeDungeonTheme,
        raid_theme: generationContext.activeRaidTheme,
      },
      rank_context: RANK_CONTEXT_BY_RANK[user.profile.currentRank],
      recovery_state: {
        valid_day_secured: generationContext.validDaySecured,
        completed_today: generationContext.completedToday,
        remaining_mandatory: generationContext.remainingMandatoryToday,
      },
      allowed_templates: templates.all.map((template) => ({
        code: template.code,
        title: template.title,
        description: template.description,
        assignment_kind: template.assignmentKind,
        difficulty: template.difficulty,
        attribute_family: this.getTemplateMetadata(template.metadata).attribute_family,
        cooldown_days: this.getTemplateMetadata(template.metadata).cooldown_days,
        max_occurrences_in_7d: this.getTemplateMetadata(template.metadata).max_occurrences_in_7d,
        goal_tags: this.getTemplateMetadata(template.metadata).goal_tags,
        framing_tags: this.getTemplateMetadata(template.metadata).framing_tags,
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
        difficulty: template.difficulty,
        attribute_family: this.getTemplateMetadata(template.metadata).attribute_family,
        cooldown_days: this.getTemplateMetadata(template.metadata).cooldown_days,
        max_occurrences_in_7d: this.getTemplateMetadata(template.metadata).max_occurrences_in_7d,
      })),
      {
        recentMandatoryTemplateCodes: generationContext.recentMandatoryTemplateCodes,
        recent7dTemplateCounts: generationContext.templateFrequency7d,
      },
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
      validatedPlan: validation.normalized ?? fallbackPlan,
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

  private async buildGenerationContext(
    userId: string,
    timezone: string,
    assignedDate: Date,
  ): Promise<{
    recentAssignedTemplateCodes: string[];
    recentCompletedTemplateCodes: string[];
    recentMandatoryTemplateCodes: string[];
    templateFrequency7d: Record<string, number>;
    underusedAttributes: Array<QuestAttributeMap["attributeCode"]>;
    activeDungeonTheme: string | null;
    activeRaidTheme: string | null;
    validDaySecured: boolean;
    completedToday: number;
    remainingMandatoryToday: number;
  }> {
    const recentMandatorySince = new Date(assignedDate);
    recentMandatorySince.setUTCDate(recentMandatorySince.getUTCDate() - RECENT_MANDATORY_LOOKBACK_DAYS);
    const recentSince = new Date(assignedDate);
    recentSince.setUTCDate(recentSince.getUTCDate() - RECENT_TEMPLATE_LOOKBACK_DAYS);

    const [recentQuests, recentAttributeHistory, activeDungeon, activeRaid, validDayToday, todaysBundle] =
      await Promise.all([
        this.prisma.quest.findMany({
          where: {
            userId,
            questType: "daily",
            assignedDate: { gte: recentSince, lt: assignedDate },
            templateId: { not: null },
          },
          select: {
            templateId: true,
            isMandatory: true,
            status: true,
            assignedDate: true,
            template: {
              select: {
                code: true,
              },
            },
          },
        }),
        this.prisma.userAttributeHistory.groupBy({
          by: ["attributeCode"],
          where: {
            userId,
            createdAt: { gte: recentSince },
          },
          _sum: {
            delta: true,
          },
        }),
        this.prisma.dungeon.findFirst({
          where: { userId, status: "active" },
          include: { template: true },
          orderBy: { startedAt: "desc" },
        }),
        this.prisma.raid.findFirst({
          where: { userId, status: { in: ["active", "verification_pending"] } },
          include: { template: true },
          orderBy: { startedAt: "desc" },
        }),
        this.prisma.validDay.findUnique({
          where: {
            userId_dayDate: {
              userId,
              dayDate: assignedDate,
            },
          },
        }),
        this.prisma.quest.findMany({
          where: {
            userId,
            questType: "daily",
            assignedDate,
          },
          select: {
            status: true,
            isMandatory: true,
            template: { select: { code: true } },
          },
        }),
      ]);

    const recentAssignedTemplateCodes = recentQuests
      .map((quest) => quest.template?.code)
      .filter((code): code is string => Boolean(code));
    const recentCompletedTemplateCodes = recentQuests
      .filter((quest) => quest.status === "completed")
      .map((quest) => quest.template?.code)
      .filter((code): code is string => Boolean(code));
    const recentMandatoryTemplateCodes = recentQuests
      .filter((quest) => quest.isMandatory && quest.assignedDate >= recentMandatorySince)
      .map((quest) => quest.template?.code)
      .filter((code): code is string => Boolean(code));
    const templateFrequency7d = recentAssignedTemplateCodes.reduce<Record<string, number>>(
      (accumulator, code) => {
        accumulator[code] = (accumulator[code] ?? 0) + 1;
        return accumulator;
      },
      {},
    );

    const attributeDeltaByCode = new Map(
      recentAttributeHistory.map((entry) => [
        entry.attributeCode,
        decimalToNumber(entry._sum.delta ?? 0),
      ]),
    );
    const underusedAttributes = [...([
      "strength",
      "wisdom",
      "focus",
      "mastery",
      "wealth",
      "bond",
    ] as const)].sort((a, b) => {
      const left = attributeDeltaByCode.get(a) ?? 0;
      const right = attributeDeltaByCode.get(b) ?? 0;
      if (left !== right) {
        return left - right;
      }

      return a.localeCompare(b);
    });

    const completedToday = todaysBundle.filter((quest) => quest.status === "completed").length;
    const mandatoryCompletedToday = todaysBundle.filter(
      (quest) => quest.isMandatory && quest.status === "completed",
    ).length;
    const mandatoryTotalToday = todaysBundle.filter((quest) => quest.isMandatory).length;

    return {
      recentAssignedTemplateCodes,
      recentCompletedTemplateCodes,
      recentMandatoryTemplateCodes,
      templateFrequency7d,
      underusedAttributes,
      activeDungeonTheme: this.readTheme(activeDungeon?.template?.metadata ?? activeDungeon?.metadata),
      activeRaidTheme: this.readTheme(activeRaid?.template?.metadata ?? activeRaid?.metadata),
      validDaySecured: Boolean(validDayToday?.isValid),
      completedToday,
      remainingMandatoryToday: Math.max(mandatoryTotalToday - mandatoryCompletedToday, 0),
    };
  }

  private composeDeterministicDailyPlan(
    templates: DailyTemplateSet,
    context: Awaited<ReturnType<QuestsService["buildGenerationContext"]>>,
  ): ValidatedDailyQuestPlan {
    const mandatory = this.selectTemplatesForBucket(
      templates.mandatory,
      DAILY_TEMPLATE_COUNTS.mandatory,
      context,
      { enforceDistinctFamilies: true, avoidRecentMandatory: true },
    );
    const optional = this.selectTemplatesForBucket(
      templates.optional,
      DAILY_TEMPLATE_COUNTS.optional,
      context,
      { enforceDistinctFamilies: false, avoidRecentMandatory: false },
    );
    const stretch = this.selectStretchTemplate(templates.stretch, context);

    return {
      mandatory: mandatory.map((template) => template.code),
      optional: optional.map((template) => template.code),
      stretch: stretch ? [stretch.code] : [],
    };
  }

  private selectTemplatesForBucket(
    candidates: QuestTemplate[],
    count: number,
    context: Awaited<ReturnType<QuestsService["buildGenerationContext"]>>,
    options: {
      enforceDistinctFamilies: boolean;
      avoidRecentMandatory: boolean;
    },
  ): QuestTemplate[] {
    const selected: QuestTemplate[] = [];
    const usedFamilies = new Set<string>();

    const ranked = [...candidates].sort((left, right) => {
      return this.scoreTemplate(right, context, options) - this.scoreTemplate(left, context, options);
    });

    for (const template of ranked) {
      if (selected.length >= count) {
        break;
      }

      const metadata = this.getTemplateMetadata(template.metadata);
      if (
        options.enforceDistinctFamilies &&
        metadata.attribute_family &&
        usedFamilies.has(metadata.attribute_family)
      ) {
        continue;
      }

      selected.push(template);
      if (metadata.attribute_family) {
        usedFamilies.add(metadata.attribute_family);
      }
    }

    if (selected.length < count) {
      for (const template of ranked) {
        if (selected.find((entry) => entry.id === template.id)) {
          continue;
        }

        selected.push(template);
        if (selected.length >= count) {
          break;
        }
      }
    }

    return selected.slice(0, count);
  }

  private selectStretchTemplate(
    candidates: QuestTemplate[],
    context: Awaited<ReturnType<QuestsService["buildGenerationContext"]>>,
  ): QuestTemplate | null {
    const ranked = [...candidates].sort((left, right) => {
      return this.scoreTemplate(right, context, {
        enforceDistinctFamilies: false,
        avoidRecentMandatory: false,
      }) - this.scoreTemplate(left, context, {
        enforceDistinctFamilies: false,
        avoidRecentMandatory: false,
      });
    });

    return ranked[0] ?? null;
  }

  private scoreTemplate(
    template: QuestTemplate,
    context: Awaited<ReturnType<QuestsService["buildGenerationContext"]>>,
    options: {
      enforceDistinctFamilies: boolean;
      avoidRecentMandatory: boolean;
    },
  ): number {
    const metadata = this.getTemplateMetadata(template.metadata);
    let score = 100 - template.sortOrder;

    if (metadata.attribute_family) {
      const underusedIndex = context.underusedAttributes.indexOf(metadata.attribute_family);
      if (underusedIndex >= 0) {
        score += Math.max(0, 24 - underusedIndex * 4);
      }
    }

    if (metadata.goal_tags?.length) {
      const matchingGoalCount = metadata.goal_tags.filter((tag) =>
        context.recentCompletedTemplateCodes.some((code) => code.includes(tag)),
      ).length;
      score += matchingGoalCount * 2;
    }

    if (metadata.attribute_family === "bond" || metadata.attribute_family === "wisdom" || metadata.attribute_family === "strength") {
      score += 3;
    }

    if (metadata.attribute_family && context.activeDungeonTheme && metadata.framing_tags?.includes(context.activeDungeonTheme)) {
      score += 4;
    }
    if (metadata.attribute_family && context.activeRaidTheme && metadata.framing_tags?.includes(context.activeRaidTheme)) {
      score += 4;
    }

    const recentCount = context.templateFrequency7d[template.code] ?? 0;
    if (metadata.max_occurrences_in_7d) {
      score -= recentCount * 10;
      if (recentCount >= metadata.max_occurrences_in_7d) {
        score -= 100;
      }
    } else {
      score -= recentCount * 6;
    }

    if (options.avoidRecentMandatory && context.recentMandatoryTemplateCodes.includes(template.code)) {
      score -= 40;
    }

    return score;
  }

  private readTheme(metadata: Prisma.JsonValue | null | undefined): string | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null;
    }

    const value = (metadata as Record<string, unknown>).theme;
    return typeof value === "string" && value.trim() ? value.trim() : null;
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

  private toDailyBundle(
    bundle: QuestRecord[],
    systemDate: string,
    timezone: string,
  ): DailyQuestBundleData {
    const mandatory = bundle
      .filter((quest) => quest.isMandatory)
      .map((quest) => this.toQuestResponse(quest));
    const optional = bundle
      .filter((quest) => !quest.isMandatory && !quest.isStretch)
      .map((quest) => this.toQuestResponse(quest));
    const stretch = bundle.find((quest) => quest.isStretch) ?? null;

    return {
      generated_for_date: systemDate,
      next_reset_at: getNextSystemResetAt(timezone),
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
