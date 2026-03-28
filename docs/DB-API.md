# KSHETRA — Database Schema and API Specification (v1)

## 1. Purpose

This document defines the persistent data model and service interface for Kshetra.

It covers:

* relational database schema
* entity relationships
* core API routes
* validation boundaries
* backend responsibilities

This document assumes:

* deterministic progression logic exists outside the database
* AI planning is a separate service layer
* the database is the source of truth for user state, logs, quests, and progression history

---

## 2. Architectural Principles

### 2.1 Source of truth

The database is the canonical source for:

* user identity
* current progression state
* quest lifecycle
* action logs
* streak state
* rank transitions
* dungeon / raid state
* AI-generated plans after validation

### 2.2 Separation of concerns

* **DB** stores facts and state
* **Rules engine** computes XP, attributes, thresholds, debuffs, promotions
* **AI layer** proposes quests/events/summaries
* **API layer** validates requests and orchestrates services

### 2.3 Event-oriented history

Do not rely only on “current totals.”
Every meaningful state transition should be traceable through logs.

---

## 3. Recommended Tech Choices

### Database

* PostgreSQL

### API style

* REST first
* JSON request/response
* versioned routes: `/api/v1/...`

### Backend

* FastAPI or Node/NestJS
* background jobs for daily generation, notifications, recalculation, cleanup

---

## 4. Core Data Model

## 4.1 users

Stores account and profile information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Notes

* `timezone` is important for daily resets, streaks, and quest deadlines
* `username` can be public-facing later if social features are added

---

## 4.2 user_profiles

Stores onboarding configuration and user intent.

```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  system_name TEXT NOT NULL DEFAULT 'Kshetra',
  current_rank TEXT NOT NULL DEFAULT 'E',
  current_level INT NOT NULL DEFAULT 1,
  total_xp INT NOT NULL DEFAULT 0,
  fatigue_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  motivation_mode TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_rank CHECK (current_rank IN ('E','D','C','B','A','S'))
);
```

### Notes

* `fatigue_score` is system-derived, not directly user-authored most of the time
* `motivation_mode` can later support different narrative modes without affecting scoring

---

## 4.3 user_goals

Stores explicit user goals defined during onboarding or later updates.

```sql
CREATE TABLE user_goals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority_weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Example goal types

* `fitness`
* `learning`
* `career`
* `relationship`
* `spiritual`
* `project`

---

## 4.4 attributes

Master table for supported attribute types.

```sql
CREATE TABLE attributes (
  code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL
);
```

### Seed values

* `strength`
* `wisdom`
* `focus`
* `mastery`
* `wealth`
* `bond`

---

## 4.5 user_attributes

Current attribute state per user.

```sql
CREATE TABLE user_attributes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attribute_code TEXT NOT NULL REFERENCES attributes(code),
  value NUMERIC(6,2) NOT NULL DEFAULT 0,
  cap NUMERIC(6,2) NOT NULL DEFAULT 30,
  growth_rate NUMERIC(6,3) NOT NULL DEFAULT 1.0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, attribute_code)
);
```

### Notes

* this stores current value only
* changes over time must also be recorded in a history table

---

## 4.6 user_attribute_history

Immutable history of attribute deltas.

```sql
CREATE TABLE user_attribute_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attribute_code TEXT NOT NULL REFERENCES attributes(code),
  delta NUMERIC(6,2) NOT NULL,
  old_value NUMERIC(6,2) NOT NULL,
  new_value NUMERIC(6,2) NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Example source types

* `quest_completion`
* `dungeon_completion`
* `raid_completion`
* `streak_bonus`
* `debuff`
* `manual_admin_repair`

---

## 4.7 xp_ledger

Immutable ledger for XP changes.

