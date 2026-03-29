"use client";

import type {
  DungeonLogInput,
  DungeonLogResponseData,
  DungeonObjectiveResponseData,
  DungeonResponseData,
  GuideCardData,
  GuideMessageData,
  MissionsPayloadData,
  RaidCompletionInput,
  RaidCompletionRewardData,
  RaidLogInput,
  RaidLogResponseData,
  RaidObjectiveResponseData,
  RaidResponseData,
} from "@kshetra/types";
import { startTransition, useEffect, useState, type ReactNode } from "react";

import { apiRequest } from "../../lib/api-client";
import { GuideDockCard } from "../guide/guide-card";
import { getStoredUserId } from "../../lib/session";
import {
  QuickProgressButton,
  RewardFeedbackCard,
  StateCard,
} from "../shared/system-cards";

const defaultDungeonLogInput: DungeonLogInput = {
  delta_progress: 1,
  note: "",
};

const defaultRaidLogInput: RaidLogInput = {
  delta_progress: 1,
  note: "",
};

const defaultRaidCompletionInput: RaidCompletionInput = {
  verification_summary: "",
  artifact_reference: "",
};

type CompletionState = {
  kind: "dungeon" | "raid";
  title: string;
  xp_awarded: number;
  new_total_xp: number;
  new_level: number;
  attribute_changes: Array<{ code: string; delta: number }>;
  message?: string;
};

