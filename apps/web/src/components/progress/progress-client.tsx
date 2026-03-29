"use client";

import type {
  AttributeResponseData,
  ProgressionHistoryData,
  ProgressionSummaryData,
} from "@kshetra/types";
import { startTransition, useEffect, useState } from "react";

import { apiRequest } from "../../lib/api-client";
import { GuideDockCard } from "../guide/guide-card";
import { RadarChart } from "../radar/radar-chart";
import { getStoredUserId } from "../../lib/session";

const HISTORY_RANGES = ["7d", "30d", "90d", "1y"] as const;

export function ProgressClient() {
  const [summary, setSummary] = useState<ProgressionSummaryData | null>(null);
  const [history, setHistory] = useState<ProgressionHistoryData | null>(null);
  const [attributes, setAttributes] = useState<AttributeResponseData[]>([]);
  const [range, setRange] =
    useState<ProgressionHistoryData["range"]>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = getStoredUserId();

    if (!userId) {
      setLoading(false);
      return;
    }

    void load(userId, range);
  }, [range]);

  async function load(
    userId: string,
    activeRange: ProgressionHistoryData["range"],
  ): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const [progressionSummary, progressionHistory, attributeList] = await Promise.all([
        apiRequest<ProgressionSummaryData>("/progression/summary", { userId }),
        apiRequest<ProgressionHistoryData>(`/progression/history?range=${activeRange}`, {
          userId,
        }),
        apiRequest<AttributeResponseData[]>("/attributes", { userId }),
      ]);

      startTransition(() => {
        setSummary(progressionSummary);
        setHistory(progressionHistory);
        setAttributes(attributeList);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load progress state.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <p className="text-sm text-muted">Loading progression history...</p>
      </section>
    );
  }

  if (!summary || !history) {
    return (
      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Progress</p>
        <h3 className="mt-2 text-xl font-semibold">Onboard first</h3>
        <p className="mt-3 text-sm leading-6 text-muted">
          Complete onboarding from the Profile screen before progression history becomes available.
        </p>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </section>
    );
  }

  const xpProgress = summary.rank_progress.next_rank_xp_threshold
    ? Math.min(
        100,
        Math.round(
          (summary.total_xp / summary.rank_progress.next_rank_xp_threshold) * 100,
        ),
      )
    : 100;

  return (
    <>
      <section className="rounded-3xl border border-accent/22 bg-panel/70 p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Rank / Level</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight">
          {summary.rank} · {summary.level}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          {summary.rank_context_label} · {summary.total_xp} total XP
        </p>
      </section>

      <GuideDockCard
        userId={getStoredUserId()}
        screen="progress"
        card={history.guide_card}
        message={history.guide_message}
      />

      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Streak</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight">
          {summary.current_streak_days} days
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Longest {summary.longest_streak_days} · Status {summary.streak_status}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Last valid day: {summary.last_valid_day ?? "none"}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Next milestone:{" "}
          {summary.next_streak_milestone_days
            ? `${summary.next_streak_milestone_days} days (+${summary.next_streak_milestone_bonus_xp} XP)`
            : "none"}
        </p>
      </section>

      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Current Attribute Form</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">Current attribute form</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              The shape shows where recent system pressure is landing.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-canvas/35 p-4">
            <RadarChart attributes={attributes} size="full" pulseRecentChanges />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <div className="grid gap-3 md:grid-cols-3">
          <InsightCard
            label="Recent trend"
            value={labelize(history.insights.recent_xp_trend)}
            supporting="Last 3 valid days"
          />
          <InsightCard
            label="Most improved"
            value={
              history.insights.most_improved_attribute.code
                ? `${labelize(history.insights.most_improved_attribute.code)} +${history.insights.most_improved_attribute.delta.toFixed(1)}`
                : "No clear edge"
            }
            supporting={`Across ${range}`}
          />
          <InsightCard
            label="Current focus"
            value={history.insights.current_focus_signal}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Rank Progress</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">
              {summary.rank_progress.current_rank} to {summary.rank_progress.next_rank ?? "Max"}
            </h3>
          </div>
          <label className="text-sm text-muted">
            History range
            <select
              className="ml-3 rounded-2xl border border-line bg-canvas/60 px-3 py-2 text-text outline-none"
              value={range}
              onChange={(event) =>
                setRange(event.target.value as ProgressionHistoryData["range"])
              }
            >
              {HISTORY_RANGES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-canvas/50">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <div className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-3">
          <Metric label="XP remaining" value={String(summary.rank_progress.xp_remaining_to_next_rank)} />
          <Metric
            label="Streak remaining"
            value={String(summary.rank_progress.streak_requirement_remaining)}
          />
          <Metric label="Next rank XP" value={String(summary.rank_progress.next_rank_xp_threshold ?? 0)} />
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">XP History</p>
        <div className="mt-4 space-y-3">
          {history.xp_timeline.length ? (
            history.xp_timeline.map((day) => (
              <article key={day.date} className="rounded-2xl border border-line bg-canvas/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text">{day.date}</span>
                  <span className="text-sm text-accent">+{day.total_xp_gained} XP</span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-muted">
                  {day.entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-3">
                      <span>{entry.source}</span>
                      <span>+{entry.delta_xp}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted">No XP history for this range.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Attribute History</p>
        <div className="mt-4 space-y-3">
          {history.attribute_timeline.length ? (
            history.attribute_timeline.map((day) => (
              <article key={day.date} className="rounded-2xl border border-line bg-canvas/40 p-4">
                <p className="text-sm font-medium text-text">{day.date}</p>
                <div className="mt-3 space-y-2 text-sm text-muted">
                  {day.changes.map((change) => (
                    <div key={change.id} className="flex items-center justify-between gap-3">
                      <span>{labelize(change.code)}</span>
                      <span>+{change.delta}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted">No attribute history for this range.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Valid Days / Milestones</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {history.valid_days.length ? (
              history.valid_days.map((day) => (
                <article key={day.date} className="rounded-2xl border border-line bg-canvas/40 p-4 text-sm text-muted">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-text">{day.date}</span>
                    <span className={day.is_valid ? "text-emerald-300" : "text-muted"}>
                      {day.is_valid ? "valid" : "invalid"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <span>{day.meaningful_completion_count} completions</span>
                    <span>{day.total_xp} XP</span>
                    <span>{day.low_difficulty_xp} low-difficulty XP</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted">No valid-day records for this range.</p>
            )}
          </div>
          <div className="space-y-3">
            {history.milestones.length ? (
              history.milestones.map((item) => (
                <article key={item.ledger_id} className="rounded-2xl border border-line bg-canvas/40 p-4 text-sm text-muted">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-text">{item.date}</span>
                    <span className="text-accent">+{item.bonus_xp} XP</span>
                  </div>
                  <p className="mt-2">{item.streak_days}-day streak milestone</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted">No milestone bonuses for this range.</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas/40 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-text">{value}</p>
    </div>
  );
}

function InsightCard({
  label,
  value,
  supporting,
}: {
  label: string;
  value: string;
  supporting?: string;
}) {
  return (
    <article className="rounded-2xl border border-line bg-canvas/40 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">{label}</p>
      <p className="mt-3 text-base font-medium leading-6 text-text">{value}</p>
      {supporting ? <p className="mt-2 text-sm text-muted">{supporting}</p> : null}
    </article>
  );
}

function labelize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