```sql
CREATE TABLE xp_ledger (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INT NOT NULL,
  old_total INT NOT NULL,
  new_total INT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Notes

* do not mutate old XP records
* current XP in `user_profiles.total_xp` should always be derivable from this ledger

---

## 4.8 streaks

Stores live streak state.

```sql
CREATE TABLE streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak_days INT NOT NULL DEFAULT 0,
  longest_streak_days INT NOT NULL DEFAULT 0,
  last_valid_day DATE,
  streak_status TEXT NOT NULL DEFAULT 'inactive',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_streak_status CHECK (streak_status IN ('inactive','active','broken'))
);
```

---

## 4.9 quest_templates

Reusable system-defined quest definitions.

```sql
CREATE TABLE quest_templates (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  base_points INT NOT NULL,
  default_attribute_code TEXT REFERENCES attributes(code),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_quest_difficulty CHECK (difficulty IN ('low','medium','high'))
);
```

### Example quest categories

* `daily`
* `weekly`
* `event`
* `dungeon_objective`
* `raid_objective`

---

## 4.10 quests

Concrete quest instances assigned to a user.

```sql
CREATE TABLE quests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES quest_templates(id),
  quest_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  is_stretch BOOLEAN NOT NULL DEFAULT FALSE,
  reward_xp_base INT NOT NULL,
  due_at TIMESTAMPTZ,
  generated_by TEXT NOT NULL,
  ai_generation_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT chk_quest_type CHECK (quest_type IN ('daily','weekly','event')),
  CONSTRAINT chk_quest_status CHECK (status IN ('active','completed','expired','cancelled')),
  CONSTRAINT chk_generated_by CHECK (generated_by IN ('system','ai','template'))
);
```

---

## 4.11 quest_attribute_map

Allows one quest to affect multiple attributes.

```sql
CREATE TABLE quest_attribute_map (
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  attribute_code TEXT NOT NULL REFERENCES attributes(code),
  weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (quest_id, attribute_code)
);
```

---

## 4.12 quest_logs

Logs user completion input.

```sql
CREATE TABLE quest_logs (
  id UUID PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL,
  intensity TEXT,
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_intensity CHECK (intensity IN ('low','medium','high') OR intensity IS NULL)
);
```

### Notes

* a quest should typically have one terminal completion log
* optional notes are mainly for context, not scoring, unless explicitly supported

---

## 4.13 dungeons

User-specific short challenges.

```sql
CREATE TABLE dungeons (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reward_xp INT NOT NULL,
  failure_penalty_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by TEXT NOT NULL,
  ai_generation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT chk_dungeon_status CHECK (status IN ('active','completed','failed','expired')),
  CONSTRAINT chk_dungeon_generated_by CHECK (generated_by IN ('system','ai'))
);
```

---

## 4.14 dungeon_objectives

Objectives inside a dungeon.

```sql
CREATE TABLE dungeon_objectives (
  id UUID PRIMARY KEY,
  dungeon_id UUID NOT NULL REFERENCES dungeons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_dungeon_objective_status CHECK (status IN ('pending','completed','failed'))
);
```

---

## 4.15 raids

Major user milestones.

```sql
CREATE TABLE raids (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  reward_xp INT NOT NULL,
  unlocks_rank BOOLEAN NOT NULL DEFAULT FALSE,
  verification_required BOOLEAN NOT NULL DEFAULT TRUE,
  generated_by TEXT NOT NULL,
  ai_generation_id UUID,
  completion_summary TEXT,
  artifact_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT chk_raid_status CHECK (status IN ('active','completed','failed','expired')),
  CONSTRAINT chk_raid_generated_by CHECK (generated_by IN ('system','ai'))
);
```

---

## 4.16 raid_objectives

Multi-step objectives for raids.

```sql
CREATE TABLE raid_objectives (
  id UUID PRIMARY KEY,
  raid_id UUID NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_raid_objective_status CHECK (status IN ('pending','completed','failed'))
);
```

---

## 4.17 modifiers

Active buffs and debuffs.

```sql
CREATE TABLE modifiers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  modifier_type TEXT NOT NULL,
  attribute_code TEXT REFERENCES attributes(code),
  effect_value NUMERIC(6,3) NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_modifier_type CHECK (modifier_type IN ('buff','debuff'))
);
```

---

## 4.18 ai_generations

Raw validated AI outputs for auditing.

```sql
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL,
  input_payload JSONB NOT NULL,
  raw_output JSONB NOT NULL,
  validated_output JSONB,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  model_name TEXT,
  token_usage_input INT,
  token_usage_output INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_generation_type CHECK (generation_type IN ('daily_plan','weekly_plan','event_batch','summary')),
  CONSTRAINT chk_validation_status CHECK (validation_status IN ('pending','accepted','rejected'))
);
```

### Notes

* store both raw and validated output
* do not trust raw model output directly

---

## 4.19 notifications

Tracks scheduled and delivered notifications.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_notification_status CHECK (status IN ('pending','sent','failed','cancelled')),
  CONSTRAINT chk_notification_channel CHECK (channel IN ('web_push','telegram','email'))
);
```

