"use client";

import {
  type AttributeResponseData,
  type DailyQuestBundleData,
  type ProgressionSummaryData,
  type QuestCompletionInput,
  type QuestCompletionResponseData,
  type QuestResponseData,
} from "@kshetra/types";
import { startTransition, useEffect, useState } from "react";

import { apiRequest } from "../../lib/api-client";
import { getStoredUserId } from "../../lib/session";
import { RadarChart } from "../radar/radar-chart";

const defaultCompletionInput: QuestCompletionInput = {
  intensity: "medium",
  note: "",
};

export function HomeClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProgressionSummaryData | null>(null);
  const [bundle, setBundle] = useState<DailyQuestBundleData | null>(null);
  const [attributes, setAttributes] = useState<AttributeResponseData[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<QuestResponseData | null>(null);
  const [completionInput, setCompletionInput] =
    useState<QuestCompletionInput>(defaultCompletionInput);
  const [rewardFeedback, setRewardFeedback] =
    useState<QuestCompletionResponseData | null>(null);
  const [lastCompletedQuestId, setLastCompletedQuestId] = useState<string | null>(null);
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

  async function loadHomeState(activeUserId: string): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const [nextSummary, nextBundle, nextAttributes] = await Promise.all([
        apiRequest<ProgressionSummaryData>("/progression/summary", {
          userId: activeUserId,
        }),
        apiRequest<DailyQuestBundleData>("/quests/today", {
          userId: activeUserId,
        }),
        apiRequest<AttributeResponseData[]>("/attributes", {
          userId: activeUserId,
        }),
      ]);

      startTransition(() => {
        setSummary(nextSummary);
        setBundle(nextBundle);
        setAttributes(nextAttributes);
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
      const [nextSummary, nextAttributes] = await Promise.all([
        apiRequest<ProgressionSummaryData>("/progression/summary", {
          userId,
        }),
        apiRequest<AttributeResponseData[]>("/attributes", {
          userId,
        }),
      ]);

      startTransition(() => {
        setSummary(nextSummary);
        setAttributes(nextAttributes);
        setBundle((current) => {
          if (!current) {
            return current;
          }

          const markCompleted = (quest: QuestResponseData): QuestResponseData =>
            quest.id === selectedQuest.id
              ? {
                  ...quest,
                  status: "completed",
                  completed_at: new Date().toISOString(),
                }
              : quest;

          return {
            ...current,
            mandatory: current.mandatory.map(markCompleted),
            optional: current.optional.map(markCompleted),
            stretch:
              current.stretch && current.stretch.id === selectedQuest.id
                ? markCompleted(current.stretch)
                : current.stretch,
          };
        });
        setRewardFeedback(reward);
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
      <article className="home-stage overflow-hidden rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:items-start">
          <div className="stage-item stage-delay-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-[0.25em] text-accent">Hero Summary</p>
              <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-accent">
                Today&apos;s command center
              </span>
            </div>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Drive the day through the deterministic loop
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              {bundle.generated_for_date} • {completedCount}/{questCount} quests cleared. Rewards,
              XP, and attribute movement are computed server-side, then reflected here as system
              state.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]">
              <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-4 card-float-soft">
                <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Primary Focus</p>
                <p className="mt-3 text-lg font-semibold text-text">{primaryFocusLabel}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Mandatory quests define the valid daily floor. Optional and stretch layers add
                  pressure only after the core is secured.
                </p>
              </div>
              <SummaryMetric label="Rank" value={summary.rank} emphasis />
              <SummaryMetric label="Level" value={String(summary.level)} emphasis />
              <SummaryMetric label="XP" value={String(summary.total_xp)} emphasis />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <StatusMetric
                label="Mandatory cleared"
                value={`${mandatoryCompletedCount}/${bundle.mandatory.length}`}
              />
              <StatusMetric label="Daily completion" value={`${completedCount}/${questCount}`} />
              <StatusMetric
                label="Next rank pressure"
                value={`${summary.rank_progress.xp_remaining_to_next_rank} XP left`}
              />
            </div>
          </div>

          <div className="stage-item stage-delay-2 rounded-3xl border border-accent/20 bg-canvas/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-accent">Current State</p>
                <h4 className="mt-2 text-lg font-semibold text-text">Attribute form</h4>
              </div>
              <div className="rounded-2xl border border-line bg-canvas/60 px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Streak</p>
                <p className="mt-1 text-base font-semibold text-text">
                  {summary.current_streak_days} day{summary.current_streak_days === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="home-radar-shell mt-4">
              <RadarChart attributes={attributes} size="full" pulseRecentChanges />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              The radar is presentation-only, but it is the clearest visible read on current
              system state.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="stage-item stage-delay-3 rounded-2xl border border-line bg-canvas/35 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Daily Pressure</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-canvas/70">
              <div
                className="progress-shimmer h-full rounded-full bg-accent transition-all duration-700"
                style={{
                  width: `${questCount === 0 ? 0 : Math.round((completedCount / questCount) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted">
              <span>{completedCount} complete</span>
              <span>{questCount - completedCount} remaining</span>
            </div>
          </div>
          <div className="stage-item stage-delay-4 rounded-2xl border border-line bg-canvas/35 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Command Rule</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Mandatory quests are the day floor. Optional quests deepen the day. Stretch should
              feel aspirational, not routine.
            </p>
          </div>
        </div>

        {error ? <ErrorBanner message={error} /> : null}
      </article>

      <QuestSection
        title="Mandatory"
        description="Three required daily quests. These anchor the day."
        quests={bundle.mandatory}
        onSelect={setSelectedQuest}
        variant="mandatory"
        lastCompletedQuestId={lastCompletedQuestId}
      />
      <QuestSection
        title="Optional"
        description="Two useful additions. Helpful, not required."
        quests={bundle.optional}
        onSelect={setSelectedQuest}
        variant="optional"
        lastCompletedQuestId={lastCompletedQuestId}
      />

      <article className="stage-item stage-delay-5 rounded-3xl border border-line bg-panel/70 p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Stretch</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Aspirational push work for a stronger day.
        </p>
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

      <article
        className={`rounded-3xl border p-5 shadow-panel transition-all ${
          rewardFeedback
            ? "border-accent/45 bg-accent/10 reward-flash"
            : "border-line bg-panel/70"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Reward Feedback</p>
        {rewardFeedback ? (
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p className="text-lg font-semibold text-text">
              +{rewardFeedback.xp_awarded} XP awarded · {rewardFeedback.quest_status}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusMetric label="New total XP" value={String(rewardFeedback.new_total_xp)} />
              <StatusMetric label="New level" value={String(rewardFeedback.new_level)} />
              <StatusMetric
                label="Attributes moved"
                value={String(rewardFeedback.attribute_changes.length)}
              />
            </div>
            <div className="space-y-2">
              {rewardFeedback.attribute_changes.map((change) => (
                <div
                  key={change.code}
                  className="rounded-2xl border border-line bg-canvas/50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-text">{labelize(change.code)}</span>
                    <span className="font-medium text-accent">+{change.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-muted">
            Complete a quest to view audited XP and attribute deltas here.
          </p>
        )}
      </article>

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
  emphasis = false,
}: {
  label: string;
  value: string;
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
    </div>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas/35 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className="mt-2 text-base font-medium text-text">{value}</p>
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
