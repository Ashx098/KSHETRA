# KSHETRA — System Specification (v1)

---

## 1. Definition

**Kshetra** is a structured life progression engine that maps real-world actions to a constrained, rule-based growth system across multiple human domains.

It is designed as:

* a **stateful system**
* with **deterministic progression rules**
* augmented by a **constrained AI planner**

The system converts:

* discrete actions → quantified attribute changes
* repeated behavior → streak dynamics
* structured effort → milestone progression
* major outcomes → rank transitions

---

## 2. System Goals

1. Represent human life domains as measurable attributes
2. Provide low-friction input while maintaining high signal quality
3. Prevent trivial exploitation of progression
4. Ensure progression reflects meaningful effort
5. Maintain long-term engagement via structured variability
6. Separate deterministic logic from AI-generated content

---

## 3. System Model

### 3.1 State Representation

Each user is represented as:

```json
UserState {
  user_id: string,
  attributes: AttributeState[],
  xp: number,
  level: number,
  rank: Rank,
  streak: StreakState,
  active_quests: Quest[],
  active_dungeons: Dungeon[],
  active_raids: Raid[],
  buffs: Modifier[],
  debuffs: Modifier[],
  history: ActivityLog[]
}
```

---

### 3.2 Attributes

Attributes are the primary axes of progression.

```json
AttributeState {
  name: enum["strength","wisdom","focus","mastery","wealth","bond"],
  value: float,        // current value
  cap: float,          // max allowed at current rank
  growth_rate: float,  // modified by buffs/debuffs
  last_updated: timestamp
}
```

#### Attribute Semantics

* **strength** → physical health, activity consistency
* **wisdom** → reflection, philosophical grounding
* **focus** → attention control, deep work
* **mastery** → technical and intellectual growth
* **wealth** → productive output, career leverage
* **bond** → meaningful relationship investment

---

### 3.3 XP and Level

XP is an aggregate scalar.

```json
XP = Σ(action_score)
Level = floor(sqrt(XP))
```

Level provides short-term feedback.
Rank is the primary progression gate.

---

### 3.4 Rank System

```json
Rank = ["E","D","C","B","A","S"]
```

Each rank has:

```json
RankConfig {
  xp_threshold: number,
  attribute_minimums: map<attribute, value>,
  required_raids: number,
  required_streak: number,
  attribute_caps: map<attribute, value>
}
```

Rank transition requires all conditions satisfied.

---

## 4. Action Model

### 4.1 Action Definition

```json
Action {
  action_type: string,
  attributes_affected: map<attribute, weight>,
  base_points: number,
  difficulty: enum["low","medium","high"],
  timestamp: timestamp,
  metadata: optional
}
```

---

### 4.2 Scoring Function

```text
score = base_points × difficulty_multiplier × consistency_multiplier × integrity_factor
```

#### Multipliers

* difficulty_multiplier:

  * low = 1.0
  * medium = 1.5
  * high = 2.2

* consistency_multiplier:

  * increases with streak
  * capped to prevent runaway scaling

* integrity_factor:

  * decreases if repeated identical low-effort actions
  * enforces anti-cheat behavior

---

### 4.3 Anti-Exploit Rules

1. Repeated identical actions within short intervals → diminishing returns
2. Low-difficulty actions have capped daily contribution
3. Same action type has cooldown window
4. Attribute growth is capped per day
5. Raids require completion metadata (summary / artifact)

---

## 5. Quest System

### 5.1 Quest Definition

```json
Quest {
  id: string,
  type: enum["daily","weekly","event"],
  attributes_targeted: attribute[],
  reward: Reward,
  deadline: timestamp,
  completion_state: boolean
}
```

---

### 5.2 Quest Constraints

* Daily:

  * 3 mandatory
  * 2 optional
  * 1 stretch

* Weekly:

  * one per attribute

---

## 6. Dungeon System

### 6.1 Definition

A dungeon is a short-duration structured challenge.

