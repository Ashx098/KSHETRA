import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ActiveEventResponseData,
  DailyQuestBundleData,
  GuideAskInput,
  GuideAskResponseData,
  GuideCardData,
  GuideMessageData,
  GuidePreferencesResponseData,
  GuidePreferencesUpdateInput,
  GuideScreen,
  MeResponseData,
  MissionsPayloadData,
  NotificationResponseData,
  ProgressionHistoryData,
  ProgressionSummaryData,
} from "@kshetra/types";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { AiGenerationStatus, GuideMessageStatus, GuideStateVariant, Prisma } from "@prisma/client";

import { getNextSystemResetAt, getSystemDayString, toDateOnly } from "../common/time/system-day";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { GuideAiService } from "./guide-ai.service";

const COMPANION_NAME = "Kael";

const GUIDE_QUICK_CHIPS: Record<GuideScreen, string[]> = {
  home: ["What next?", "Why this bundle?", "How many levels left?", "What does Bond mean?"],
  missions: ["What should I focus on?", "Why verification?", "How long will this take?", "What matters most now?"],
  progress: ["What changed most?", "What does this rank mean?", "How close is next rank?", "Why is Focus rising?"],
  profile: ["What do goals affect?", "How do resets work?", "What do alerts do?", "What does timezone change?"],
};

const GUIDE_GLOSSARY = [
  { term: "Valid day", meaning: "A day becomes valid only when quest count, XP floor, and low-difficulty share all satisfy the calibration rule." },
  { term: "Rank", meaning: "Rank is a soft progression layer backed by XP and streak context. It is not full gating yet." },
  { term: "Bond", meaning: "Bond measures meaningful relationship investment, presence, repair, and direct support." },
  { term: "Dungeon", meaning: "Dungeons are medium-term structured challenges that reward completion through the ledger and attribute history." },
  { term: "Raid", meaning: "Raids are heavier milestone arcs that require objective closure plus a real verification summary." },
];

type GuideSurfaceData = {
  guide_card: GuideCardData;
  guide_message: GuideMessageData | null;
};

