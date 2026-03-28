# KSHETRA — Core Mechanics Specification (v1)

---

## 1. Purpose

Define the deterministic rules governing:

* scoring
* attribute growth
* rank progression
* anti-exploit systems

This document contains NO AI logic.

---

## 2. Attribute Model

Attributes:

```text
Strength, Wisdom, Focus, Mastery, Wealth, Bond
```

### 2.1 Attribute Range

Per Rank:

| Rank | Attribute Cap |
| ---- | ------------- |
| E    | 30            |
| D    | 45            |
| C    | 60            |
| B    | 75            |
| A    | 90            |
| S    | 100           |

---

## 3. XP System

### 3.1 XP Calculation

```text
XP = Σ(action_score)
Level = floor(sqrt(XP))
```

---

## 4. Action Scoring

### 4.1 Base Points

| Action Type | Base Points |
| ----------- | ----------- |
| Micro       | 5           |
| Structured  | 12          |
| Dungeon     | 30          |
| Raid        | 80          |

---

### 4.2 Difficulty Multiplier

| Difficulty | Multiplier |
| ---------- | ---------- |
| Low        | 1.0        |
| Medium     | 1.5        |
| High       | 2.2        |

---

### 4.3 Consistency Multiplier

```text
consistency_multiplier = 1 + min(streak_days × 0.02, 0.3)
```

Max boost = +30%

---

### 4.4 Integrity Factor (Anti-Cheat)

```text
integrity_factor ∈ [0.5, 1.0]
```

Rules:

* repeated identical action within 24h → decay
* excessive low-difficulty logs → decay
* varied meaningful actions → stays near 1.0

---

### 4.5 Final Score

```text
score = base_points × difficulty × consistency × integrity
```

---

## 5. Daily Limits

### 5.1 Attribute Gain Cap (per day)

| Attribute | Max Daily Gain |
| --------- | -------------- |
| Any       | 8              |

---

### 5.2 XP Cap (per day)

```text
XP_daily_cap = 120
```

Prevents spam farming.

---

## 6. Streak System

### 6.1 Valid Day Condition

A day counts if:

* ≥ 3 meaningful actions completed

---

### 6.2 Effects

* increases consistency multiplier
* unlocks streak bonuses

---

### 6.3 Streak Milestones

| Days | Bonus XP |
| ---- | -------- |
| 3    | +10      |
| 7    | +25      |
| 14   | +60      |
| 30   | +150     |

---

## 7. Rank System

### 7.1 XP Thresholds

| Rank | XP Required |
| ---- | ----------- |
| E    | 0           |
| D    | 500         |
| C    | 1500        |
| B    | 4000        |
| A    | 9000        |
| S    | 20000       |

---

### 7.2 Attribute Minimums

| Rank | Min Attribute Value |
| ---- | ------------------- |
| D    | 15                  |
| C    | 25                  |
| B    | 40                  |
| A    | 60                  |
| S    | 80                  |

(All attributes must satisfy minimum)

---

### 7.3 Raid Requirements

| Rank | Raids Required |
| ---- | -------------- |
| D    | 1              |
| C    | 2              |
| B    | 3              |
| A    | 5              |
| S    | 8              |

---

### 7.4 Streak Requirements

| Rank | Required Streak |
| ---- | --------------- |
| D    | 5 days          |
| C    | 10 days         |
| B    | 14 days         |
| A    | 21 days         |
| S    | 30 days         |

---

## 8. Dungeon Rules

* duration: 2–7 days
* must contain ≥ 3 objectives
* failure:

  * no reward
  * minor debuff (optional)

---

## 9. Raid Rules

* multi-step objectives
* completion required for rank
* must include:

  * summary
  * optional artifact (text/log)

---

## 10. Anti-Exploit System

### 10.1 Cooldowns

| Action Type | Cooldown |
| ----------- | -------- |
| Micro       | 2 hours  |
| Structured  | 6 hours  |

---

### 10.2 Diminishing Returns

If same action repeated:

```text
reward *= 0.7^n
```

---

### 10.3 Low-Effort Cap

Low difficulty actions:

```text
max 40% of daily XP
```

---

## 11. Debuff System

### Examples

* 2 missed days:

  * -10% growth rate for 24h

* poor consistency:

  * reduced consistency multiplier

---

## 12. Growth Model

* slow linear growth daily
* exponential perception via rank unlocks
* major jumps only via:

  * dungeons
  * raids

---

## 13. System Constraints

* growth must feel earned
* no instant jumps
* no infinite farming
* meaningful effort must dominate

---

## 14. Tuning Notes

* numbers are adjustable
* integrity_factor is critical
* daily caps must remain enforced
* raids must feel rare and impactful