---

## 4.20 rank_history

Records rank promotions.

```sql
CREATE TABLE rank_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_rank TEXT NOT NULL,
  new_rank TEXT NOT NULL,
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_old_rank CHECK (old_rank IN ('E','D','C','B','A','S')),
  CONSTRAINT chk_new_rank CHECK (new_rank IN ('E','D','C','B','A','S'))
);
```

---

## 5. Recommended Indexes

```sql
CREATE INDEX idx_quests_user_status_due_at ON quests(user_id, status, due_at);
CREATE INDEX idx_quest_logs_user_logged_at ON quest_logs(user_id, logged_at DESC);
CREATE INDEX idx_xp_ledger_user_created_at ON xp_ledger(user_id, created_at DESC);
CREATE INDEX idx_attr_history_user_attr_created ON user_attribute_history(user_id, attribute_code, created_at DESC);
CREATE INDEX idx_notifications_user_status_sched ON notifications(user_id, status, scheduled_at);
CREATE INDEX idx_ai_generations_user_created_at ON ai_generations(user_id, created_at DESC);
CREATE INDEX idx_dungeons_user_status ON dungeons(user_id, status);
CREATE INDEX idx_raids_user_status ON raids(user_id, status);
CREATE INDEX idx_modifiers_user_active_end ON modifiers(user_id, is_active, ends_at);
```

---

## 6. Entity Relationship Summary

### User-centric structure

* one `users` row
* one `user_profiles` row
* one `streaks` row
* many `user_goals`
* many `user_attributes`
* many `quests`
* many `quest_logs`
* many `dungeons`
* many `raids`
* many `modifiers`
* many `notifications`
* many `ai_generations`

### History/ledger pattern

* `xp_ledger` is append-only
* `user_attribute_history` is append-only
* `rank_history` is append-only

This is important for auditability and recalculation.

---

## 7. API Design Principles

### 7.1 Versioning

All routes should be under:

```text
/api/v1
```

### 7.2 Auth

Assume authenticated user context via:

* JWT
* session cookie
* Supabase auth token
* or equivalent

### 7.3 Response shape

Recommended standard envelope:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

Error example:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "QUEST_NOT_FOUND",
    "message": "Quest does not exist or is not accessible."
  },
  "meta": {}
}
```

---

## 8. Core API Specification

## 8.1 User / profile

### GET /api/v1/me

Returns current user profile summary.

#### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "avinash",
    "display_name": "Avinash",
    "current_rank": "E",
    "current_level": 4,
    "total_xp": 320,
    "fatigue_score": 0.18,
    "timezone": "Asia/Kolkata"
  }
}
```

---

### PATCH /api/v1/me/profile

Updates editable profile fields.

#### Request

```json
{
  "display_name": "Avinash",
  "timezone": "Asia/Kolkata",
  "motivation_mode": "architect"
}
```

---

## 8.2 Onboarding / goals

### POST /api/v1/onboarding

Creates initial profile state, goals, and first attribute setup.

#### Request

```json
{
  "display_name": "Avinash",
  "timezone": "Asia/Kolkata",
  "goals": [
    {
      "goal_type": "fitness",
      "title": "Reduce body fat and stay consistent",
      "description": "Gym, nutrition, walking"
    },
    {
      "goal_type": "learning",
      "title": "Improve ML depth",
      "description": "Daily learning and project work"
    }
  ]
}
```

#### Behavior

* marks onboarding complete
* seeds `user_attributes`
* seeds `streaks`
* optionally triggers initial daily plan generation

---

### GET /api/v1/goals

Returns active and inactive goals.

### POST /api/v1/goals

Creates a new goal.

### PATCH /api/v1/goals/{goalId}

Updates goal fields.

### DELETE /api/v1/goals/{goalId}

Soft-disables a goal.

---

## 8.3 Attributes / progression

### GET /api/v1/attributes

Returns current attributes and caps.