export function MissionsClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeDungeon, setActiveDungeon] = useState<DungeonResponseData | null>(null);
  const [availableDungeonTemplates, setAvailableDungeonTemplates] = useState<
    MissionsPayloadData["available_dungeon_templates"]
  >([]);
  const [selectedDungeonTemplateId, setSelectedDungeonTemplateId] = useState<string>("");
  const [selectedDungeonObjective, setSelectedDungeonObjective] =
    useState<DungeonObjectiveResponseData | null>(null);
  const [dungeonLogInput, setDungeonLogInput] =
    useState<DungeonLogInput>(defaultDungeonLogInput);

  const [activeRaid, setActiveRaid] = useState<RaidResponseData | null>(null);
  const [availableRaidTemplates, setAvailableRaidTemplates] = useState<
    MissionsPayloadData["available_raid_templates"]
  >([]);
  const [selectedRaidTemplateId, setSelectedRaidTemplateId] = useState<string>("");
  const [selectedRaidObjective, setSelectedRaidObjective] =
    useState<RaidObjectiveResponseData | null>(null);
  const [raidLogInput, setRaidLogInput] = useState<RaidLogInput>(defaultRaidLogInput);
  const [raidCompletionInput, setRaidCompletionInput] =
    useState<RaidCompletionInput>(defaultRaidCompletionInput);

  const [completionState, setCompletionState] = useState<CompletionState | null>(null);
  const [guideCard, setGuideCard] = useState<GuideCardData | undefined>(undefined);
  const [guideMessage, setGuideMessage] = useState<GuideMessageData | null>(null);
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

    void loadMissionsState(storedUserId);
  }, []);

  async function loadMissionsState(activeUserId: string): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const payload = await apiRequest<MissionsPayloadData>("/missions", {
        userId: activeUserId,
      });

      startTransition(() => {
        setActiveDungeon(payload.active_dungeon);
        setAvailableDungeonTemplates(payload.available_dungeon_templates);
        setSelectedDungeonTemplateId(payload.available_dungeon_templates[0]?.id ?? "");
        setActiveRaid(payload.active_raid);
        setAvailableRaidTemplates(payload.available_raid_templates);
        setSelectedRaidTemplateId(payload.available_raid_templates[0]?.id ?? "");
        setGuideCard(payload.guide_card);
        setGuideMessage(payload.guide_message);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load mission state.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleStartDungeon(): Promise<void> {
    if (!userId || !selectedDungeonTemplateId) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiRequest("/dungeons/start", {
        method: "POST",
        userId,
        body: { template_id: selectedDungeonTemplateId },
      });
      await loadMissionsState(userId);
      setCompletionState(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to start dungeon.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogDungeonObjective(
    objective: DungeonObjectiveResponseData,
    input: DungeonLogInput,
  ): Promise<void> {
    if (!userId || !activeDungeon) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await apiRequest<DungeonLogResponseData>(
        `/dungeons/${activeDungeon.id}/objectives/${objective.id}/log`,
        {
          method: "POST",
          userId,
          body: input,
        },
      );

      startTransition(() => {
        setActiveDungeon(response.dungeon);
        if (response.reward) {
          setCompletionState({
            kind: "dungeon",
            title: response.dungeon.title,
            xp_awarded: response.reward.xp_awarded,
            new_total_xp: response.reward.new_total_xp,
            new_level: response.reward.new_level,
            attribute_changes: response.reward.attribute_changes,
          });
        }
        setSelectedDungeonObjective(null);
        setDungeonLogInput(defaultDungeonLogInput);
      });
      await loadMissionsState(userId);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to log dungeon progress.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartRaid(): Promise<void> {
    if (!userId || !selectedRaidTemplateId) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiRequest("/raids/start", {
        method: "POST",
        userId,
        body: { template_id: selectedRaidTemplateId },
      });
      await loadMissionsState(userId);
      setCompletionState(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to start raid.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogRaidObjective(
    objective: RaidObjectiveResponseData,
    input: RaidLogInput,
  ): Promise<void> {
    if (!userId || !activeRaid) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await apiRequest<RaidLogResponseData>(
        `/raids/${activeRaid.id}/objectives/${objective.id}/log`,
        {
          method: "POST",
          userId,
          body: input,
        },
      );

      startTransition(() => {
        setActiveRaid(response.raid);
        setSelectedRaidObjective(null);
        setRaidLogInput(defaultRaidLogInput);
      });
      await loadMissionsState(userId);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to log raid progress.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteRaid(): Promise<void> {
    if (!userId || !activeRaid) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const reward = await apiRequest<RaidCompletionRewardData>(`/raids/${activeRaid.id}/complete`, {
        method: "POST",
        userId,
        body: raidCompletionInput,
      });
      await loadMissionsState(userId);

      startTransition(() => {
        setCompletionState({
          kind: "raid",
          title: activeRaid.title,
          xp_awarded: reward.xp_awarded,
          new_total_xp: reward.new_total_xp,
          new_level: reward.new_level,
          attribute_changes: reward.attribute_changes,
          message: reward.completion_message,
        });
        setRaidCompletionInput(defaultRaidCompletionInput);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to complete raid.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!userId) {
    return (
      <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Missions Locked</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Complete onboarding from Profile before dungeons and raids become available.
        </p>
      </article>
    );
  }

  if (loading) {
    return (
      <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Loading</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Pulling dungeon and raid state from the backend.
        </p>
      </article>
    );
  }

  const currentFocus =
    activeRaid?.ready_for_verification
      ? "Finish raid verification"
      : activeRaid
        ? "Push the active raid forward"
        : activeDungeon
          ? "Advance the active dungeon"
          : "Start one structured challenge";
  const raidReadyRemainingHours =
    activeRaid && !activeRaid.ready_for_verification
      ? Math.max(
          Math.ceil(
            (new Date(activeRaid.started_at).getTime() +
              activeRaid.minimum_completion_window_hours * 60 * 60 * 1000 -
              Date.now()) /
              (60 * 60 * 1000),
          ),
          0,
        )
      : 0;

  return (
    <>
      <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Mission Structure</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">Structured pressure</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{currentFocus}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <MetricCard label="Active dungeon" value={activeDungeon ? "1" : "0"} />
            <MetricCard label="Active raid" value={activeRaid ? "1" : "0"} />
            <MetricCard label="Dungeon XP" value="40" />
            <MetricCard label="Raid XP" value="100" />
          </div>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
      </article>

      <GuideDockCard
        userId={userId}
        screen="missions"
        card={guideCard}
        message={guideMessage}
        onMessageDismissed={() => setGuideMessage(null)}
      />

      <article className="rounded-3xl border border-accent/22 bg-[linear-gradient(180deg,rgba(212,168,79,0.07),rgba(17,24,34,0.72))] p-5 shadow-panel sm:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label="Dungeon Layer" tone="primary" />
              <Badge label="Medium-term" tone="secondary" />
            </div>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight">Structured momentum</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Weekly pressure that should move in small, repeatable steps.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Rule" value="1 active dungeon" />
            <MetricCard label="Available" value={String(availableDungeonTemplates.length)} />
            <MetricCard label="Logging" value="<2 sec target" />
          </div>
        </div>
      </article>

      {activeDungeon ? (
        <>
          <StructuredHero
            title={activeDungeon.title}
            description={activeDungeon.description}
            badge="Active Dungeon"
            difficulty={activeDungeon.difficulty}
            reward={`${activeDungeon.reward_xp_base} XP`}
            progressLabel={`${activeDungeon.progress.completed_objectives}/${activeDungeon.progress.total_objectives} objectives`}
            progressRatio={activeDungeon.progress.completion_ratio}
          />
          <ObjectivePanel
            title="Dungeon Objectives"
            description="Quick log for the common case. Add a note only when you need context."
            objectives={activeDungeon.objectives}
            onQuickLog={(objective) => {
              void handleLogDungeonObjective(objective as DungeonObjectiveResponseData, defaultDungeonLogInput);
            }}
            onAddNote={(objective) => setSelectedDungeonObjective(objective as DungeonObjectiveResponseData)}
          />
        </>
      ) : (
        <StateCard
          eyebrow="Dungeon"
          title="No active dungeon"
          body="Start one medium-term challenge when you want structured weekly pressure."
          action={
            <TemplatePanel
              title="Start a dungeon"
              description="Only one dungeon can stay active at a time."
              templates={availableDungeonTemplates}
              selectedId={selectedDungeonTemplateId}
              onSelect={setSelectedDungeonTemplateId}
              onStart={() => {
                void handleStartDungeon();
              }}
              disabled={submitting || !selectedDungeonTemplateId}
              startLabel={submitting ? "Starting..." : "Start Dungeon"}
              compact
            />
          }
        />
      )}

      <article className="rounded-3xl border border-rose-400/22 bg-[linear-gradient(180deg,rgba(244,114,114,0.07),rgba(17,24,34,0.78))] p-5 shadow-panel sm:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label="Raid Layer" tone="raid" />
              <Badge label="High significance" tone="secondary" />
            </div>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight">Major milestone arc</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Heavier than dungeons, with objective closure plus real verification.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Rule" value="1 active raid" />
            <MetricCard label="Available" value={String(availableRaidTemplates.length)} />
            <MetricCard label="Verification" value="Required" />
          </div>
        </div>
      </article>

      {activeRaid ? (
        <>
          <StructuredHero
            title={activeRaid.title}
            description={activeRaid.description}
            badge={activeRaid.ready_for_verification ? "Verification Ready" : "Active Raid"}
            difficulty={activeRaid.difficulty}
            reward={`${activeRaid.reward_xp_base} XP`}
            progressLabel={`${activeRaid.progress.completed_objectives}/${activeRaid.progress.total_objectives} objectives`}
            progressRatio={activeRaid.progress.completion_ratio}
            tone="raid"
          />
          <ObjectivePanel
            title="Raid Objectives"
            description="Quick log objective steps. Verification only appears at the end."
            objectives={activeRaid.objectives}
            onQuickLog={(objective) => {
              void handleLogRaidObjective(objective as RaidObjectiveResponseData, defaultRaidLogInput);
            }}
            onAddNote={(objective) => setSelectedRaidObjective(objective as RaidObjectiveResponseData)}
            tone="raid"
          />

          <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Verification</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Submit a real completion summary once the raid is ready.
            </p>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="block text-sm text-muted">
                Verification summary
                <textarea
                  className="mt-2 min-h-36 w-full rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-text outline-none"
                  value={raidCompletionInput.verification_summary}
                  onChange={(event) =>
                    setRaidCompletionInput((current) => ({
                      ...current,
                      verification_summary: event.target.value,
                    }))
                  }
                  placeholder="Describe what was done, what changed, and why this raid is genuinely complete."
                />
              </label>

              <label className="block text-sm text-muted">
                Artifact reference
                <input
                  className="mt-2 w-full rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-text outline-none"
                  value={raidCompletionInput.artifact_reference ?? ""}
                  onChange={(event) =>
                    setRaidCompletionInput((current) => ({
                      ...current,
                      artifact_reference: event.target.value,
                    }))
                  }
                  placeholder="Optional URL, doc title, or reference note."
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Ready" value={activeRaid.ready_for_verification ? "Yes" : "No"} />
              <MetricCard
                label="Minimum window"
                value={
                  activeRaid.ready_for_verification
                    ? `${activeRaid.minimum_completion_window_hours}h met`
                    : `${raidReadyRemainingHours}h left`
                }
              />
              <MetricCard label="Rank meaning" value="Soft only" />
            </div>

            {!activeRaid.ready_for_verification ? (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/6 px-4 py-3 text-sm text-amber-100">
                Finish the remaining objectives and let the minimum raid window pass before verification opens.
              </div>
            ) : null}

            <div className="mt-5">
              <button
                type="button"
                className="rounded-2xl bg-rose-300 px-4 py-3 text-sm font-medium text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  void handleCompleteRaid();
                }}
                disabled={submitting || !activeRaid.ready_for_verification}
              >
                {submitting ? "Verifying..." : "Complete Raid"}
              </button>
            </div>
          </article>
        </>
      ) : (
        <StateCard
          eyebrow="Raid"
          title="No active raid"
          body="Start one major arc when you want a heavier, higher-significance push."
          tone="raid"
          action={
            <TemplatePanel
              title="Start a raid"
              description="Only one raid can stay active at a time."
              templates={availableRaidTemplates}
              selectedId={selectedRaidTemplateId}
              onSelect={setSelectedRaidTemplateId}
              onStart={() => {
                void handleStartRaid();
              }}
              disabled={submitting || !selectedRaidTemplateId}
              startLabel={submitting ? "Starting..." : "Start Raid"}
              tone="raid"
              compact
            />
          }
        />
      )}

      {completionState ? (
        <RewardFeedbackCard
          eyebrow="Completion State"
          title={`${completionState.kind === "raid" ? "Raid" : "Dungeon"} complete: ${completionState.title}`}
          subtitle={completionState.message}
          xpAwarded={completionState.xp_awarded}
          newTotalXp={completionState.new_total_xp}
          newLevel={completionState.new_level}
          attributeChanges={completionState.attribute_changes}
          emphasis={completionState.kind === "raid" ? "raid" : "strong"}
        />
      ) : null}

      {selectedDungeonObjective ? (
        <ObjectiveModal
          title={selectedDungeonObjective.title}
          description={selectedDungeonObjective.description}
          current={selectedDungeonObjective.current_count}
          target={selectedDungeonObjective.target_count}
          note={dungeonLogInput.note ?? ""}
          onNoteChange={(value) =>
            setDungeonLogInput((current) => ({
              ...current,
              note: value,
            }))
          }
          onCancel={() => {
            setSelectedDungeonObjective(null);
            setDungeonLogInput(defaultDungeonLogInput);
          }}
          onConfirm={() => {
            void handleLogDungeonObjective(selectedDungeonObjective, dungeonLogInput);
          }}
          confirming={submitting}
          confirmLabel="Log with note"
        />
      ) : null}

      {selectedRaidObjective ? (
        <ObjectiveModal
          title={selectedRaidObjective.title}
          description={selectedRaidObjective.description}
          current={selectedRaidObjective.current_count}
          target={selectedRaidObjective.target_count}
          note={raidLogInput.note ?? ""}
          extra={
            selectedRaidObjective.requires_verification ? (
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-rose-200">
                This objective contributes to final raid verification.
              </p>
            ) : null
          }
          onNoteChange={(value) =>
            setRaidLogInput((current) => ({
              ...current,
              note: value,
            }))
          }
          onCancel={() => {
            setSelectedRaidObjective(null);
            setRaidLogInput(defaultRaidLogInput);
          }}
          onConfirm={() => {
            void handleLogRaidObjective(selectedRaidObjective, raidLogInput);
          }}
          confirming={submitting}
          confirmLabel="Log with note"
          tone="raid"
        />
      ) : null}
    </>
  );
}

function StructuredHero({
  title,
  description,
  badge,
  difficulty,
  reward,
  progressLabel,
  progressRatio,
  tone = "dungeon",
}: {
  title: string;
  description: string;
  badge: string;
  difficulty: string;
  reward: string;
  progressLabel: string;
  progressRatio: number;
  tone?: "dungeon" | "raid";
}) {
  const border = tone === "raid" ? "border-rose-400/22" : "border-accent/22";
  const gradient =
    tone === "raid"
      ? "bg-[linear-gradient(180deg,rgba(244,114,114,0.07),rgba(17,24,34,0.78))]"
      : "bg-[linear-gradient(180deg,rgba(212,168,79,0.07),rgba(17,24,34,0.72))]";

  return (
    <article className={`rounded-3xl ${border} ${gradient} p-5 shadow-panel sm:col-span-2`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={badge} tone={tone === "raid" ? "raid" : "primary"} />
            <Badge label={difficulty} tone="neutral" />
            <Badge label={reward} tone="xp" />
          </div>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
        </div>
        <MetricCard label="Progress" value={progressLabel} />
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-canvas/70">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            tone === "raid" ? "bg-rose-300" : "bg-accent"
          }`}
          style={{ width: `${Math.round(progressRatio * 100)}%` }}
        />
      </div>
    </article>
  );
}

function ObjectivePanel({
  title,
  description,
  objectives,
  onQuickLog,
  onAddNote,
  tone = "dungeon",
}: {
  title: string;
  description: string;
  objectives: Array<DungeonObjectiveResponseData | RaidObjectiveResponseData>;
  onQuickLog: (objective: DungeonObjectiveResponseData | RaidObjectiveResponseData) => void;
  onAddNote: (objective: DungeonObjectiveResponseData | RaidObjectiveResponseData) => void;
  tone?: "dungeon" | "raid";
}) {
  return (
    <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-4 space-y-3">
        {objectives.map((objective) => (
          <div
            key={objective.id}
            className={`rounded-2xl border p-4 ${
              objective.is_completed
                ? "border-emerald-400/25 bg-emerald-500/6"
                : "border-line bg-canvas/50"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-medium text-text">{objective.title}</h4>
                  {"requires_verification" in objective && objective.requires_verification ? (
                    <Badge label="Verification-linked" tone="raid" />
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{objective.description}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                  objective.is_completed
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-accent/15 text-accent"
                }`}
              >
                {objective.is_completed ? "Completed" : "Active"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {objective.current_count}/{objective.target_count} complete
              </p>
              <div className="flex flex-wrap gap-2">
                <QuickProgressButton
                  label={objective.is_completed ? "Closed" : "Log +1"}
                  disabled={objective.is_completed}
                  onClick={() => onQuickLog(objective)}
                  tone={tone === "raid" ? "raid" : "default"}
                />
                {!objective.is_completed ? (
                  <button
                    type="button"
                    className="rounded-2xl border border-line px-4 py-2.5 text-sm text-muted transition hover:text-text"
                    onClick={() => onAddNote(objective)}
                  >
                    Add note
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function TemplatePanel({
  title,
  description,
  templates,
  selectedId,
  onSelect,
  onStart,
  disabled,
  startLabel,
  tone = "dungeon",
  compact = false,
}: {
  title: string;
  description: string;
  templates: Array<{
    id: string;
    title: string;
    description: string;
    difficulty: "low" | "medium" | "high";
    reward_xp_base: number;
    expected_duration_days: number;
  }>;
  selectedId: string;
  onSelect: (id: string) => void;
  onStart: () => void;
  disabled: boolean;
  startLabel: string;
  tone?: "dungeon" | "raid";
  compact?: boolean;
}) {
  const selectedClass =
    tone === "raid" ? "border-rose-300 bg-rose-300/8" : "border-accent bg-accent/10";
  const buttonClass = tone === "raid" ? "bg-rose-300 text-slate-950" : "bg-accent text-canvas";

  return (
    <div className={compact ? "mt-0" : ""}>
      <p className="text-xs uppercase tracking-[0.25em] text-accent">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-5 grid gap-3">
        {templates.map((template) => {
          const selected = selectedId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              className={`rounded-2xl border p-4 text-left transition ${
                selected ? selectedClass : "border-line bg-canvas/45 hover:border-accent/50"
              }`}
              onClick={() => onSelect(template.id)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={template.difficulty} tone="neutral" />
                <Badge label={`${template.reward_xp_base} XP`} tone="xp" />
                <Badge label={`${template.expected_duration_days} days`} tone="secondary" />
              </div>
              <h4 className="mt-3 text-lg font-semibold text-text">{template.title}</h4>
              <p className="mt-2 text-sm leading-6 text-muted">{template.description}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-5">
        <button
          type="button"
          className={`rounded-2xl px-4 py-3 text-sm font-medium transition hover:opacity-90 ${buttonClass}`}
          onClick={onStart}
          disabled={disabled}
        >
          {startLabel}
        </button>
      </div>
    </div>
  );
}

function ObjectiveModal({
  title,
  description,
  current,
  target,
  note,
  onNoteChange,
  onCancel,
  onConfirm,
  confirming,
  confirmLabel,
  extra = null,
  tone = "dungeon",
}: {
  title: string;
  description: string;
  current: number;
  target: number;
  note: string;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirming: boolean;
  confirmLabel: string;
  extra?: ReactNode;
  tone?: "dungeon" | "raid";
}) {
  const buttonClass = tone === "raid" ? "bg-rose-300 text-slate-950" : "bg-accent text-canvas";
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-line bg-panel p-6 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Objective Note</p>
        <h3 className="mt-3 text-2xl font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <p className="mt-4 text-sm text-muted">
          {current}/{target} complete
        </p>
        {extra}
        <label className="mt-4 block text-sm text-muted">
          Note
          <textarea
            className="mt-2 min-h-28 w-full rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-text outline-none"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Optional context for this step."
          />
        </label>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-2xl border border-line px-4 py-3 text-sm text-muted transition hover:text-text"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`rounded-2xl px-4 py-3 text-sm font-medium transition hover:opacity-90 ${buttonClass}`}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Recording..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "secondary" | "neutral" | "xp" | "raid";
}) {
  const toneClass =
    tone === "primary"
      ? "border-accent/28 bg-accent/10 text-accent"
      : tone === "secondary"
        ? "border-sky-400/25 bg-sky-400/10 text-sky-200"
        : tone === "xp"
          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
          : tone === "raid"
            ? "border-rose-400/25 bg-rose-400/10 text-rose-200"
            : "border-line bg-canvas/55 text-muted";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${toneClass}`}>
      {label}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas/45 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className="mt-2 text-base font-medium text-text">{value}</p>
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