```json
Dungeon {
  id: string,
  duration_days: int,
  objectives: Objective[],
  reward: Reward,
  failure_penalty: Modifier
}
```

Examples:

* multi-day diet adherence
* learning module completion
* repeated deep work cycles

---

## 7. Raid System

### 7.1 Definition

A raid is a high-effort milestone.

```json
Raid {
  id: string,
  objectives: Objective[],
  reward: Reward,
  unlocks_rank: boolean,
  verification_required: boolean
}
```

Properties:

* multi-step
* time-bound
* significant reward
* required for rank progression

---

## 8. Streak System

```json
StreakState {
  current: int,
  longest: int,
  last_active_date: date
}
```

Rules:

* increments on valid day completion
* resets on inactivity
* affects consistency multiplier

---

## 9. Modifier System (Buffs / Debuffs)

```json
Modifier {
  type: enum["buff","debuff"],
  attribute: attribute,
  effect: float,
  duration: time_window
}
```

Examples:

* sleep deficit → focus debuff
* high consistency → growth buff

---

## 10. Mystery Event System

### 10.1 Definition

Dynamic, time-bound quests generated conditionally.

```json
Event {
  id: string,
  trigger_condition: string,
  time_window: duration,
  reward: Reward,
  rarity: float
}
```

Constraints:

* max 2 per day
* context-aware
* non-disruptive

---

## 11. AI Architect System

### 11.1 Role

AI generates:

* daily quests
* weekly plans
* mystery events
* summaries

AI does NOT:

* calculate score
* update state
* enforce rules

---

### 11.2 Input

```json
AIInput {
  last_7_day_activity,
  attribute_distribution,
  user_goals,
  fatigue_score,
  streak_state
}
```

---

### 11.3 Output (STRICT JSON)

```json
AIOutput {
  quests: Quest[],
  events: Event[],
  weekly_plan: Plan,
  summary: string
}
```

---

## 12. Input Model

User input is limited to:

```json
LogEntry {
  quest_id: string,
  completed: boolean,
  intensity: optional["low","medium","high"]
}
```

No raw metric logging required.

---

## 13. Data Model (Core Tables)

* users
* attributes
* xp_logs
* quests
* quest_logs
* dungeons
* raids
* streaks
* modifiers
* events
* ai_outputs

---

## 14. Backend Architecture

### Components

1. **State Engine**

   * updates attributes
   * applies scoring
   * enforces caps

2. **Progression Engine**

   * rank validation
   * level calculation

3. **Anti-Cheat Engine**

   * integrity factor
   * cooldowns

4. **AI Orchestrator**

   * builds prompts
   * validates outputs

5. **Scheduler**

   * daily quest generation
   * event triggering

---

## 15. Frontend Requirements

### Core UI Components

* radar chart (attributes)
* quest cards
* rank display
* xp bar

### Interaction Model

* tap-based logging
* minimal text input
* animation on completion

---

## 16. Radar Chart Requirements

* 6-axis structure
* animated transitions
* rank-based expansion
* historical overlay support

---

## 17. Notification System

Types:

* daily initialization
* streak risk
* event trigger
* raid deadline

Delivery:

* web push / messaging integration

---

## 18. Tech Stack

Frontend:

* Next.js
* Tailwind
* Framer Motion

Backend:

* FastAPI / Node

Database:

* PostgreSQL

AI:

* OpenAI API (structured output)

---

## 19. Execution Phases

### Phase 1

* core state engine
* manual logging
* quests
* radar chart

### Phase 2

* AI integration
* events
* streak system

### Phase 3

* dungeons
* raids
* modifiers

---

## 20. Constraints

* input must remain minimal
* system must prevent farming
* progression must reflect effort
* AI must remain constrained

---

## 21. End State

A system where:

* user state evolves deterministically
* effort translates into visible growth
* long-term progression is structured and non-trivial
* engagement is sustained via controlled variability
