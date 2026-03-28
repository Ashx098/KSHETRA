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

export type AttributeCode = (typeof ATTRIBUTE_CODES)[number];
export type GoalType = (typeof GOAL_TYPES)[number];
export type Rank = (typeof RANKS)[number];
export type StreakStatus = (typeof STREAK_STATUSES)[number];
export type QuestType = (typeof QUEST_TYPES)[number];
export type QuestStatus = (typeof QUEST_STATUSES)[number];
export type QuestAssignment = (typeof QUEST_ASSIGNMENTS)[number];
export type QuestLogIntensity = (typeof QUEST_LOG_INTENSITIES)[number];

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
  mandatory: QuestResponseData[];
  optional: QuestResponseData[];
  stretch: QuestResponseData | null;
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
  source: "quest_completion" | "streak_milestone_bonus";
  delta_xp: number;
  created_at: string;
  quest_id: string | null;
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
  xp_timeline: XpTimelineDay[];
  attribute_timeline: AttributeTimelineDay[];
  valid_days: ValidDayHistoryItem[];
  milestones: StreakMilestoneHistoryItem[];
}