#### Response

```json
{
  "success": true,
  "data": [
    { "code": "strength", "value": 12.5, "cap": 30, "growth_rate": 1.0 },
    { "code": "wisdom", "value": 7.0, "cap": 30, "growth_rate": 1.0 },
    { "code": "focus", "value": 10.0, "cap": 30, "growth_rate": 0.9 }
  ]
}
```

---

### GET /api/v1/progression/summary

Returns high-level progression state.

#### Response

```json
{
  "success": true,
  "data": {
    "rank": "D",
    "level": 8,
    "total_xp": 620,
    "current_streak_days": 6,
    "longest_streak_days": 9,
    "rank_progress": {
      "current_rank": "D",
      "next_rank": "C",
      "xp_remaining": 880,
      "raids_remaining": 1,
      "streak_requirement_remaining": 4
    }
  }
}
```

---

### GET /api/v1/progression/history

Returns XP, rank, and attribute timeline.

#### Query params

* `range=7d|30d|90d|1y`

---

## 8.4 Quests

### GET /api/v1/quests/today

Returns current day quest bundle.

#### Response

```json
{
  "success": true,
  "data": {
    "mandatory": [],
    "optional": [],
    "stretch": null,
    "events": []
  }
}
```

---

### GET /api/v1/quests

List quests by filter.

#### Query params

* `type=daily|weekly|event`
* `status=active|completed|expired`
* `from=ISO_DATE`
* `to=ISO_DATE`

---

### POST /api/v1/quests/{questId}/complete

Completes a quest.

#### Request

```json
{
  "intensity": "medium",
  "note": "Completed after office"
}
```

#### Backend responsibilities

* verify quest ownership
* verify quest is active and not expired
* create `quest_logs`
* invoke rules engine
* update XP ledger
* update attribute history
* mark quest completed
* recalculate streak if needed
* check rank promotion

#### Response

```json
{
  "success": true,
  "data": {
    "quest_id": "uuid",
    "xp_awarded": 14,
    "attribute_changes": [
      { "code": "strength", "delta": 3.5 },
      { "code": "focus", "delta": 1.0 }
    ],
    "new_total_xp": 514,
    "rank_up": false
  }
}
```

---

### POST /api/v1/quests/generate/daily

Generates or regenerates daily quests.

#### Behavior

* builds AI input
* calls AI planner if enabled
* validates output
* persists accepted quests
* falls back to deterministic templates if AI fails

#### Request

```json
{
  "force_regenerate": false
}
```

---

### POST /api/v1/quests/generate/weekly

Generates weekly quest set.

---

## 8.5 Dungeons

### GET /api/v1/dungeons

Returns active and past dungeons.

### POST /api/v1/dungeons

Creates a dungeon, usually system- or AI-originated.

#### Request

```json
{
  "title": "5-Day Nutrition Lock",
  "description": "Stay on planned nutrition for 5 days",
  "starts_at": "2026-03-28T00:00:00Z",
  "ends_at": "2026-04-01T23:59:59Z",
  "reward_xp": 30,
  "objectives": [
    { "title": "Day 1 completed", "sort_order": 1 },
    { "title": "Day 2 completed", "sort_order": 2 }
  ]
}
```

---

### POST /api/v1/dungeons/{dungeonId}/objectives/{objectiveId}/complete

Marks a dungeon objective complete.

### POST /api/v1/dungeons/{dungeonId}/complete

Attempts to complete dungeon.

#### Backend responsibilities

* verify all required objectives complete
* award reward
* apply attribute deltas
* update history
* mark completed

---

## 8.6 Raids

### GET /api/v1/raids

Returns active and historical raids.

### POST /api/v1/raids

Creates raid.

### POST /api/v1/raids/{raidId}/objectives/{objectiveId}/complete

Marks raid objective complete.

### POST /api/v1/raids/{raidId}/complete

Attempts raid completion.

#### Request

```json
{
  "completion_summary": "Shipped MVP login and quest dashboard",
  "artifact_url": "https://example.com/demo"
}
```

#### Backend responsibilities

* verify requirements
* verify completion summary if required
* award XP
* write attribute history
* mark raid complete
* check rank promotion

---

## 8.7 Streaks

### GET /api/v1/streaks

Returns streak state.

