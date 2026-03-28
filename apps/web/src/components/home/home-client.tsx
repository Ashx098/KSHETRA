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
import { RadarChart } from "../radar/radar-chart";
import { getStoredUserId } from "../../lib/session";

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

  const questCount = bundle.mandatory.length + bundle.optional.length + (bundle.stretch ? 1 : 0);
  const completedCount = [
    ...bundle.mandatory,
    ...bundle.optional,
    ...(bundle.stretch ? [bundle.stretch] : []),
  ].filter((quest) => quest.status === "completed").length;

  return (
    <>
      <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_300px] lg:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Hero Summary</p>
            <h3 className="mt-3 text-2xl font-semibold">Today&apos;s deterministic loop</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {bundle.generated_for_date} • {completedCount}/{questCount} quests cleared. Rank
              progression and rewards are computed server-side only.
            </p>
            <div className="mt-5 grid min-w-[240px] grid-cols-3 gap-3">
              <SummaryMetric label="Rank" value={summary.rank} />
              <SummaryMetric label="Level" value={String(summary.level)} />
              <SummaryMetric label="XP" value={String(summary.total_xp)} />
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-canvas/35 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Current State</p>
            <div className="mt-4">
              <RadarChart
                attributes={attributes}
                size="compact"
                pulseRecentChanges
              />
            </div>
          </div>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
      </article>

      <QuestSection
        title="Mandatory"
        description="Three required daily quests. These anchor the day."
        quests={bundle.mandatory}
        onSelect={setSelectedQuest}
      />
      <QuestSection
        title="Optional"
        description="Two useful additions. Helpful, not required."
        quests={bundle.optional}
        onSelect={setSelectedQuest}
      />

      <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Stretch</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Aspirational push work for a stronger day.
        </p>
        {bundle.stretch ? (
          <QuestCard quest={bundle.stretch} onSelect={setSelectedQuest} />
        ) : (
          <p className="mt-4 text-sm text-muted">No stretch quest assigned today.</p>
        )}
      </article>

      <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Reward Feedback</p>
        {rewardFeedback ? (
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p className="text-base font-medium text-text">
              +{rewardFeedback.xp_awarded} XP awarded
            </p>
            <p>New total XP: {rewardFeedback.new_total_xp}</p>
            <p>New level: {rewardFeedback.new_level}</p>
            <div className="space-y-2">
              {rewardFeedback.attribute_changes.map((change) => (
                <div
                  key={change.code}
                  className="rounded-2xl border border-line bg-canvas/50 px-3 py-2"
                >
                  {labelize(change.code)} +{change.delta}
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
                placeholder="Optional context only. It does not affect scoring in Phase 2."
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
}: {
  title: string;
  description: string;
  quests: QuestResponseData[];
  onSelect: (quest: QuestResponseData) => void;
}) {
  return (
    <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-4 space-y-3">
        {quests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} onSelect={onSelect} />
        ))}
      </div>
    </article>
  );
}

function QuestCard({
  quest,
  onSelect,
}: {
  quest: QuestResponseData;
  onSelect: (quest: QuestResponseData) => void;
}) {
  const complete = quest.status === "completed";

  return (
    <div className="rounded-2xl border border-line bg-canvas/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-base font-medium text-text">{quest.title}</h4>
          <p className="mt-2 text-sm leading-6 text-muted">{quest.description}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
            complete
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-accent/15 text-accent"
          }`}
        >
          {complete ? "Completed" : quest.difficulty}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Base reward: {quest.reward_xp_base} XP</p>
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

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas/50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.25em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-text">{value}</p>
    </div>
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