@Injectable()
export class GuideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly guideAiService: GuideAiService,
  ) {}

  async getHomeGuide(
    userId: string,
    input: {
      progression: ProgressionSummaryData;
      quests: DailyQuestBundleData;
      active_event: ActiveEventResponseData | null;
      top_notification: NotificationResponseData | null;
      notification_count: number;
    },
  ): Promise<GuideSurfaceData> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const prefs = await this.ensurePreferences(userId);
    await this.ensureScreenEntryNudge(userId, user.timezone, "home", prefs);

    const completedQuestCount =
      input.quests.mandatory.filter((quest) => quest.status === "completed").length +
      input.quests.optional.filter((quest) => quest.status === "completed").length +
      (input.quests.stretch?.status === "completed" ? 1 : 0);
    const remainingMandatory = input.quests.mandatory.filter((quest) => quest.status !== "completed").length;

    return {
      guide_card: {
        screen: "home",
        companion_name: COMPANION_NAME,
        state_variant:
          input.active_event || remainingMandatory > 0
            ? "bold"
            : completedQuestCount >= 3
              ? "battle"
              : "calm",
        title:
          input.active_event
            ? "A live opening"
            : remainingMandatory > 0
              ? "Lock the day"
              : "Momentum secured",
        body:
          input.active_event
            ? `${input.active_event.title} is live. Clear the biggest pressure point before the window closes.`
            : remainingMandatory > 0
              ? `${remainingMandatory} mandatory ${remainingMandatory === 1 ? "quest remains" : "quests remain"}. Clear one next and the board tightens up.`
              : "The daily loop is moving. Optional and stretch work can now sharpen the shape of the day.",
        primary_cta_label: "Ask Kael",
        quick_chips: GUIDE_QUICK_CHIPS.home,
      },
      guide_message: await this.getTopMessage(userId, "home"),
    };
  }

  async getMissionsGuide(
    userId: string,
    input: Pick<MissionsPayloadData, "active_dungeon" | "active_raid">,
  ): Promise<GuideSurfaceData> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const prefs = await this.ensurePreferences(userId);
    await this.ensureScreenEntryNudge(userId, user.timezone, "missions", prefs);

    const raidCompletionWindowRemainingHours = input.active_raid
      ? Math.max(
          Math.ceil(
            (new Date(input.active_raid.started_at).getTime() +
              input.active_raid.minimum_completion_window_hours * 60 * 60 * 1000 -
              Date.now()) /
              (60 * 60 * 1000),
          ),
          0,
        )
      : 0;
    const raidCompletionWindowMet =
      !input.active_raid || raidCompletionWindowRemainingHours === 0;

    if (input.active_raid?.ready_for_verification && !raidCompletionWindowMet) {
      await this.prisma.guideMessage.updateMany({
        where: {
          userId,
          screen: "missions",
          triggerType: "raid_ready_for_verification",
          status: { in: ["active", "shown"] },
        },
        data: {
          status: "expired",
        },
      });
    }

    return {
      guide_card: {
        screen: "missions",
        companion_name: COMPANION_NAME,
        state_variant:
          input.active_raid?.ready_for_verification && raidCompletionWindowMet
            ? "battle"
            : input.active_raid || input.active_dungeon
              ? "bold"
              : "calm",
        title:
          input.active_raid?.ready_for_verification && !raidCompletionWindowMet
            ? "Verification cooling down"
            : input.active_raid?.ready_for_verification
            ? "Finish the raid"
            : input.active_raid
              ? "The raid is live"
              : input.active_dungeon
                ? "Keep the dungeon moving"
                : "Open a structured arc",
        body:
          input.active_raid?.ready_for_verification && !raidCompletionWindowMet
            ? `The objectives are closed, but the raid still needs ${raidCompletionWindowRemainingHours} more ${raidCompletionWindowRemainingHours === 1 ? "hour" : "hours"} before completion can be verified.`
            : input.active_raid?.ready_for_verification
            ? "The objectives are closed. Write the summary cleanly and claim the full weight of the arc."
            : input.active_raid
              ? "Raids reward closure, not noise. Push the current objective, then respect the verification step."
              : input.active_dungeon
                ? "A dungeon wins by steady repetition. One clean log matters more than waiting for the perfect session."
                : "Dungeons build weekly pressure. Raids mark heavier arcs. Start one lane instead of leaving both dormant.",
        primary_cta_label: "Clarify focus",
        quick_chips: GUIDE_QUICK_CHIPS.missions,
      },
      guide_message: await this.getTopMessage(userId, "missions"),
    };
  }

  async getProgressGuide(
    userId: string,
    input: {
      summary: ProgressionSummaryData;
      history: ProgressionHistoryData;
    },
  ): Promise<GuideSurfaceData> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const prefs = await this.ensurePreferences(userId);
    await this.ensureScreenEntryNudge(userId, user.timezone, "progress", prefs);

    return {
      guide_card: {
        screen: "progress",
        companion_name: COMPANION_NAME,
        state_variant:
          input.history.insights.recent_xp_trend === "rising" ? "bold" : "calm",
        title: `${input.summary.rank_context_label} pattern`,
        body:
          input.history.insights.recent_xp_trend === "rising"
            ? "The curve is moving upward. Keep pressing the attribute that is already waking up."
            : `${input.history.insights.current_focus_signal} Use the chart as proof, not decoration.`,
        primary_cta_label: "Read the pattern",
        quick_chips: GUIDE_QUICK_CHIPS.progress,
      },
      guide_message: await this.getTopMessage(userId, "progress"),
    };
  }

  async getProfileGuide(userId: string, input: { me: MeResponseData }): Promise<GuideSurfaceData> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const prefs = await this.ensurePreferences(userId);
    await this.ensureScreenEntryNudge(userId, user.timezone, "profile", prefs);

    return {
      guide_card: {
        screen: "profile",
        companion_name: COMPANION_NAME,
        state_variant: "calm",
        title: "Set the operating rules",
        body: `${input.me.display_name} moves through a local 8 AM reset. Goals and preferences shape planning, not hidden rewards.`,
        primary_cta_label: "Explain settings",
        quick_chips: GUIDE_QUICK_CHIPS.profile,
      },
      guide_message: await this.getTopMessage(userId, "profile"),
    };
  }

  async askGuide(userId: string, input: GuideAskInput): Promise<GuideAskResponseData> {
    const question = input.question.trim();
    if (!question) {
      throw new BadRequestException("Question is required.");
    }

    const context = await this.buildAskContext(userId, input.screen);
    const aiResult = await this.guideAiService.answerExplain({
      screen: input.screen,
      question,
      topic: input.topic?.trim() || null,
      current_state: context,
      glossary: GUIDE_GLOSSARY,
    });

    if (aiResult.status === "success") {
      const validated = this.validateExplainOutput(aiResult.parsedOutput);
      if (validated) {
        await this.persistAiGeneration({
          userId,
          generationType: "guide_explain",
          status: "accepted",
          provider: aiResult.provider,
          modelName: aiResult.model,
          requestPayload: aiResult.requestPayload as Prisma.InputJsonValue,
          rawResponseText: aiResult.rawResponseText,
          validatedOutput: validated as unknown as Prisma.InputJsonValue,
          rejectionReasons: null,
        });
        return validated;
      }

      await this.persistAiGeneration({
        userId,
        generationType: "guide_explain",
        status: "rejected",
        provider: aiResult.provider,
        modelName: aiResult.model,
        requestPayload: aiResult.requestPayload as Prisma.InputJsonValue,
        rawResponseText: aiResult.rawResponseText,
        validatedOutput: null,
        rejectionReasons: ["Guide explain output failed validation."] as unknown as Prisma.InputJsonValue,
      });
    } else {
      await this.persistAiGeneration({
        userId,
        generationType: "guide_explain",
        status: aiResult.status === "skipped" ? "fallback_used" : "failed",
        provider: aiResult.provider,
        modelName: aiResult.model,
        requestPayload: aiResult.requestPayload as Prisma.InputJsonValue,
        rawResponseText: aiResult.rawResponseText,
        validatedOutput: null,
        rejectionReasons: aiResult.failureReason ? [aiResult.failureReason] as unknown as Prisma.InputJsonValue : null,
      });
    }

    return this.buildFallbackAnswer(input.screen, question, context);
  }

  async dismissMessage(userId: string, messageId: string): Promise<{ message_id: string; status: GuideMessageStatus }> {
    const message = await this.prisma.guideMessage.findUnique({
      where: { id: messageId },
    });

    if (!message || message.userId !== userId) {
      throw new NotFoundException("Guide message not found.");
    }

    if (message.status === "dismissed") {
      return { message_id: message.id, status: "dismissed" };
    }

    await this.prisma.guideMessage.update({
      where: { id: message.id },
      data: {
        status: "dismissed",
        dismissedAt: new Date(),
      },
    });

    return { message_id: message.id, status: "dismissed" };
  }

  async getPreferences(userId: string): Promise<GuidePreferencesResponseData> {
    return this.toPreferencesResponse(await this.ensurePreferences(userId));
  }

  async updatePreferences(
    userId: string,
    input: GuidePreferencesUpdateInput,
  ): Promise<GuidePreferencesResponseData> {
    const updated = await this.prisma.guidePreference.upsert({
      where: { userId },
      update: {
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.reactive_popups_enabled !== undefined
          ? { reactivePopupsEnabled: input.reactive_popups_enabled }
          : {}),
        ...(input.screen_nudges_enabled !== undefined
          ? { screenNudgesEnabled: input.screen_nudges_enabled }
          : {}),
        ...(input.tone_mode !== undefined ? { toneMode: input.tone_mode } : {}),
      },
      create: {
        userId,
        enabled: input.enabled ?? true,
        reactivePopupsEnabled: input.reactive_popups_enabled ?? true,
        screenNudgesEnabled: input.screen_nudges_enabled ?? true,
        toneMode: input.tone_mode ?? "energetic_anime",
      },
    });

    return this.toPreferencesResponse(updated);
  }

  async emitTriggeredMessage(userId: string, input: {
    screen: GuideScreen;
    triggerType: string;
    triggerKey: string;
    priority: number;
    stateVariant: GuideStateVariant;
    fallbackTitle: string;
    fallbackBody: string;
    currentState: Record<string, unknown>;
  }): Promise<void> {
    const prefs = await this.ensurePreferences(userId);
    if (!prefs.enabled || !prefs.reactivePopupsEnabled) {
      return;
    }

    const existing = await this.prisma.guideMessage.findFirst({
      where: {
        userId,
        triggerKey: input.triggerKey,
      },
    });

    if (existing) {
      return;
    }

    const user = await this.usersService.getUserStateOrThrow(userId);
    const systemDay = toDateOnly(getSystemDayString(user.timezone));
    const expiresAt = getNextSystemResetAt(user.timezone);

    let title = input.fallbackTitle;
    let body = input.fallbackBody;
    let aiGenerationId: string | null = null;

    const aiResult = await this.guideAiService.composeReactiveMessage({
      screen: input.screen,
      trigger_type: input.triggerType,
      trigger_label: input.fallbackTitle,
      current_state: input.currentState,
      allowed_style: {
        max_words: 22,
        tone: "energetic_anime",
      },
    });

    if (aiResult.status === "success") {
      const validated = this.validateReactiveOutput(aiResult.parsedOutput);
      if (validated) {
        title = validated.title;
        body = validated.body;
        aiGenerationId = await this.persistAiGeneration({
          userId,
          generationType: "guide_reactive",
          status: "accepted",
          provider: aiResult.provider,
          modelName: aiResult.model,
          requestPayload: aiResult.requestPayload as Prisma.InputJsonValue,
          rawResponseText: aiResult.rawResponseText,
          validatedOutput: validated as unknown as Prisma.InputJsonValue,
          rejectionReasons: null,
        });
      } else {
        await this.persistAiGeneration({
          userId,
          generationType: "guide_reactive",
          status: "rejected",
          provider: aiResult.provider,
          modelName: aiResult.model,
          requestPayload: aiResult.requestPayload as Prisma.InputJsonValue,
          rawResponseText: aiResult.rawResponseText,
          validatedOutput: null,
          rejectionReasons: ["Guide reactive output failed validation."] as unknown as Prisma.InputJsonValue,
        });
      }
    } else {
      await this.persistAiGeneration({
        userId,
        generationType: "guide_reactive",
        status: aiResult.status === "skipped" ? "fallback_used" : "failed",
        provider: aiResult.provider,
        modelName: aiResult.model,
        requestPayload: aiResult.requestPayload as Prisma.InputJsonValue,
        rawResponseText: aiResult.rawResponseText,
        validatedOutput: null,
        rejectionReasons: aiResult.failureReason ? [aiResult.failureReason] as unknown as Prisma.InputJsonValue : null,
      });
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.guideMessage.updateMany({
          where: {
            userId,
            status: "active",
          },
          data: {
            status: "expired",
            expiresAt: new Date(),
          },
        });

        await tx.guideMessage.create({
          data: {
            userId,
            screen: input.screen,
            messageType: this.getMessageTypeForTrigger(input.triggerType),
            triggerType: input.triggerType,
            triggerKey: input.triggerKey,
            priority: input.priority,
            stateVariant: input.stateVariant,
            title,
            body,
            status: "active",
            systemDay,
            sourceAiGenerationId: aiGenerationId,
            expiresAt,
          },
        });
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return;
      }

      throw error;
    }
  }

  private async ensureScreenEntryNudge(
    userId: string,
    timezone: string,
    screen: GuideScreen,
    prefs: Awaited<ReturnType<GuideService["ensurePreferences"]>>,
  ): Promise<void> {
    if (!prefs.enabled || !prefs.screenNudgesEnabled) {
      return;
    }

    const systemDay = getSystemDayString(timezone);
    const systemDayDate = toDateOnly(systemDay);
    const triggerKey = `screen-entry:${screen}:${systemDay}`;

    const existing = await this.prisma.guideMessage.findFirst({
      where: {
        userId,
        triggerKey,
      },
    });

    if (existing) {
      return;
    }

    const activePriorityMessage = await this.prisma.guideMessage.findFirst({
      where: {
        userId,
        status: "active",
        priority: { gte: 50 },
      },
    });

    if (activePriorityMessage) {
      return;
    }

    const [title, body] = this.getScreenEntryCopy(screen);

    try {
      await this.prisma.guideMessage.create({
        data: {
          userId,
          screen,
          messageType: "nudge",
          triggerType: "screen_entry",
          triggerKey,
          priority: 10,
          stateVariant: "calm",
          title,
          body,
          status: "active",
          systemDay: systemDayDate,
          expiresAt: getNextSystemResetAt(timezone),
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return;
      }

      throw error;
    }
  }

  private async getTopMessage(userId: string, screen: GuideScreen): Promise<GuideMessageData | null> {
    const now = new Date();

    await this.prisma.guideMessage.updateMany({
      where: {
        userId,
        status: { in: ["active", "shown"] },
        expiresAt: { lte: now },
      },
      data: {
        status: "expired",
      },
    });

    const message = await this.prisma.guideMessage.findFirst({
      where: {
        userId,
        screen,
        status: { in: ["active", "shown"] },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    if (!message) {
      return null;
    }

    if (message.status === "active") {
      await this.prisma.guideMessage.update({
        where: { id: message.id },
        data: {
          status: "shown",
          shownAt: now,
        },
      });
    }

    return {
      id: message.id,
      screen: message.screen,
      message_type: message.messageType,
      state_variant: message.stateVariant,
      title: message.title,
      body: message.body,
      status: message.status === "active" ? "shown" : message.status,
    };
  }

  private validateReactiveOutput(payload: unknown): { title: string; body: string } | null {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null;
    }

    const title = typeof (payload as { title?: unknown }).title === "string"
      ? (payload as { title: string }).title.trim()
      : "";
    const body = typeof (payload as { body?: unknown }).body === "string"
      ? (payload as { body: string }).body.trim()
      : "";

    if (!title || !body) {
      return null;
    }

    return {
      title: title.slice(0, 72),
      body: body.slice(0, 160),
    };
  }

  private validateExplainOutput(payload: unknown): GuideAskResponseData | null {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null;
    }

    const title = typeof (payload as { title?: unknown }).title === "string"
      ? (payload as { title: string }).title.trim()
      : "";
    const body = typeof (payload as { body?: unknown }).body === "string"
      ? (payload as { body: string }).body.trim()
      : "";
    const bullets = Array.isArray((payload as { bullets?: unknown }).bullets)
      ? (payload as { bullets: unknown[] }).bullets
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 3)
      : [];

    if (!title || !body) {
      return null;
    }

    return {
      title: title.slice(0, 80),
      body: body.slice(0, 320),
      bullets: bullets.map((item) => item.slice(0, 96)),
      state_variant: "calm",
    };
  }

  private async ensurePreferences(userId: string) {
    const existing = await this.prisma.guidePreference.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.guidePreference.create({
        data: {
          userId,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return this.prisma.guidePreference.findUniqueOrThrow({
          where: { userId },
        });
      }

      throw error;
    }
  }

  private toPreferencesResponse(preferences: Awaited<ReturnType<GuideService["ensurePreferences"]>>): GuidePreferencesResponseData {
    return {
      enabled: preferences.enabled,
      reactive_popups_enabled: preferences.reactivePopupsEnabled,
      screen_nudges_enabled: preferences.screenNudgesEnabled,
      tone_mode: preferences.toneMode,
    };
  }

  private async persistAiGeneration(input: {
    userId: string;
    generationType: "guide_reactive" | "guide_explain";
    status: AiGenerationStatus;
    provider: string | null;
    modelName: string | null;
    requestPayload: Prisma.InputJsonValue;
    rawResponseText: string | null;
    validatedOutput: Prisma.InputJsonValue | null;
    rejectionReasons: Prisma.InputJsonValue | null;
  }): Promise<string> {
    const generation = await this.prisma.aiGeneration.create({
      data: {
        userId: input.userId,
        generationType: input.generationType,
        status: input.status,
        provider: input.provider,
        modelName: input.modelName,
        requestPayload: input.requestPayload,
        rawResponseText: input.rawResponseText,
        ...(input.validatedOutput !== null ? { validatedOutput: input.validatedOutput } : {}),
        ...(input.rejectionReasons !== null ? { rejectionReasons: input.rejectionReasons } : {}),
      },
    });

    return generation.id;
  }

  private async buildAskContext(userId: string, screen: GuideScreen): Promise<Record<string, unknown>> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const systemDay = toDateOnly(getSystemDayString(user.timezone));
    const [todayQuests, activeEvent, activeDungeon, activeRaid] = await Promise.all([
      this.prisma.quest.findMany({
        where: {
          userId,
          questType: "daily",
          assignedDate: systemDay,
        },
        select: {
          title: true,
          isMandatory: true,
          isStretch: true,
          status: true,
        },
      }),
      this.prisma.event.findFirst({
        where: {
          userId,
          status: "active",
        },
        select: {
          title: true,
          eventType: true,
          expiresAt: true,
        },
      }),
      this.prisma.dungeon.findFirst({
        where: {
          userId,
          status: "active",
        },
        select: {
          title: true,
          description: true,
        },
      }),
      this.prisma.raid.findFirst({
        where: {
          userId,
          status: { in: ["active", "verification_pending"] },
        },
        select: {
          title: true,
          description: true,
          status: true,
        },
      }),
    ]);

    return {
      screen,
      user: {
        rank: user.profile.currentRank,
        level: user.profile.currentLevel,
        total_xp: user.profile.totalXp,
        current_streak_days: user.streak.currentStreakDays,
        timezone: user.timezone,
      },
      today: {
        quest_count: todayQuests.length,
        mandatory_remaining: todayQuests.filter((quest) => quest.isMandatory && quest.status !== "completed").length,
        quests: todayQuests,
      },
      active_event: activeEvent,
      active_dungeon: activeDungeon,
      active_raid: activeRaid,
    };
  }

  private buildFallbackAnswer(
    screen: GuideScreen,
    question: string,
    context: Record<string, unknown>,
  ): GuideAskResponseData {
    const lower = question.toLowerCase();
    const user = (context.user ?? {}) as {
      rank?: string;
      level?: number;
      total_xp?: number;
      current_streak_days?: number;
      timezone?: string;
    };
    const today = (context.today ?? {}) as {
      quest_count?: number;
      mandatory_remaining?: number;
    };

    if (lower.includes("level") || lower.includes("rank")) {
      return {
        title: "Rank and level",
        body: `${COMPANION_NAME} reads the current state as rank ${user.rank ?? "E"}, level ${user.level ?? 0}, with ${user.total_xp ?? 0} total XP pushing the next threshold.`,
        bullets: [
          "Level follows the XP curve.",
          "Rank is meaningful framing, not hard gating yet.",
          "Consistency and XP both matter.",
        ],
        state_variant: "calm",
      };
    }

    if (lower.includes("bond")) {
      return {
        title: "Bond explained",
        body: "Bond rises through meaningful relationship investment, honest presence, repair, and direct support rather than passive contact.",
        bullets: [
          "Stretch and social-presence quests often touch Bond.",
          "Some events and longer arcs can feed it too.",
        ],
        state_variant: "calm",
      };
    }

    if (lower.includes("bundle") || lower.includes("quest") || lower.includes("next")) {
      return {
        title: "What to do next",
        body: `${today.mandatory_remaining ?? 0} mandatory quests remain. Clear one of those first, then use optional or stretch work to shape the day instead of merely filling it.`,
        bullets: [
          "Mandatory secures the day.",
          "Optional sharpens growth.",
          "Stretch pushes underused attributes.",
        ],
        state_variant: "bold",
      };
    }

    if (lower.includes("verification") || lower.includes("raid")) {
      return {
        title: "Raid verification",
        body: "Raids demand stronger closure than quests or dungeons. The summary proves the arc was genuinely completed before the reward is released.",
        bullets: [
          "Objectives first.",
          "Then a real summary.",
          "Artifact reference stays optional.",
        ],
        state_variant: "bold",
      };
    }

    if (lower.includes("reset") || lower.includes("timezone")) {
      return {
        title: "Reset timing",
        body: `The system day rolls over at 8 AM in ${user.timezone ?? "your local timezone"}. Daily quests, pressure, and risk all follow that boundary.`,
        bullets: [
          "It is not a midnight reset.",
          "Timezone matters because the day boundary is local.",
        ],
        state_variant: "calm",
      };
    }

    if (lower.includes("goal")) {
      return {
        title: "Goal impact",
        body: "Goals act as planning context for selection and framing. They are not direct reward multipliers or hidden stat modifiers.",
        bullets: [
          "They help shape future bundles.",
          "They clarify the longer direction of play.",
        ],
        state_variant: "calm",
      };
    }

    return {
      title: "Current read",
      body:
        screen === "missions"
          ? "Use Missions to push one structured lane cleanly instead of splitting attention between every arc at once."
          : screen === "progress"
            ? "Use Progress to understand where pressure is landing, then take the next action on Home or Missions."
            : screen === "profile"
              ? "Use Profile to tune the operating rules, not to micromanage progression."
              : "On Home, the cleanest move is still the next mandatory quest.",
      bullets: [],
      state_variant: screen === "home" ? "bold" : "calm",
    };
  }

  private getScreenEntryCopy(screen: GuideScreen): [string, string] {
    switch (screen) {
      case "home":
        return ["Board live", "The board is up. Clear one meaningful action first and the day starts bending in your favor."];
      case "missions":
        return ["Arc pressure", "Dungeons build rhythm. Raids demand proof. Pick the lane that deserves force right now."];
      case "progress":
        return ["Read the pattern", "The chart is not decoration. It shows where pressure has actually landed."];
      case "profile":
      default:
        return ["Set the rules", "This is where timing, goals, and preferences shape how the system meets you tomorrow."];
    }
  }

  private getMessageTypeForTrigger(triggerType: string): "nudge" | "milestone" | "warning" | "explain" {
    if (triggerType.includes("risk")) {
      return "warning";
    }

    if (
      triggerType.includes("completion") ||
      triggerType.includes("level") ||
      triggerType.includes("threshold") ||
      triggerType.includes("valid_day") ||
      triggerType.includes("streak")
    ) {
      return "milestone";
    }

    return "nudge";
  }
}
