"use client";

import {
  type ActiveEventResponseData,
  type AttributeResponseData,
  type DailyQuestBundleData,
  type EventCompletionInput,
  type EventCompletionResponseData,
  type EventDismissResponseData,
  type HomePayloadData,
  type GuideCardData,
  type GuideMessageData,
  type NotificationDismissResponseData,
  type NotificationResponseData,
  type ProgressionSummaryData,
  type QuestCompletionInput,
  type QuestCompletionResponseData,
  type QuestResponseData,
} from "@kshetra/types";
import { startTransition, useEffect, useState } from "react";

import { apiRequest } from "../../lib/api-client";
import { getStoredUserId } from "../../lib/session";
import { GuideDockCard } from "../guide/guide-card";
import { RadarChart } from "../radar/radar-chart";
import { CompactAlertStrip, RewardFeedbackCard } from "../shared/system-cards";

const defaultCompletionInput: QuestCompletionInput = {
  intensity: "medium",
  note: "",
};

const defaultEventCompletionInput: EventCompletionInput = {
  note: "",
};

type RewardFeedbackState = {
  kind: "quest" | "event";
  title: string;
  xp_awarded: number;
  attribute_changes: Array<{ code: string; delta: number }>;
  new_total_xp: number;
  new_level: number;
  status: string;
};

