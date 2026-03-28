# KSHETRA Development Runbook

## 1. Purpose

This document explains how to run KSHETRA locally and how the current codebase is structured technically.

It is intended for:

- local development
- onboarding another engineer
- verifying infra assumptions
- understanding where deterministic logic lives

## 2. Product Shape

KSHETRA is a deterministic progression engine with a constrained AI planner layer.

Authoritative backend systems currently include:

- user and onboarding state
- goals and profile state
- six attributes
- daily quests
- quest completion
- XP ledger
- user attribute history
- valid-day evaluation
- streak state
- streak milestone bonuses
- progression summary and history

The frontend is a presentation layer over backend APIs. It may compute rendering geometry and UI formatting, but it must not own progression logic.

## 3. Stack

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- custom SVG radar component

### Backend

- NestJS
- TypeScript
- REST APIs only

### Database

- PostgreSQL

### ORM

- Prisma

### Runtime / package manager

- Bun

## 4. Monorepo Structure

```text
KSHETRA/
  apps/
    api/
      src/
        ai/
        attributes/
        goals/
        health/
        onboarding/
        prisma/
        profile/
        progression/
        quests/
        streak/
        users/
    web/
      src/
        app/
        components/
        lib/
  packages/
    types/
      src/
  prisma/
    migrations/
    schema.prisma
    seed.ts
  docs/
```

## 5. Prerequisites

Install locally:

- Bun
- PostgreSQL

Recommended local database:

- host: `localhost`
- port: `5432`
- database: `kshetra`
- user: `postgres`
- password: `postgres`

## 6. Environment Files

Create local env files:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

### Required variables

#### Shared / root

- `DATABASE_URL`
- `API_PORT`
- `WEB_PORT`
- `NEXT_PUBLIC_API_BASE_URL`

#### API

- `DATABASE_URL`
- `API_PORT`
- `WEB_ORIGIN`

#### Optional AI planner config

- `AI_BASE_URL`
- `AI_MODEL`
- `AI_API_KEY`

If AI config is missing, the Phase 5 quest planner falls back safely to deterministic template assignment.

## 7. Install and Bootstrap

### Install dependencies

```bash
bun install
```

### Generate Prisma client

```bash
bun run prisma:generate
```

### Run migrations

```bash
bun run prisma:migrate
```

### Seed base data

```bash
bun run prisma:seed
```

Seeding currently creates:

- attribute catalog
- quest template seed set

## 8. Run Locally

### API

```bash
bun run dev:api
```

Expected base URL:

```text
http://localhost:4000/api/v1
```

### Web

```bash
bun run dev:web
```

Expected URL:

```text
http://localhost:3000
```

### Health check

```text
GET http://localhost:4000/api/v1/health
```

## 9. Root Scripts

From the repository root:

- `bun run dev:web`
- `bun run dev:api`
- `bun run build`
- `bun run check`
- `bun run prisma:generate`
- `bun run prisma:migrate`
- `bun run prisma:seed`
- `bun run prisma:studio`

## 10. Backend Architecture

The API is structured by domain modules.

### Core modules

- `users`
- `profile`
- `goals`
- `attributes`
- `quests`
- `progression`
- `streak`
- `ai`

### Design rules

- backend is source of truth
- deterministic progression logic stays in backend services
- all XP changes go through `xp_ledger`
- all attribute deltas go through `user_attribute_history`
- valid-day and streak changes are audited
- AI output is advisory only and must pass validation before creating quests

## 11. Frontend Architecture

The frontend is organized around route surfaces and reusable components.

### Main screens

- Home
- Missions
- Progress
- Profile

### Important rules

- no frontend scoring logic
- no frontend streak logic
- no frontend rank computation
- radar is presentation-only
- frontend uses shared transport types from `packages/types`

## 12. Database Ownership

`prisma/schema.prisma` is the canonical schema source.

Current important tables:

- `users`
- `user_profiles`
- `user_goals`
- `attributes`
- `user_attributes`
- `streaks`
- `quest_templates`
- `quests`
- `quest_attribute_map`
- `quest_logs`
- `xp_ledger`
- `user_attribute_history`
- `valid_days`
- `ai_generations`

### Audit-critical tables

#### `xp_ledger`

Every XP mutation must write a ledger row.

Sources currently include:

- `quest_completion`
- `streak_milestone_bonus`

#### `user_attribute_history`

Every attribute change must be recorded before/with aggregate updates.

#### `valid_days`

Tracks per-user per-day validity and milestone application state so streak increments and milestone bonuses cannot be applied repeatedly for the same day transition.

#### `ai_generations`

Tracks accepted, rejected, failed, and fallback-used planner attempts.

## 13. Daily Quest Generation Flow

Current flow in `quests.service.ts`:

1. expire stale active daily quests from prior dates
2. check whether the user already has today’s bundle
3. if not:
   - load allowed daily templates
   - build AI planner input
   - attempt AI call with strict timeout
   - validate JSON response strictly
   - if valid, create quests from the approved template codes
   - otherwise, use deterministic fallback template assignment
4. copy attribute weights into `quest_attribute_map`
5. return `mandatory`, `optional`, `stretch`

### AI constraints

- timeout is short
- temperature is low
- JSON-only response is required
- invented templates are rejected
- backend validation remains authoritative
- fallback is always available

## 14. Quest Completion Flow

Current flow:

1. validate quest ownership and active status
2. write `quest_logs`
3. mark quest completed
4. write `xp_ledger`
5. write `user_attribute_history`
6. update `user_attributes`
7. update `user_profiles.total_xp` and `current_level`
8. evaluate valid day
9. update `streaks` if the day newly becomes valid
10. write separate streak milestone bonus ledger entry if applicable

## 15. Valid Day and Streak Rules

A day becomes valid only if all are true:

- at least 3 meaningful completions
- at least 18 XP for that local day
- no more than 40% of that day’s XP came from low-difficulty actions

When a day newly becomes valid:

- streak increments once
- milestone bonus is evaluated once
- milestone XP is written as a separate `xp_ledger` entry

## 16. Progression History API

`GET /api/v1/progression/history?range=7d|30d|90d|1y`

Stable response sections:

- `xp_timeline`
- `attribute_timeline`
- `valid_days`
- `milestones`

These are built from auditable persisted state, not frontend estimation.

## 17. Radar Visualization

The radar is a custom SVG component used on Home and Progress.

Frontend-only computations:

- normalized render value from `value / cap`
- axis coordinates
- polygon geometry
- recent-change pulse selection from timestamps

The radar does not invent progression meaning.

## 18. AI Endpoint Configuration

KSHETRA uses an OpenAI-compatible integration boundary.

Expected env:

- `AI_BASE_URL`
- `AI_MODEL`
- `AI_API_KEY`

The backend currently targets:

```text
POST {AI_BASE_URL}/chat/completions
```

with:

- low temperature
- strict timeout
- JSON-only prompting

## 19. Recommended Local Verification

Run:

```bash
bun run prisma:generate
bun run check
bun run build
```

If you have PostgreSQL running and env configured, also verify:

- onboarding
- quest fetch
- quest completion
- progression summary
- progression history
- optional AI planner path

## 20. Known Boundaries

Not implemented yet:

- dungeons
- raids
- notifications
- AI scoring
- AI state mutation
- event generation
- narrative systems
- rank-up cinematics

The current system is intentionally phase-bounded and deterministic first.