### POST /api/v1/streaks/recalculate

Admin/system/internal route to recompute streak based on quest completions.

---

## 8.8 AI planning

### POST /api/v1/ai/daily-plan

Internal or protected route.

#### Purpose

* prepare daily AI input
* call model
* validate structured output
* persist to `ai_generations`
* create quests/events if accepted

### POST /api/v1/ai/weekly-plan

Same idea for weekly plans.

### GET /api/v1/ai/generations

Audit route for latest accepted/rejected AI generations.

---

## 8.9 Notifications

### GET /api/v1/notifications

Returns recent notifications.

### POST /api/v1/notifications/test

Sends test notification to authenticated user.

### POST /api/v1/notifications/schedule

Internal/system route for scheduling.

#### Example use cases

* daily quest ready
* streak at risk
* mystery event opened
* raid deadline approaching

---

## 8.10 Admin / internal utility routes

These should be protected.

### POST /api/v1/internal/progression/recompute

Recompute a user’s XP, rank, attributes from ledger and logs.

### POST /api/v1/internal/quests/expire

Expire outdated quests.

### POST /api/v1/internal/modifiers/cleanup

Deactivate expired modifiers.

### POST /api/v1/internal/notifications/dispatch

Send pending notifications due for delivery.

---

## 9. Validation Rules by Domain

## 9.1 Quest completion validation

Reject if:

* quest not found
* user does not own quest
* quest already completed
* quest expired/cancelled
* invalid intensity

## 9.2 Dungeon completion validation

Reject if:

* not all required objectives complete
* dungeon not active
* already completed/failed

## 9.3 Raid completion validation

Reject if:

* not all required objectives complete
* verification summary missing when required
* already completed/failed

## 9.4 AI output validation

Reject if:

* schema invalid
* too many quests/events
* disallowed quest types
* duplicate or stale content
* impossible deadlines
* invalid difficulty or reward structure

---

## 10. Backend Service Boundaries

Recommended internal services:

### 10.1 UserService

Handles:

* profile
* onboarding
* goals

### 10.2 QuestService

Handles:

* generation persistence
* fetch/filter
* completion lifecycle

### 10.3 ProgressionService

Handles:

* XP award
* attribute application
* level/rank updates
* threshold checks

### 10.4 StreakService

Handles:

* valid-day detection
* streak increment/reset
* milestone bonus

### 10.5 DungeonService

Handles:

* dungeon creation
* objective tracking
* completion/failure

### 10.6 RaidService

Handles:

* raid lifecycle
* verification logic
* completion rewards

### 10.7 AIPlannerService

Handles:

* prompt construction
* model call
* schema validation
* safe fallback

### 10.8 NotificationService

Handles:

* scheduling
* delivery
* retries
* status updates

---

## 11. Suggested Background Jobs

### Daily midnight local time per user

* expire old daily quests
* generate new daily quests
* reset daily caps
* schedule daily notification

### Every hour

* evaluate mystery event triggers
* dispatch pending notifications
* deactivate expired modifiers

### Weekly

* generate weekly plan
* compute weekly summary
* optionally suggest dungeon/raid candidates

---

## 12. Suggested API Build Order

### Phase 1

* auth + onboarding
* goals
* attributes
* progression summary
* daily quests fetch
* quest completion
* streak calculation

### Phase 2

* AI daily plan generation
* weekly quests
* notifications
* progression history

### Phase 3

* dungeons
* raids
* modifiers
* admin recomputation routes

---

## 13. Non-Negotiable Constraints

* all XP changes must go through ledger
* all attribute changes must be logged in history
* AI output must never directly mutate progression
* rank promotion must always be deterministic
* APIs must enforce ownership and state correctness
* history must remain auditable

---

## 14. Future Extensions

Not required for v1, but schema should not block them:

* guilds / parties
* friend leaderboards
* archetype classes
* device integrations
* GitHub / calendar sync
* premium narrative modes
* native mobile push token support

---

## 15. Final Summary

Kshetra’s backend should be built around:

* a **stable relational core**
* **append-only history** for progression
* **deterministic business rules**
* **AI as a constrained planning layer**
* **minimal but strict APIs**

The system should be easy to audit, hard to exploit, and flexible enough to evolve without rewriting the entire model.
