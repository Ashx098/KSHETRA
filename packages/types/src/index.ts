export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: Record<string, unknown>;
}

export interface HealthResponseData {
  service: "api";
  status: "ok";
  database: "up";
  timestamp: string;
}

export type AppSection = "home" | "missions" | "progress" | "profile";

export const ATTRIBUTE_CODES = [
  "strength",
  "wisdom",
  "focus",
  "mastery",
  "wealth",
  "bond",
] as const;

export const GOAL_TYPES = [
  "fitness",
  "learning",
  "career",
  "relationship",
  "spiritual",
  "project",
] as const;

export const RANKS = ["E", "D", "C", "B", "A", "S"] as const;
export const STREAK_STATUSES = ["inactive", "active", "broken"] as const;
export const QUEST_TYPES = ["daily", "weekly", "event"] as const;
export const QUEST_STATUSES = [
  "active",
  "completed",
  "expired",
  "cancelled",
] as const;
export const QUEST_ASSIGNMENTS = ["mandatory", "optional", "stretch"] as const;
export const QUEST_LOG_INTENSITIES = ["low", "medium", "high"] as const;
export const EVENT_TYPES = ["mystery", "recovery"] as const;
export const EVENT_STATUSES = ["active", "completed", "expired", "cancelled"] as const;
export const DUNGEON_STATUSES = ["active", "completed", "expired", "cancelled"] as const;
export const RAID_STATUSES = ["active", "verification_pending", "completed", "cancelled"] as const;
export const NOTIFICATION_TYPES = ["daily_ready", "streak_risk", "event_available"] as const;
export const NOTIFICATION_STATUSES = ["pending", "shown", "dismissed", "expired"] as const;
export const GUIDE_SCREENS = ["home", "missions", "progress", "profile"] as const;
export const GUIDE_MESSAGE_TYPES = ["nudge", "milestone", "warning", "explain"] as const;
export const GUIDE_MESSAGE_STATUSES = ["active", "shown", "dismissed", "expired"] as const;
export const GUIDE_STATE_VARIANTS = ["calm", "bold", "battle"] as const;

