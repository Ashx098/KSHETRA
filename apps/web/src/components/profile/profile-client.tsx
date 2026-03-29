"use client";

import {
  type AttributeResponseData,
  type GuidePreferencesResponseData,
  type GuidePreferencesUpdateInput,
  GOAL_TYPES,
  type GoalPayload,
  type GoalResponseData,
  type MeResponseData,
  type NotificationPreferencesResponseData,
  type NotificationPreferencesUpdateInput,
  type OnboardingInput,
  type OnboardingResponseData,
} from "@kshetra/types";
import { startTransition, useEffect, useState } from "react";

import { apiRequest } from "../../lib/api-client";
import { GuideDockCard } from "../guide/guide-card";
import { getStoredUserId, setStoredUserId } from "../../lib/session";

const defaultGoal = (): GoalPayload => ({
  goal_type: "fitness",
  title: "",
  description: "",
  priority_weight: 1,
});

export function ProfileClient() {
  const [userId, setUserIdState] = useState<string | null>(null);
  const [profile, setProfile] = useState<MeResponseData | null>(null);
  const [goals, setGoals] = useState<GoalResponseData[]>([]);
  const [attributes, setAttributes] = useState<AttributeResponseData[]>([]);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferencesResponseData | null>(null);
  const [guidePreferences, setGuidePreferences] = useState<GuidePreferencesResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    display_name: "",
    timezone: "Asia/Kolkata",
    motivation_mode: "",
  });
  const [goalDrafts, setGoalDrafts] = useState<Record<string, GoalPayload>>({});
  const [newGoal, setNewGoal] = useState<GoalPayload>(defaultGoal());
  const [onboardingForm, setOnboardingForm] = useState<OnboardingInput>({
    email: "",
    username: "",
    display_name: "",
    timezone: "Asia/Kolkata",
    goals: [defaultGoal()],
  });

  useEffect(() => {
    const storedUserId = getStoredUserId();
    setUserIdState(storedUserId);

    if (!storedUserId) {
      setLoading(false);
      return;
    }

    void loadUserState(storedUserId);
  }, []);

  async function loadUserState(activeUserId: string): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const [me, goalList, attributeList, preferences, guidePrefs] = await Promise.all([
        apiRequest<MeResponseData>("/me", { userId: activeUserId }),
        apiRequest<GoalResponseData[]>("/goals", { userId: activeUserId }),
        apiRequest<AttributeResponseData[]>("/attributes", { userId: activeUserId }),
        apiRequest<NotificationPreferencesResponseData>("/notification-preferences", {
          userId: activeUserId,
        }),
        apiRequest<GuidePreferencesResponseData>("/guide/preferences", {
          userId: activeUserId,
        }),
      ]);

      setProfile(me);
      setGoals(goalList);
      setAttributes(attributeList);
      setNotificationPreferences(preferences);
      setGuidePreferences(guidePrefs);
      setProfileForm({
        display_name: me.display_name,
        timezone: me.timezone,
        motivation_mode: me.motivation_mode ?? "",
      });
      setGoalDrafts(
        Object.fromEntries(
          goalList.map((goal) => [
            goal.id,
            {
              goal_type: goal.goal_type,
              title: goal.title,
              description: goal.description ?? "",
              priority_weight: goal.priority_weight,
            },
          ]),
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load profile state.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleOnboardingSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = await apiRequest<OnboardingResponseData>("/onboarding", {
        method: "POST",
        body: {
          ...onboardingForm,
          display_name: onboardingForm.display_name.trim() || onboardingForm.username.trim(),
        },
      });

      setStoredUserId(payload.user_id);
      setUserIdState(payload.user_id);
      setProfile(payload.profile);
      setGoals(payload.goals);
      setAttributes(payload.attributes);
      setProfileForm({
        display_name: payload.profile.display_name,
        timezone: payload.profile.timezone,
        motivation_mode: payload.profile.motivation_mode ?? "",
      });
      setNotificationPreferences({
        daily_ready_enabled: true,
        streak_risk_enabled: true,
        event_alerts_enabled: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
      });
      setGuidePreferences({
        enabled: true,
        reactive_popups_enabled: true,
        screen_nudges_enabled: true,
        tone_mode: "energetic_anime",
      });
      setGoalDrafts(
        Object.fromEntries(
          payload.goals.map((goal) => [
            goal.id,
            {
              goal_type: goal.goal_type,
              title: goal.title,
              description: goal.description ?? "",
              priority_weight: goal.priority_weight,
            },
          ]),
        ),
      );
      setNewGoal(defaultGoal());
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to complete onboarding.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileSave(): Promise<void> {
    if (!userId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedProfile = await apiRequest<MeResponseData>("/me/profile", {
        method: "PATCH",
        userId,
        body: profileForm,
      });

      setProfile(updatedProfile);
      setProfileForm({
        display_name: updatedProfile.display_name,
        timezone: updatedProfile.timezone,
        motivation_mode: updatedProfile.motivation_mode ?? "",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to update profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleGoalCreate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!userId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const createdGoal = await apiRequest<GoalResponseData>("/goals", {
        method: "POST",
        userId,
        body: newGoal,
      });

      startTransition(() => {
        setGoals((current) => [createdGoal, ...current]);
        setGoalDrafts((current) => ({
          ...current,
          [createdGoal.id]: {
            goal_type: createdGoal.goal_type,
            title: createdGoal.title,
            description: createdGoal.description ?? "",
            priority_weight: createdGoal.priority_weight,
          },
        }));
        setNewGoal(defaultGoal());
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to create goal.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleGoalSave(goalId: string): Promise<void> {
    if (!userId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedGoal = await apiRequest<GoalResponseData>(`/goals/${goalId}`, {
        method: "PATCH",
        userId,
        body: goalDrafts[goalId],
      });

      startTransition(() => {
        setGoals((current) =>
          current.map((goal) => (goal.id === goalId ? updatedGoal : goal)),
        );
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to update goal.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleGoalDeactivate(goalId: string): Promise<void> {
    if (!userId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedGoal = await apiRequest<GoalResponseData>(`/goals/${goalId}`, {
        method: "DELETE",
        userId,
      });

      startTransition(() => {
        setGoals((current) =>
          current.map((goal) => (goal.id === goalId ? updatedGoal : goal)),
        );
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to deactivate goal.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleNotificationPreferencesSave(): Promise<void> {
    if (!userId || !notificationPreferences) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await apiRequest<NotificationPreferencesResponseData>(
        "/notification-preferences",
        {
          method: "PATCH",
          userId,
          body: notificationPreferences as NotificationPreferencesUpdateInput,
        },
      );

      setNotificationPreferences(updated);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update notification preferences.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleGuidePreferencesSave(): Promise<void> {
    if (!userId || !guidePreferences) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await apiRequest<GuidePreferencesResponseData>("/guide/preferences", {
        method: "PATCH",
        userId,
        body: guidePreferences as GuidePreferencesUpdateInput,
      });

      setGuidePreferences(updated);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to update guide preferences.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <p className="text-sm text-muted">Loading profile state...</p>
      </section>
    );
  }

  if (!userId || !profile) {
    return (
      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Onboarding</p>
        <h3 className="mt-3 text-xl font-semibold">Create your initial KSHETRA state</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Set up identity, goals, and starting state. Quests begin after onboarding.
        </p>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <form className="mt-6 grid gap-4" onSubmit={(event) => void handleOnboardingSubmit(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span>Email</span>
              <input
                className="rounded-2xl border border-line bg-canvas/60 px-4 py-3"
                value={onboardingForm.email}
                onChange={(event) =>
                  setOnboardingForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Username</span>
              <input
                className="rounded-2xl border border-line bg-canvas/60 px-4 py-3"
                value={onboardingForm.username}
                onChange={(event) =>
                  setOnboardingForm((current) => ({ ...current, username: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Timezone</span>
              <input
                className="rounded-2xl border border-line bg-canvas/60 px-4 py-3"
                value={onboardingForm.timezone}
                onChange={(event) =>
                  setOnboardingForm((current) => ({ ...current, timezone: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="grid gap-4">
            <p className="text-sm font-medium">Initial goals</p>
            {onboardingForm.goals.map((goal, index) => (
              <div
                key={`goal-${index}`}
                className="grid gap-3 rounded-2xl border border-line bg-canvas/30 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <select
                    className="rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm"
                    value={goal.goal_type}
                    onChange={(event) =>
                      setOnboardingForm((current) => ({
                        ...current,
                        goals: current.goals.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, goal_type: event.target.value as GoalPayload["goal_type"] }
                            : entry,
                        ),
                      }))
                    }
                  >
                    {GOAL_TYPES.map((goalType) => (
                      <option key={goalType} value={goalType}>
                        {goalType}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm sm:col-span-2"
                    placeholder="Goal title"
                    value={goal.title}
                    onChange={(event) =>
                      setOnboardingForm((current) => ({
                        ...current,
                        goals: current.goals.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, title: event.target.value } : entry,
                        ),
                      }))
                    }
                  />
                </div>
                <textarea
                  className="min-h-24 rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm"
                  placeholder="Goal description"
                  value={goal.description ?? ""}
                  onChange={(event) =>
                    setOnboardingForm((current) => ({
                      ...current,
                      goals: current.goals.map((entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, description: event.target.value }
                          : entry,
                      ),
                    }))
                  }
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-2xl border border-line px-4 py-3 text-sm text-muted"
                type="button"
                onClick={() =>
                  setOnboardingForm((current) => ({
                    ...current,
                    goals: [...current.goals, defaultGoal()],
                  }))
                }
              >
                Add goal
              </button>
              <button
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-canvas"
                disabled={saving}
                type="submit"
              >
                {saving ? "Creating..." : "Complete onboarding"}
              </button>
            </div>
          </div>
        </form>
      </section>
    );
  }

  return (
    <>
      <GuideDockCard
        userId={userId}
        screen="profile"
        card={profile.guide_card}
        message={profile.guide_message}
        onMessageDismissed={() =>
          setProfile((current) => (current ? { ...current, guide_message: null } : current))
        }
      />

      <section className="rounded-3xl border border-accent/22 bg-panel/70 p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Identity</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight">
          {profile.display_name || profile.username}
        </h3>
        <div className="mt-4 grid gap-3 text-sm text-muted">
          <p>{profile.email}</p>
          <p>@{profile.username}</p>
          <p>Rank {profile.current_rank} · Level {profile.current_level}</p>
          <p>{profile.total_xp} XP</p>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">System Status</p>
        <div className="mt-3 grid gap-3 text-sm text-muted">
          <p>Onboarding complete: {profile.onboarding_complete ? "yes" : "no"}</p>
          <p>Timezone: {profile.timezone}</p>
          <p>Quest loop identity is tied to @{profile.username}</p>
        </div>
      </section>

      {notificationPreferences ? (
        <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-accent">
                Notification Preferences
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                Keep alerts useful, not noisy
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                In-app alerts only. Quiet hours are stored now, but not enforced yet.
              </p>
            </div>
            <button
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-canvas"
              disabled={saving}
              type="button"
              onClick={() => void handleNotificationPreferencesSave()}
            >
              Save alerts
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ToggleRow
              label="Daily ready"
              value={notificationPreferences.daily_ready_enabled}
              onChange={(checked) =>
                setNotificationPreferences((current) =>
                  current ? { ...current, daily_ready_enabled: checked } : current,
                )
              }
            />
            <ToggleRow
              label="Streak risk"
              value={notificationPreferences.streak_risk_enabled}
              onChange={(checked) =>
                setNotificationPreferences((current) =>
                  current ? { ...current, streak_risk_enabled: checked } : current,
                )
              }
            />
            <ToggleRow
              label="Event alerts"
              value={notificationPreferences.event_alerts_enabled}
              onChange={(checked) =>
                setNotificationPreferences((current) =>
                  current ? { ...current, event_alerts_enabled: checked } : current,
                )
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span>Quiet start</span>
                <input
                  className="rounded-2xl border border-line bg-canvas/60 px-4 py-3"
                  placeholder="22:00"
                  value={notificationPreferences.quiet_hours_start ?? ""}
                  onChange={(event) =>
                    setNotificationPreferences((current) =>
                      current ? { ...current, quiet_hours_start: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Quiet end</span>
                <input
                  className="rounded-2xl border border-line bg-canvas/60 px-4 py-3"
                  placeholder="07:00"
                  value={notificationPreferences.quiet_hours_end ?? ""}
                  onChange={(event) =>
                    setNotificationPreferences((current) =>
                      current ? { ...current, quiet_hours_end: event.target.value } : current,
                    )
                  }
                />
              </label>
            </div>
          </div>
        </section>
      ) : null}

      {guidePreferences ? (
        <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-accent">Guide Preferences</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">Companion behavior</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Keep Kael helpful, sharp, and bounded to real system state.
              </p>
            </div>
            <button
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-canvas"
              disabled={saving}
              type="button"
              onClick={() => void handleGuidePreferencesSave()}
            >
              Save guide
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ToggleRow
              label="Guide enabled"
              value={guidePreferences.enabled}
              onChange={(checked) =>
                setGuidePreferences((current) =>
                  current ? { ...current, enabled: checked } : current,
                )
              }
            />
            <ToggleRow
              label="Reactive popups"
              value={guidePreferences.reactive_popups_enabled}
              onChange={(checked) =>
                setGuidePreferences((current) =>
                  current ? { ...current, reactive_popups_enabled: checked } : current,
                )
              }
            />
            <ToggleRow
              label="Screen nudges"
              value={guidePreferences.screen_nudges_enabled}
              onChange={(checked) =>
                setGuidePreferences((current) =>
                  current ? { ...current, screen_nudges_enabled: checked } : current,
                )
              }
            />
            <div className="rounded-2xl border border-line bg-canvas/40 px-4 py-4 text-sm text-muted">
              <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Tone mode</p>
              <p className="mt-3 text-base font-medium text-text">
                {guidePreferences.tone_mode.replace("_", " ")}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Profile Editor</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">
              Core settings
            </h3>
          </div>
          <button
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-canvas"
            disabled={saving}
            type="button"
            onClick={() => void handleProfileSave()}
          >
            Save profile
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_260px]">
          <label className="grid gap-2 text-sm">
            <span>Timezone</span>
            <input
              className="rounded-2xl border border-line bg-canvas/60 px-4 py-3"
              value={profileForm.timezone}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, timezone: event.target.value }))
              }
            />
          </label>
          <div className="rounded-2xl border border-line bg-canvas/40 px-4 py-4 text-sm text-muted">
            <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Current Identity</p>
            <p className="mt-3 text-base font-medium text-text">
              {profile.display_name || profile.username}
            </p>
            <p className="mt-1">@{profile.username}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Goals</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">
              Goal context
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Keep goals current so planning surfaces have clean context.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          {goals.map((goal) => (
            <article
              key={goal.id}
              className="grid gap-3 rounded-2xl border border-line bg-canvas/30 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full border border-line bg-canvas/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted">
                  {goal.goal_type}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                    goal.is_active
                      ? "bg-emerald-500/12 text-emerald-300"
                      : "bg-canvas/80 text-muted"
                  }`}
                >
                  {goal.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <select
                  className="rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm"
                  value={goalDrafts[goal.id]?.goal_type ?? goal.goal_type}
                  onChange={(event) =>
                    setGoalDrafts((current) => ({
                      ...current,
                      [goal.id]: {
                        ...(current[goal.id] ?? defaultGoal()),
                        goal_type: event.target.value as GoalPayload["goal_type"],
                      },
                    }))
                  }
                >
                  {GOAL_TYPES.map((goalType) => (
                    <option key={goalType} value={goalType}>
                      {goalType}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm sm:col-span-2"
                  value={goalDrafts[goal.id]?.title ?? goal.title}
                  onChange={(event) =>
                    setGoalDrafts((current) => ({
                      ...current,
                      [goal.id]: {
                        ...(current[goal.id] ?? defaultGoal()),
                        title: event.target.value,
                      },
                    }))
                  }
                />
                <input
                  className="rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={goalDrafts[goal.id]?.priority_weight ?? goal.priority_weight}
                  onChange={(event) =>
                    setGoalDrafts((current) => ({
                      ...current,
                      [goal.id]: {
                        ...(current[goal.id] ?? defaultGoal()),
                        priority_weight: Number(event.target.value),
                      },
                    }))
                  }
                />
              </div>
              <textarea
                className="min-h-24 rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm"
                value={goalDrafts[goal.id]?.description ?? goal.description ?? ""}
                onChange={(event) =>
                  setGoalDrafts((current) => ({
                    ...current,
                    [goal.id]: {
                      ...(current[goal.id] ?? defaultGoal()),
                      description: event.target.value,
                    },
                  }))
                }
              />
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                <span>Priority {goal.priority_weight}</span>
                <button
                  className="rounded-2xl bg-accent px-4 py-3 font-medium text-canvas"
                  type="button"
                  onClick={() => void handleGoalSave(goal.id)}
                >
                  Save
                </button>
                <button
                  className="rounded-2xl border border-line px-4 py-3"
                  type="button"
                  onClick={() => void handleGoalDeactivate(goal.id)}
                >
                  Disable
                </button>
              </div>
            </article>
          ))}

          <form
            className="grid gap-3 rounded-2xl border border-line bg-canvas/30 p-4"
            onSubmit={(event) => void handleGoalCreate(event)}
          >
            <p className="text-sm font-medium">Add goal</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <select
                className="rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm"
                value={newGoal.goal_type}
                onChange={(event) =>
                  setNewGoal((current) => ({
                    ...current,
                    goal_type: event.target.value as GoalPayload["goal_type"],
                  }))
                }
              >
                {GOAL_TYPES.map((goalType) => (
                  <option key={goalType} value={goalType}>
                    {goalType}
                  </option>
                ))}
              </select>
              <input
                className="rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm sm:col-span-2"
                placeholder="Goal title"
                value={newGoal.title}
                onChange={(event) =>
                  setNewGoal((current) => ({ ...current, title: event.target.value }))
                }
              />
              <input
                className="rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm"
                type="number"
                step="0.1"
                min="0.1"
                value={newGoal.priority_weight ?? 1}
                onChange={(event) =>
                  setNewGoal((current) => ({
                    ...current,
                    priority_weight: Number(event.target.value),
                  }))
                }
              />
            </div>
            <textarea
              className="min-h-24 rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm"
              placeholder="Goal description"
              value={newGoal.description ?? ""}
              onChange={(event) =>
                setNewGoal((current) => ({ ...current, description: event.target.value }))
              }
            />
            <button
              className="w-fit rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-canvas"
              disabled={saving}
              type="submit"
            >
              Add goal
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel sm:col-span-2">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Attributes</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight">Current attribute base</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {attributes.map((attribute) => (
            <article
              key={attribute.code}
              className="rounded-2xl border border-line bg-canvas/30 p-4"
            >
              <p className="text-sm font-medium">{attribute.display_name}</p>
              <p className="mt-2 text-sm text-muted">{attribute.description}</p>
              <dl className="mt-4 grid gap-2 text-sm text-muted">
                <div className="flex justify-between gap-3">
                  <dt>Value</dt>
                  <dd>{attribute.value}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Cap</dt>
                  <dd>{attribute.cap}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Growth Rate</dt>
                  <dd>{attribute.growth_rate}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-between rounded-2xl border border-line bg-canvas/40 px-4 py-4 text-left"
      onClick={() => onChange(!value)}
    >
      <span className="text-sm text-text">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
          value ? "bg-emerald-500/12 text-emerald-300" : "bg-canvas/80 text-muted"
        }`}
      >
        {value ? "On" : "Off"}
      </span>
    </button>
  );
}
