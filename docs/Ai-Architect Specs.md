# KSHETRA — AI Architect Specification (v1)

---

## 1. Purpose

Define the controlled use of AI in the system.

AI is responsible for:

* planning
* suggestion
* narrative

AI is NOT responsible for:

* scoring
* validation
* progression logic

---

## 2. AI Role

The AI acts as:

```text
SYSTEM ARCHITECT
```

Responsibilities:

* generate quests
* generate events
* generate weekly plans
* summarize performance

---

## 3. Input Schema

```json
AIInput {
  attributes: {
    strength,
    wisdom,
    focus,
    mastery,
    wealth,
    bond
  },
  last_7_days: ActivitySummary,
  streak: number,
  fatigue_score: float,
  goals: string[],
  active_dungeons: [],
  active_raids: []
}
```

---

## 4. Output Schema (STRICT)

```json
AIOutput {
  daily_quests: Quest[],
  optional_quests: Quest[],
  stretch_quest: Quest,
  events: Event[],
  weekly_plan: Plan,
  summary: string
}
```

---

## 5. Constraints

AI MUST:

* generate max:

  * 3 mandatory quests
  * 2 optional
  * 1 stretch
  * ≤ 2 events

* follow:

  * allowed quest types
  * valid difficulty ranges
  * realistic tasks

---

## 6. Allowed Quest Types

* gym / physical activity
* deep work
* learning
* project work
* reflection / wisdom
* relationship effort

---

## 7. Event Generation Rules

Events must be:

* time-bound
* achievable
* context-aware

Example:

* “Complete 30-min focus block in next 90 mins”

NOT allowed:

* unrealistic tasks
* vague suggestions
* spam frequency

---

## 8. Personalization Logic

AI should consider:

* weakest attributes → higher priority
* recent neglect → recovery quests
* streak risk → save-day quests
* fatigue → lighter tasks

---

## 9. Frequency Control

| Type         | Frequency |
| ------------ | --------- |
| Daily Quests | once/day  |
| Events       | 0–2/day   |
| Weekly Plan  | once/week |

---

## 10. Tone & Style

* concise
* serious
* non-cringe
* slightly authoritative
* not overly emotional

---

## 11. Safety Constraints

AI must NOT:

* manipulate emotionally
* assign guilt
* suggest harmful behavior
* create unrealistic expectations

---

## 12. Validation Layer

All AI output must pass:

* schema validation
* rule validation
* difficulty bounds
* duplication checks

Invalid output → regenerate

---

## 13. Prompt Design (High-Level)

System prompt includes:

* role definition
* attribute definitions
* allowed actions
* constraints
* output format

---

## 14. Failure Handling

If AI fails:

* fallback:

  * static quest templates
  * last valid plan

---

## 15. Future Extensions

* adaptive difficulty tuning
* personality modes
* group/guild coordination
* long-term planning

---

## 16. Key Principle

AI adds:

* variability
* personalization
* narrative

AI does NOT control:

* fairness
* progression
* scoring

---