export type AttributeCode = (typeof ATTRIBUTE_CODES)[number];
export type GoalType = (typeof GOAL_TYPES)[number];
export type Rank = (typeof RANKS)[number];
export type StreakStatus = (typeof STREAK_STATUSES)[number];
export type QuestType = (typeof QUEST_TYPES)[number];
export type QuestStatus = (typeof QUEST_STATUSES)[number];
export type QuestAssignment = (typeof QUEST_ASSIGNMENTS)[number];
export type QuestLogIntensity = (typeof QUEST_LOG_INTENSITIES)[number];
export type EventType = (typeof EVENT_TYPES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];
export type DungeonStatus = (typeof DUNGEON_STATUSES)[number];
export type RaidStatus = (typeof RAID_STATUSES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
export type GuideScreen = (typeof GUIDE_SCREENS)[number];
export type GuideMessageType = (typeof GUIDE_MESSAGE_TYPES)[number];
export type GuideMessageStatus = (typeof GUIDE_MESSAGE_STATUSES)[number];
export type GuideStateVariant = (typeof GUIDE_STATE_VARIANTS)[number];

export interface GuideCardData {
  screen: GuideScreen;
  companion_name: string;
  state_variant: GuideStateVariant;
  title: string;
  body: string;
  primary_cta_label: string | null;
  quick_chips: string[];
}

export interface GuideMessageData {
  id: string;
  screen: GuideScreen;
  message_type: GuideMessageType;
  state_variant: GuideStateVariant;
  title: string;
  body: string;
  status: GuideMessageStatus;
}

export interface GuideAskInput {
  screen: GuideScreen;
  question: string;
  topic?: string;
}

export interface GuideAskResponseData {
  title: string;
  body: string;
  bullets: string[];
  state_variant: GuideStateVariant;
}

export interface GuidePreferencesResponseData {
  enabled: boolean;
  reactive_popups_enabled: boolean;
  screen_nudges_enabled: boolean;
  tone_mode: "energetic_anime";
}

export interface GuidePreferencesUpdateInput {
  enabled?: boolean;
  reactive_popups_enabled?: boolean;
  screen_nudges_enabled?: boolean;
  tone_mode?: "energetic_anime";
}

export interface GuideMessageDismissResponseData {
  message_id: string;
  status: GuideMessageStatus;
}

export interface MeResponseData {
  id: string;
  email: string;
  username: string;
  display_name: string;
  current_rank: Rank;
  current_level: number;
  total_xp: number;
  fatigue_score: number;
  timezone: string;
  motivation_mode: string | null;
  onboarding_complete: boolean;
  guide_card?: GuideCardData;
  guide_message?: GuideMessageData | null;
}

export interface ProfileUpdateInput {
  display_name?: string;
  timezone?: string;
  motivation_mode?: string | null;
}

export interface GoalPayload {
  goal_type: GoalType;
  title: string;
  description?: string;
  priority_weight?: number;
}

export interface GoalResponseData {
  id: string;
  user_id: string;
  goal_type: GoalType;
  title: string;
  description: string | null;
  priority_weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttributeResponseData {
  code: AttributeCode;
  display_name: string;
  description: string;
  value: number;
  cap: number;
  growth_rate: number;
  last_updated_at: string;
}

export interface StreakResponseData {
  current_streak_days: number;
  longest_streak_days: number;
  last_valid_day: string | null;
  streak_status: StreakStatus;
}

export interface ProgressionSummaryData {
  rank: Rank;
  rank_context_label: string;
  rank_context_subtitle: string;
  level: number;
  total_xp: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_valid_day: string | null;
  streak_status: StreakStatus;
  next_streak_milestone_days: number | null;
  next_streak_milestone_bonus_xp: number | null;
  rank_progress: {
    current_rank: Rank;
    next_rank: Rank | null;
    next_rank_xp_threshold: number | null;
    xp_remaining: number;
    xp_remaining_to_next_rank: number;
    raids_remaining: number;
    streak_requirement_remaining: number;
  };
}

export interface OnboardingInput {
  email: string;
  username: string;
  display_name: string;
  timezone: string;
  goals: GoalPayload[];
}

export interface OnboardingResponseData {
  user_id: string;
  profile: MeResponseData;
  goals: GoalResponseData[];
  attributes: AttributeResponseData[];
  streak: StreakResponseData;
}

export interface QuestAttributeChange {
  code: AttributeCode;
  delta: number;
}

export interface QuestResponseData {
  id: string;
  template_id: string | null;
  quest_type: QuestType;
  title: string;
  description: string;
  difficulty: "low" | "medium" | "high";
  status: QuestStatus;
  is_mandatory: boolean;
  is_stretch: boolean;
  reward_xp_base: number;
  assigned_date: string;
  due_at: string | null;
  completed_at: string | null;
  generated_by: "system" | "ai" | "template";
}

export interface DailyQuestBundleData {
  generated_for_date: string;
  next_reset_at: string;
  mandatory: QuestResponseData[];
  optional: QuestResponseData[];
  stretch: QuestResponseData | null;
}

export interface ActiveEventResponseData {
  id: string;
  template_id: string | null;
  event_type: EventType;
  status: EventStatus;
  title: string;
  description: string;
  difficulty: "low" | "medium" | "high";
  reward_xp_base: number;
  triggered_at: string;
  available_from: string;
  expires_at: string;
  completed_at: string | null;
  generated_by: "system";
  trigger_reason: string | null;
  next_reset_at: string;
}

export interface ActiveEventPayloadData {
  active_event: ActiveEventResponseData | null;
}

export interface EventCompletionInput {
  note?: string;
}

export interface EventCompletionResponseData {
  event_id: string;
  xp_awarded: number;
  attribute_changes: QuestAttributeChange[];
  new_total_xp: number;
  new_level: number;
  event_status: EventStatus;
}

export interface EventDismissResponseData {
  event_id: string;
  event_status: EventStatus;
}

export interface HomePayloadData {
  progression: ProgressionSummaryData;
  quests: DailyQuestBundleData;
  attributes: AttributeResponseData[];
  active_event: ActiveEventResponseData | null;
  top_notification: NotificationResponseData | null;
  notification_count: number;
  guide_card: GuideCardData;
  guide_message: GuideMessageData | null;
}

export interface NotificationResponseData {
  id: string;
  notification_type: NotificationType;
  status: NotificationStatus;
  title: string;
  body: string;
  scheduled_for: string;
  delivered_at: string | null;
  dismissed_at: string | null;
}

export interface NotificationPreferencesResponseData {
  daily_ready_enabled: boolean;
  streak_risk_enabled: boolean;
  event_alerts_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export interface NotificationPreferencesUpdateInput {
  daily_ready_enabled?: boolean;
  streak_risk_enabled?: boolean;
  event_alerts_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

export interface NotificationsInboxData {
  notifications: NotificationResponseData[];
  unread_count: number;
}

export interface NotificationDismissResponseData {
  notification_id: string;
  status: NotificationStatus;
}

export interface DungeonObjectiveResponseData {
  id: string;
  objective_code: string;
  title: string;
  description: string;
  target_count: number;
  current_count: number;
  remaining_count: number;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

export interface DungeonResponseData {
  id: string;
  template_id: string | null;
  status: DungeonStatus;
  title: string;
  description: string;
  difficulty: "low" | "medium" | "high";
  reward_xp_base: number;
  started_at: string;
  expires_at: string | null;
  completed_at: string | null;
  generated_by: "system";
  expected_duration_days: number | null;
  progress: {
    completed_objectives: number;
    total_objectives: number;
    completion_ratio: number;
  };
  objectives: DungeonObjectiveResponseData[];
}

export interface ActiveDungeonPayloadData {
  active_dungeon: DungeonResponseData | null;
  available_templates: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    difficulty: "low" | "medium" | "high";
    reward_xp_base: number;
    expected_duration_days: number;
  }>;
}

export interface StartDungeonInput {
  template_id: string;
}

export interface DungeonLogInput {
  delta_progress?: number;
  note?: string;
}

export interface DungeonCompletionRewardData {
  xp_awarded: number;
  attribute_changes: QuestAttributeChange[];
  new_total_xp: number;
  new_level: number;
  dungeon_status: DungeonStatus;
}

export interface DungeonLogResponseData {
  dungeon: DungeonResponseData;
  objective: DungeonObjectiveResponseData;
  dungeon_completed: boolean;
  reward: DungeonCompletionRewardData | null;
}

export interface RaidObjectiveResponseData {
  id: string;
  objective_code: string;
  title: string;
  description: string;
  target_count: number;
  current_count: number;
  remaining_count: number;
  is_completed: boolean;
  completed_at: string | null;
  requires_verification: boolean;
  sort_order: number;
}

export interface RaidResponseData {
  id: string;
  template_id: string | null;
  status: RaidStatus;
  title: string;
  description: string;
  difficulty: "low" | "medium" | "high";
  reward_xp_base: number;
  started_at: string;
  completed_at: string | null;
  generated_by: "system";
  expected_duration_days: number | null;
  verification_summary: string | null;
  artifact_reference: string | null;
  ready_for_verification: boolean;
  minimum_completion_window_hours: number;
  progress: {
    completed_objectives: number;
    total_objectives: number;
    completion_ratio: number;
  };
  objectives: RaidObjectiveResponseData[];
}

export interface ActiveRaidPayloadData {
  active_raid: RaidResponseData | null;
  available_templates: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    difficulty: "low" | "medium" | "high";
    reward_xp_base: number;
    expected_duration_days: number;
  }>;
}

export interface MissionsPayloadData {
  active_dungeon: DungeonResponseData | null;
  available_dungeon_templates: ActiveDungeonPayloadData["available_templates"];
  active_raid: RaidResponseData | null;
  available_raid_templates: ActiveRaidPayloadData["available_templates"];
  guide_card: GuideCardData;
  guide_message: GuideMessageData | null;
}

export interface StartRaidInput {
  template_id: string;
}

export interface RaidLogInput {
  delta_progress?: number;
  note?: string;
}

export interface RaidCompletionInput {
  verification_summary: string;
  artifact_reference?: string;
}

export interface RaidCompletionRewardData {
  xp_awarded: number;
  attribute_changes: QuestAttributeChange[];
  new_total_xp: number;
  new_level: number;
  raid_status: RaidStatus;
  completion_message: string;
}

export interface RaidLogResponseData {
  raid: RaidResponseData;
  objective: RaidObjectiveResponseData;
}

export interface QuestCompletionInput {
  intensity?: QuestLogIntensity;
  note?: string;
}

export interface QuestCompletionResponseData {
  quest_id: string;
  xp_awarded: number;
  attribute_changes: QuestAttributeChange[];
  new_total_xp: number;
  new_level: number;
  quest_status: QuestStatus;
  streak_bonus_xp?: number;
  current_streak_days?: number;
  day_became_valid?: boolean;
  rank_up: boolean;
}

export interface XpTimelineEntry {
  id: string;
  source:
    | "quest_completion"
    | "event_completion"
    | "dungeon_completion"
    | "raid_completion"
    | "streak_milestone_bonus";
  delta_xp: number;
  created_at: string;
  quest_id: string | null;
  event_id: string | null;
  dungeon_id: string | null;
}

export interface XpTimelineDay {
  date: string;
  total_xp_gained: number;
  entries: XpTimelineEntry[];
}

export interface AttributeTimelineChange {
  id: string;
  code: AttributeCode;
  delta: number;
  created_at: string;
  quest_id: string | null;
  event_id: string | null;
  dungeon_id: string | null;
}

export interface AttributeTimelineDay {
  date: string;
  changes: AttributeTimelineChange[];
}

export interface ValidDayHistoryItem {
  date: string;
  is_valid: boolean;
  meaningful_completion_count: number;
  total_xp: number;
  low_difficulty_xp: number;
  current_streak_after: number | null;
}

export interface StreakMilestoneHistoryItem {
  date: string;
  streak_days: number;
  bonus_xp: number;
  ledger_id: string;
}

export interface ProgressionHistoryData {
  range: "7d" | "30d" | "90d" | "1y";
  insights: {
    recent_xp_trend: "rising" | "flat" | "falling";
    most_improved_attribute: {
      code: AttributeCode | null;
      delta: number;
    };
    current_focus_signal: string;
  };
  xp_timeline: XpTimelineDay[];
  attribute_timeline: AttributeTimelineDay[];
  valid_days: ValidDayHistoryItem[];
  milestones: StreakMilestoneHistoryItem[];
  guide_card?: GuideCardData;
  guide_message?: GuideMessageData | null;
}