export function HomeClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProgressionSummaryData | null>(null);
  const [bundle, setBundle] = useState<DailyQuestBundleData | null>(null);
  const [activeEvent, setActiveEvent] = useState<ActiveEventResponseData | null>(null);
  const [topNotification, setTopNotification] = useState<NotificationResponseData | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [guideCard, setGuideCard] = useState<GuideCardData | undefined>(undefined);
  const [guideMessage, setGuideMessage] = useState<GuideMessageData | null>(null);
  const [attributes, setAttributes] = useState<AttributeResponseData[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<QuestResponseData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ActiveEventResponseData | null>(null);
  const [completionInput, setCompletionInput] =
    useState<QuestCompletionInput>(defaultCompletionInput);
  const [eventCompletionInput, setEventCompletionInput] =
    useState<EventCompletionInput>(defaultEventCompletionInput);
  const [rewardFeedback, setRewardFeedback] =
    useState<RewardFeedbackState | null>(null);
  const [lastCompletedQuestId, setLastCompletedQuestId] = useState<string | null>(null);
  const [eventCountdown, setEventCountdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = getStoredUserId();
    setUserId(storedUserId);

    if (!storedUserId) {
      setLoading(false);
      return;
    }

    void loadHomeState(storedUserId);
  }, []);

  useEffect(() => {
    const nextResetAt = bundle?.next_reset_at ?? activeEvent?.next_reset_at;
    if (!userId || !nextResetAt) {
      return;
    }

    const resetAtMs = new Date(nextResetAt).getTime();
    if (!Number.isFinite(resetAtMs)) {
      return;
    }

    const delayMs = Math.max(0, resetAtMs - Date.now() + 1500);
    const refreshIfPastReset = () => {
      if (Date.now() >= resetAtMs) {
        void loadHomeState(userId);
      }
    };

    const timeoutId = window.setTimeout(refreshIfPastReset, delayMs);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshIfPastReset();
      }
    };

    window.addEventListener("focus", refreshIfPastReset);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", refreshIfPastReset);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId, bundle?.next_reset_at, activeEvent?.next_reset_at]);

  useEffect(() => {
    if (!activeEvent?.expires_at) {
      setEventCountdown(null);
      return;
    }

    const expiresAtMs = new Date(activeEvent.expires_at).getTime();
    if (!Number.isFinite(expiresAtMs)) {
      setEventCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const remainingMs = expiresAtMs - Date.now();
      setEventCountdown(formatCountdown(remainingMs));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeEvent?.expires_at]);

  async function loadHomeState(activeUserId: string): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const nextHome = await apiRequest<HomePayloadData>("/home", {
        userId: activeUserId,
      });

      startTransition(() => {
        setSummary(nextHome.progression);
        setBundle(nextHome.quests);
        setAttributes(nextHome.attributes);
        setActiveEvent(nextHome.active_event);
        setTopNotification(nextHome.top_notification);
        setNotificationCount(nextHome.notification_count);
        setGuideCard(nextHome.guide_card);
        setGuideMessage(nextHome.guide_message);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load home state.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteQuest(): Promise<void> {
    if (!userId || !selectedQuest) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const reward = await apiRequest<QuestCompletionResponseData>(
        `/quests/${selectedQuest.id}/complete`,
        {
          method: "POST",
          userId,
          body: completionInput,
        },
      );
      const nextHome = await apiRequest<HomePayloadData>("/home", { userId });

      startTransition(() => {
        setSummary(nextHome.progression);
        setBundle(nextHome.quests);
        setAttributes(nextHome.attributes);
        setActiveEvent(nextHome.active_event);
        setTopNotification(nextHome.top_notification);
        setNotificationCount(nextHome.notification_count);
        setGuideCard(nextHome.guide_card);
        setGuideMessage(nextHome.guide_message);
        setRewardFeedback({
          kind: "quest",
          title: selectedQuest.title,
          xp_awarded: reward.xp_awarded,
          attribute_changes: reward.attribute_changes,
          new_total_xp: reward.new_total_xp,
          new_level: reward.new_level,
          status: reward.quest_status,
        });
        setLastCompletedQuestId(selectedQuest.id);
        setSelectedQuest(null);
        setCompletionInput(defaultCompletionInput);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to complete quest.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteEvent(): Promise<void> {
    if (!userId || !selectedEvent) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const reward = await apiRequest<EventCompletionResponseData>(
        `/events/${selectedEvent.id}/complete`,
        {
          method: "POST",
          userId,
          body: eventCompletionInput,
        },
      );
      const nextHome = await apiRequest<HomePayloadData>("/home", { userId });

      startTransition(() => {
        setSummary(nextHome.progression);
        setBundle(nextHome.quests);
        setAttributes(nextHome.attributes);
        setActiveEvent(nextHome.active_event);
        setTopNotification(nextHome.top_notification);
        setNotificationCount(nextHome.notification_count);
        setGuideCard(nextHome.guide_card);
        setGuideMessage(nextHome.guide_message);
        setRewardFeedback({
          kind: "event",
          title: selectedEvent.title,
          xp_awarded: reward.xp_awarded,
          attribute_changes: reward.attribute_changes,
          new_total_xp: reward.new_total_xp,
          new_level: reward.new_level,
          status: reward.event_status,
        });
        setSelectedEvent(null);
        setEventCompletionInput(defaultEventCompletionInput);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to complete event.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDismissEvent(): Promise<void> {
    if (!userId || !activeEvent) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiRequest<EventDismissResponseData>(`/events/${activeEvent.id}/dismiss`, {
        method: "POST",
        userId,
      });
      const nextHome = await apiRequest<HomePayloadData>("/home", { userId });

      startTransition(() => {
        setSummary(nextHome.progression);
        setBundle(nextHome.quests);
        setAttributes(nextHome.attributes);
        setActiveEvent(nextHome.active_event);
        setTopNotification(nextHome.top_notification);
        setNotificationCount(nextHome.notification_count);
        setGuideCard(nextHome.guide_card);
        setGuideMessage(nextHome.guide_message);
        setSelectedEvent(null);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to dismiss event.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDismissNotification(): Promise<void> {
    if (!userId || !topNotification) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiRequest<NotificationDismissResponseData>(
        `/notifications/${topNotification.id}/dismiss`,
        {
          method: "POST",
          userId,
        },
      );
      const nextHome = await apiRequest<HomePayloadData>("/home", { userId });
      startTransition(() => {
        setSummary(nextHome.progression);
        setBundle(nextHome.quests);
        setAttributes(nextHome.attributes);
        setActiveEvent(nextHome.active_event);
        setTopNotification(nextHome.top_notification);
        setNotificationCount(nextHome.notification_count);
        setGuideCard(nextHome.guide_card);
        setGuideMessage(nextHome.guide_message);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to dismiss notification.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!userId) {
    return (
      <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Home Locked</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Complete onboarding from Profile before the daily quest loop becomes active.
        </p>
      </article>
    );
  }

  if (loading || !summary || !bundle) {
    return (
      <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Loading</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Pulling deterministic progression state and today&apos;s quest bundle from the API.
        </p>
      </article>
    );
  }

  const allQuests = [...bundle.mandatory, ...bundle.optional, ...(bundle.stretch ? [bundle.stretch] : [])];
  const questCount = allQuests.length;
  const completedCount = allQuests.filter((quest) => quest.status === "completed").length;
  const mandatoryCompletedCount = bundle.mandatory.filter(
    (quest) => quest.status === "completed",
  ).length;
  const dailyCompletionRatio = questCount === 0 ? 0 : Math.round((completedCount / questCount) * 100);
  const primaryFocusLabel =
    mandatoryCompletedCount < bundle.mandatory.length
      ? `Clear ${bundle.mandatory.length - mandatoryCompletedCount} mandatory quest${bundle.mandatory.length - mandatoryCompletedCount === 1 ? "" : "s"}`
      : bundle.optional.some((quest) => quest.status !== "completed")
        ? "Use optional quests to compound the day"
        : bundle.stretch && bundle.stretch.status !== "completed"
          ? "Stretch if the day still has margin"
          : "Daily command loop is complete";

  return (
    <>
      {activeEvent ? (
        <CompactAlertStrip
          eyebrow="Event Reminder"
          title={`${activeEvent.title} is live now`}
          body={
            eventCountdown
              ? `Limited window remaining: ${eventCountdown}.`
              : "Limited window active right now."
          }
          tone="warning"
          meta={
            <>
              <QuestBadge
                label={activeEvent.event_type}
                tone={activeEvent.event_type === "recovery" ? "stretch" : "xp"}
              />
              <QuestBadge label={`${activeEvent.reward_xp_base} XP`} tone="xp" />
              {eventCountdown ? <QuestBadge label={eventCountdown} tone="neutral" /> : null}
            </>
          }
          action={
            <button
              type="button"
              className="rounded-2xl bg-sky-300 px-4 py-3 text-sm font-medium text-slate-950 transition hover:opacity-90"
              onClick={() => setSelectedEvent(activeEvent)}
            >
              Open Event
            </button>
          }
        />
      ) : null}

      <article className="home-stage overflow-hidden rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_290px] lg:items-start">
          <div className="stage-item stage-delay-1">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">What should I do next?</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight sm:text-[2.5rem]">
              {primaryFocusLabel}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {bundle.generated_for_date} · {completedCount}/{questCount} cleared · {dailyCompletionRatio}% through the day
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <SummaryMetric label="Rank" value={summary.rank} supporting={summary.rank_context_label} emphasis />
              <SummaryMetric label="Level" value={String(summary.level)} supporting={summary.rank_context_subtitle} emphasis />
              <SummaryMetric label="XP" value={String(summary.total_xp)} supporting={`${summary.rank_progress.xp_remaining_to_next_rank} to next rank`} emphasis />
              <SummaryMetric
                label="Daily Progress"
                value={`${completedCount}/${questCount}`}
                supporting={`${mandatoryCompletedCount}/${bundle.mandatory.length} mandatory`}
                emphasis
              />
            </div>

            <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-4 card-float-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Current push</p>
                  <p className="mt-2 text-base font-semibold text-text">{summary.rank_context_label}</p>
                </div>
                <StatusMetric label="Streak" value={`${summary.current_streak_days}d`} compact />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{summary.rank_context_subtitle}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-canvas/70">
                <div
                  className="progress-shimmer h-full rounded-full bg-accent transition-all duration-700"
                  style={{ width: `${dailyCompletionRatio}%` }}
                />
              </div>
            </div>
          </div>

          <div className="stage-item stage-delay-2 rounded-3xl border border-accent/20 bg-canvas/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-accent">Current State</p>
                <h4 className="mt-2 text-lg font-semibold text-text">Attribute form</h4>
              </div>
              <QuestBadge label={summary.rank_context_label} tone="mandatory" />
            </div>
            <div className="home-radar-shell mt-4">
              <RadarChart attributes={attributes} size="compact" pulseRecentChanges />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <StatusMetric label="Next rank" value={summary.rank_progress.next_rank ?? "Max"} compact />
              <StatusMetric label="XP left" value={String(summary.rank_progress.xp_remaining_to_next_rank)} compact />
            </div>
          </div>
        </div>

        {error ? <ErrorBanner message={error} /> : null}
      </article>

      <GuideDockCard
        userId={userId}
        screen="home"
        card={guideCard}
        message={guideMessage}
        onMessageDismissed={() => setGuideMessage(null)}
      />

      <QuestSection
        title="Mandatory"
        description="Secure the floor first."
        quests={bundle.mandatory}
        onSelect={setSelectedQuest}
        variant="mandatory"
        lastCompletedQuestId={lastCompletedQuestId}
      />
      <QuestSection
        title="Optional"
        description="Compound the day after the floor is secured."
        quests={bundle.optional}
        onSelect={setSelectedQuest}
        variant="optional"
        lastCompletedQuestId={lastCompletedQuestId}
      />

      <article className="stage-item stage-delay-5 rounded-3xl border border-line bg-panel/70 p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Stretch</p>
        <p className="mt-2 text-sm leading-6 text-muted">Only if the day has margin.</p>
        {bundle.stretch ? (
          <QuestCard
            quest={bundle.stretch}
            onSelect={setSelectedQuest}
            variant="stretch"
            lastCompletedQuestId={lastCompletedQuestId}
          />
        ) : (
          <p className="mt-4 text-sm text-muted">No stretch quest assigned today.</p>
        )}
      </article>

      {topNotification ? (
        <CompactAlertStrip
          eyebrow="Alert"
          title={topNotification.title}
          body={topNotification.body}
          meta={
            <>
              <QuestBadge label={topNotification.notification_type.replace("_", " ")} tone="optional" />
              {notificationCount > 1 ? (
                <QuestBadge label={`${notificationCount} active`} tone="xp" />
              ) : null}
            </>
          }
          action={
            <button
              type="button"
              className="rounded-2xl border border-line px-4 py-3 text-sm text-muted transition hover:text-text"
              onClick={() => {
                void handleDismissNotification();
              }}
            >
              Dismiss
            </button>
          }
        />
      ) : null}

      {activeEvent ? (
        <CompactAlertStrip
          eyebrow="Active Event"
          title={activeEvent.title}
          body={activeEvent.description}
          tone="event"
          meta={
            <>
              <QuestBadge
                label={activeEvent.event_type}
                tone={activeEvent.event_type === "recovery" ? "stretch" : "xp"}
              />
              <QuestBadge label={`${activeEvent.reward_xp_base} XP`} tone="xp" />
              <QuestBadge
                label={eventCountdown ?? formatEventExpiry(activeEvent.expires_at)}
                tone="neutral"
              />
            </>
          }
          action={
            <>
              <button
                type="button"
                className="rounded-2xl border border-sky-300/25 bg-transparent px-4 py-3 text-sm font-medium text-sky-100 transition hover:bg-sky-300/8"
                onClick={() => {
                  void handleDismissEvent();
                }}
                disabled={submitting}
              >
                {submitting ? "Updating..." : "Dismiss"}
              </button>
              <button
                type="button"
                className="rounded-2xl bg-sky-300 px-4 py-3 text-sm font-medium text-slate-950 transition hover:opacity-90"
                onClick={() => setSelectedEvent(activeEvent)}
              >
                Complete Event
              </button>
            </>
          }
        />
      ) : null}

      {rewardFeedback ? (
        <RewardFeedbackCard
          eyebrow="Reward Feedback"
          title={`${rewardFeedback.kind === "event" ? "Event" : "Quest"} complete: ${rewardFeedback.title}`}
          subtitle={rewardFeedback.status}
          xpAwarded={rewardFeedback.xp_awarded}
          newTotalXp={rewardFeedback.new_total_xp}
          newLevel={rewardFeedback.new_level}
          attributeChanges={rewardFeedback.attribute_changes}
          emphasis={rewardFeedback.kind === "event" ? "strong" : "light"}
        />
      ) : null}

      {selectedQuest ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-line bg-panel p-6 shadow-panel">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Completion</p>
            <h3 className="mt-3 text-2xl font-semibold">{selectedQuest.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{selectedQuest.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <QuestBadge label={selectedQuest.difficulty} tone="neutral" />
              <QuestBadge label={`${selectedQuest.reward_xp_base} XP`} tone="xp" />
            </div>

            <label className="mt-5 block text-sm text-muted">
              Intensity
              <select
                className="mt-2 w-full rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-text outline-none"
                value={completionInput.intensity ?? "medium"}
                onChange={(event) =>
                  setCompletionInput((current) => ({
                    ...current,
                    intensity: event.target.value as QuestCompletionInput["intensity"],
                  }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="mt-4 block text-sm text-muted">
              Note
              <textarea
                className="mt-2 min-h-28 w-full rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-text outline-none"
                value={completionInput.note ?? ""}
                onChange={(event) =>
                  setCompletionInput((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Optional context only. It does not affect scoring."
              />
            </label>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-2xl border border-line px-4 py-3 text-sm text-muted transition hover:text-text"
                onClick={() => {
                  setSelectedQuest(null);
                  setCompletionInput(defaultCompletionInput);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-canvas transition hover:opacity-90"
                onClick={() => {
                  void handleCompleteQuest();
                }}
                disabled={submitting}
              >
                {submitting ? "Recording..." : "Confirm Completion"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedEvent ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-line bg-panel p-6 shadow-panel">
            <p className="text-xs uppercase tracking-[0.25em] text-sky-200">Event Completion</p>
            <h3 className="mt-3 text-2xl font-semibold">{selectedEvent.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{selectedEvent.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <QuestBadge
                label={selectedEvent.event_type}
                tone={selectedEvent.event_type === "recovery" ? "stretch" : "xp"}
              />
              <QuestBadge label={selectedEvent.difficulty} tone="neutral" />
              <QuestBadge label={`${selectedEvent.reward_xp_base} XP`} tone="xp" />
            </div>

            <label className="mt-4 block text-sm text-muted">
              Note
              <textarea
                className="mt-2 min-h-28 w-full rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-text outline-none"
                value={eventCompletionInput.note ?? ""}
                onChange={(event) =>
                  setEventCompletionInput((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Optional event note. It does not affect scoring."
              />
            </label>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-2xl border border-line px-4 py-3 text-sm text-muted transition hover:text-text"
                onClick={() => {
                  setSelectedEvent(null);
                  setEventCompletionInput(defaultEventCompletionInput);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-2xl bg-sky-300 px-4 py-3 text-sm font-medium text-slate-950 transition hover:opacity-90"
                onClick={() => {
                  void handleCompleteEvent();
                }}
                disabled={submitting}
              >
                {submitting ? "Recording..." : "Confirm Event Completion"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function QuestSection({
  title,
  description,
  quests,
  onSelect,
  variant,
  lastCompletedQuestId,
}: {
  title: string;
  description: string;
  quests: QuestResponseData[];
  onSelect: (quest: QuestResponseData) => void;
  variant: "mandatory" | "optional";
  lastCompletedQuestId: string | null;
}) {
  const sectionClasses =
    variant === "mandatory"
      ? "border-accent/28 bg-[linear-gradient(180deg,rgba(212,168,79,0.07),rgba(17,24,34,0.72))]"
      : "border-line bg-panel/70";

  return (
    <article className={`rounded-3xl border p-5 shadow-panel ${sectionClasses}`}>
      <p className="text-xs uppercase tracking-[0.25em] text-accent">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-4 space-y-3">
        {quests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            onSelect={onSelect}
            variant={variant}
            lastCompletedQuestId={lastCompletedQuestId}
          />
        ))}
      </div>
    </article>
  );
}

function QuestCard({
  quest,
  onSelect,
  variant,
  lastCompletedQuestId,
}: {
  quest: QuestResponseData;
  onSelect: (quest: QuestResponseData) => void;
  variant: "mandatory" | "optional" | "stretch";
  lastCompletedQuestId: string | null;
}) {
  const complete = quest.status === "completed";
  const recentlyCompleted = lastCompletedQuestId === quest.id;
  const cardTone =
    variant === "mandatory"
      ? "border-accent/24"
      : variant === "stretch"
        ? "border-sky-400/20"
        : "border-line";

  return (
    <div
      className={`rounded-2xl border bg-canvas/50 p-4 transition-all ${
        complete
          ? "border-emerald-400/25 bg-emerald-500/6"
          : `${cardTone} hover:bg-canvas/60`
      } ${recentlyCompleted ? "quest-success-pop" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-base font-medium text-text">{quest.title}</h4>
          <p className="mt-2 text-sm leading-6 text-muted">{quest.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <QuestBadge label={variant} tone={variant} />
            <QuestBadge label={quest.difficulty} tone="neutral" />
            <QuestBadge label={`${quest.reward_xp_base} XP`} tone="xp" />
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
            complete
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-accent/15 text-accent"
          }`}
        >
          {complete ? "Completed" : "Active"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {variant === "mandatory"
            ? "Daily floor quest"
            : variant === "stretch"
              ? "Aspirational push quest"
              : "Supplementary daily quest"}
        </p>
        <button
          type="button"
          className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
            complete
              ? "cursor-not-allowed border border-line bg-panel/60 text-muted"
              : "bg-accent text-canvas hover:opacity-90"
          }`}
          onClick={() => onSelect(quest)}
          disabled={complete}
        >
          {complete ? "Already Logged" : "Complete"}
        </button>
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  supporting,
  emphasis = false,
}: {
  label: string;
  value: string;
  supporting?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        emphasis ? "border-accent/22 bg-canvas/60" : "border-line bg-canvas/50"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.25em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-text">{value}</p>
      {supporting ? <p className="mt-2 text-xs leading-5 text-muted">{supporting}</p> : null}
    </div>
  );
}

function StatusMetric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-canvas/35 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className={`mt-2 font-medium text-text ${compact ? "text-sm" : "text-base"}`}>{value}</p>
    </div>
  );
}

function QuestBadge({
  label,
  tone,
}: {
  label: string;
  tone: "mandatory" | "optional" | "stretch" | "neutral" | "xp";
}) {
  const toneClass =
    tone === "mandatory"
      ? "border-accent/28 bg-accent/10 text-accent"
      : tone === "optional"
        ? "border-line bg-canvas/70 text-muted"
        : tone === "stretch"
          ? "border-sky-400/25 bg-sky-400/10 text-sky-200"
          : tone === "xp"
            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
            : "border-line bg-canvas/55 text-muted";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${toneClass}`}
    >
      {label}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {message}
    </div>
  );
}

function labelize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatEventExpiry(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Limited window";
  }

  return `Until ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatCountdown(remainingMs: number): string | null {
  if (!Number.isFinite(remainingMs)) {
    return null;
  }

  if (remainingMs <= 0) {
    return "Ending now";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
