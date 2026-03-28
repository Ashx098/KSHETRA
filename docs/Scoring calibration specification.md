# KSHETRA — Scoring Calibration Specification (v1)

## 1. Purpose

This document converts the abstract scoring model into calibrated, real-world numbers.

It defines:

* expected XP flow per day and week
* expected attribute growth rates
* meaningful effort tiers
* rank progression pacing
* anti-farming balancing
* practical scoring examples

This document exists to ensure the system is:

* not too easy
* not too punishing
* motivating over weeks, not just hours
* grounded in realistic human behavior

---

## 2. Calibration Goals

The scoring system must satisfy all of the following:

### 2.1 Daily effort should matter

A good day should visibly move the system.

### 2.2 Small actions should help but not dominate

Micro actions should create momentum, not carry progression.

### 2.3 Bigger milestones must matter much more

Dungeons and raids should create the strongest progression shifts.

### 2.4 Progression should feel earned

A user should not rank up from shallow repetition.

### 2.5 The system should survive imperfect human behavior

Missing one day should not destroy motivation.
Repeated weak effort should slow progress naturally.

---

## 3. Effort Layers

## 3.1 Micro actions

Low-friction, daily building blocks.

Examples:

* complete gym session
* do one deep work block
* read and reflect briefly
* complete one ML learning session
* complete one meaningful bond action

### Intended purpose

* support consistency
* maintain streaks
* drive small attribute change

### Intended impact

* small XP
* small stat growth

---

## 3.2 Structured completions

Weekly-pattern or medium-effort completions.

Examples:

* complete 4 gym sessions in one week
* finish 5 deep work blocks across week
* complete one learning module
* maintain nutrition for several days
* follow through on one meaningful relationship action

### Intended purpose

* reward consistency and completion
* accelerate visible progress

### Intended impact

* medium XP
* medium stat growth

---

## 3.3 Dungeons

Short, bounded challenge arcs.

Examples:

* 5-day nutrition lock
* 7-day wisdom streak
* complete one technical mini-project
* 5-day focused sleep recovery stretch

### Intended purpose

* create short-term challenge and identity shift

### Intended impact

* large XP
* stronger attribute movement
* unlock narrative momentum

---

## 3.4 Raids

Major milestones.

Examples:

* ship MVP milestone
* complete 30-day fitness consistency challenge
* finish serious technical deliverable
* complete a project milestone with proof

### Intended purpose

* gate rank progression
* reward meaningful real-world outcomes

### Intended impact

* major XP
* major identity progression
* rank eligibility

---

## 4. Base Scoring Calibration

## 4.1 Base XP values

| Effort Layer | Base XP |
| ------------ | ------: |
| Micro        |       6 |
| Structured   |      16 |
| Dungeon      |      40 |
| Raid         |     100 |

These values are intentionally separated enough that:

* 1 raid matters far more than many tiny logs
* dungeons feel materially important
* structured effort sits between daily effort and milestone work

---

## 4.2 Difficulty multipliers

| Difficulty | Multiplier |
| ---------- | ---------: |
| Low        |        1.0 |
| Medium     |        1.5 |
| High       |        2.2 |

These must remain stable across the system.

Difficulty should reflect real effort, not user ego.

---

## 4.3 Consistency multiplier

```text
consistency_multiplier = 1 + min(streak_days * 0.02, 0.30)
```

Interpretation:

* every streak day adds +2%
* cap at +30%
* rewards consistency without making streaks overpower scoring

### Examples

* 0 days streak → 1.00
* 5 days streak → 1.10
* 10 days streak → 1.20
* 15 days streak → 1.30
* 25 days streak → still 1.30

---

## 4.4 Integrity factor

```text
integrity_factor ∈ [0.50, 1.00]
```

This is the anti-cheat factor.

It should be reduced by:

* repeated identical action spam
* excessive low-difficulty logging
* ultra-short interval logging
* suspicious repetitive patterns

It should remain near 1.0 when:

* the user completes varied, meaningful work
* effort levels are believable
* logs are naturally distributed through the day/week

---

## 4.5 Final XP formula

```text
xp_awarded = base_xp * difficulty_multiplier * consistency_multiplier * integrity_factor
```

Round final XP to nearest integer.

---

## 5. Attribute Gain Calibration

XP is not enough. Attribute changes must also be calibrated.

## 5.1 Base attribute gain by effort layer

| Effort Layer | Base Attribute Gain |
| ------------ | ------------------: |
| Micro        |                 1.5 |
| Structured   |                 3.0 |
| Dungeon      |                 6.0 |
| Raid         |                10.0 |

This is the pre-weighted gain before distributing across attributes.

---

## 5.2 Attribute distribution rule

If a task affects one attribute:

* full gain goes to that attribute

If a task affects multiple attributes:

* distribute based on weights
* sum of weights should normalize to 1.0

### Example

Quest affects:

* Focus: 0.7
* Mastery: 0.3

If total gain = 3.0:

* Focus gets 2.1
* Mastery gets 0.9

---

## 5.3 Daily attribute cap

Maximum gain per attribute per day:

```text
max_attribute_gain_per_day = 8.0
```

This prevents unrealistic spikes.

A user should not jump one full life dimension in a single day.

---

## 5.4 Rank-based attribute cap

| Rank | Attribute Cap |
| ---- | ------------: |
| E    |            30 |
| D    |            45 |
| C    |            60 |
| B    |            75 |
| A    |            90 |
| S    |           100 |

Even if gains are awarded, they must not exceed the current rank cap.

---

## 6. Daily XP Expectations

## 6.1 Weak day

A weak but not empty day might include:

* 2 micro actions, low-medium quality

Expected XP range:

* 10 to 18 XP

Interpretation:

* user stays alive in the system
* no strong growth
* streak may or may not count depending on valid-day rules

---

## 6.2 Decent day

A decent real day might include:

* 3 meaningful micro actions
* 1 medium completion
* no gaming

Expected XP range:

* 28 to 45 XP

Interpretation:

* clear visible movement
* feels rewarding
* should represent honest showing up

---

## 6.3 Strong day

A strong day might include:

* 3 to 5 meaningful actions
* one or two medium/high intensity completions
* maybe one event completion

Expected XP range:

* 45 to 70 XP

Interpretation:

* strong progression
* should feel notable
* should not be common every day

---

## 6.4 Extreme day

A very strong day with dungeon completion or major progress.

Expected XP range:

* 70 to 120 XP

This should be rare.

Daily hard cap remains:

```text
xp_daily_cap = 120
```

---

## 7. Valid Day Rule Calibration

A day counts as a valid streak day if all of these are true:

1. at least 3 meaningful completions
2. total XP for the day is at least 18
3. not more than 40% of the day’s XP came from low-difficulty micro actions

This is important.

It prevents:

* fake streak preservation through tiny taps
* trivial low-effort “keep the streak alive” behavior

---

## 8. Weekly XP Expectations

## 8.1 Weak week

Mostly inconsistent, some showing up.

Expected XP:

* 80 to 140

Result:

* slow movement
* likely no strong rank push

---

## 8.2 Solid week

User participates honestly and does not overgame.

Expected XP:

* 180 to 260

Result:

* visible progress
* meaningful stat movement
* possibility of structured reward and streak bonuses

---

## 8.3 Strong week

User performs well, likely completes one dungeon or strong structured efforts.

Expected XP:

* 260 to 420

Result:

* strong movement
* meaningful rank preparation

---

## 8.4 Exceptional week

Includes major completion and disciplined execution.

Expected XP:

* 420 to 650

This should be uncommon.

---

## 9. Rank Pacing Calibration

## 9.1 Rank thresholds

| Rank | XP Threshold |
| ---- | -----------: |
| E    |            0 |
| D    |          500 |
| C    |         1500 |
| B    |         4000 |
| A    |         9000 |
| S    |        20000 |

These numbers imply:

### E → D

* achievable in roughly 2 to 3 solid weeks
* early momentum matters

### D → C

* requires sustained effort
* roughly 1 to 2 months depending on consistency and raid completion

### C → B

* serious engagement
* should feel like a real mid-stage identity shift

### B → A

* long-term grind
* only strong users should reach this

### A → S

* rare
* not an early product concern

---

## 9.2 Minimum attribute floor by rank

| Rank | Minimum Required per Attribute |
| ---- | -----------------------------: |
| D    |                             15 |
| C    |                             25 |
| B    |                             40 |
| A    |                             60 |
| S    |                             80 |

This ensures the system cannot be brute-forced by only one dimension.

The user must become more balanced over time.

---

## 9.3 Required raids by rank

| Rank | Required Raids |
| ---- | -------------: |
| D    |              1 |
| C    |              2 |
| B    |              3 |
| A    |              5 |
| S    |              8 |

Reason:
major identity progression should require major action.

---

## 9.4 Required streak by rank

| Rank | Required Streak |
| ---- | --------------: |
| D    |          5 days |
| C    |         10 days |
| B    |         14 days |
| A    |         21 days |
| S    |         30 days |

This makes rank progression reflect:

* effort
* consistency
* meaningful outcomes

Not just accumulated taps.

---

## 10. Streak Bonus Calibration

## 10.1 Milestone bonuses

| Streak  | Bonus XP |
| ------- | -------: |
| 3 days  |       10 |
| 7 days  |       25 |
| 14 days |       60 |
| 30 days |      150 |

These numbers are large enough to feel good but not large enough to break the system.

---

## 10.2 Why streak bonuses must stay bounded

If streak bonuses become too large:

* users chase streak preservation at all cost
* behavior becomes fake
* system encourages shallow logging

The streak should be a multiplier and bonus, not the whole game.

---

## 11. Diminishing Returns Calibration

## 11.1 Identical action repeat rule

For identical actions repeated beyond intended use:

```text
repeat_penalty_multiplier = 0.7 ^ n
```

Where:

* first instance beyond natural expectation gets multiplied by 0.7
* next by 0.49
* next by 0.343

This kills spam quickly.

---

## 11.2 Low-difficulty contribution cap

Low-difficulty actions may contribute at most:

```text
40% of daily XP
```

This is one of the most important balancing rules in the entire system.

Without it, users will farm trivial actions.

---

## 11.3 Cooldown windows

| Action Type | Cooldown |
| ----------- | -------: |
| Micro       |  2 hours |
| Structured  |  6 hours |

Cooldown prevents unrealistic rapid stacking.

Cooldown does not mean the user cannot do the action in real life.
It means the system will not reward obvious spam repetition.

---

## 12. Attribute Weight Calibration Examples

## 12.1 Gym session

Type:

* Micro or Structured depending on framing

Attributes:

* Strength: 0.8
* Focus: 0.2

Reason:
physical training strengthens both body and discipline

---

## 12.2 Deep work block

Attributes:

* Focus: 0.7
* Wealth or Mastery: 0.3 depending on context

Reason:
deep work improves execution first, outcome second

---

## 12.3 Bhagavad Gita reading with reflection

Attributes:

* Wisdom: 0.8
* Focus: 0.2

If no reflection is included:

* lower base classification or lower gain

Reason:
wisdom should require engagement, not page counting alone

---

## 12.4 ML learning session

Attributes:

* Mastery: 0.75
* Focus: 0.25

---

## 12.5 Meaningful relationship effort

Attributes:

* Bond: 0.8
* Wisdom: 0.2

Reason:
healthy relationships require presence and judgment, not just activity

---

## 13. Practical Scoring Examples

## 13.1 Example A — decent gym quest

Quest:

* complete gym session
* micro
* medium difficulty
* 5-day streak
* integrity = 1.0

Formula:

```text
xp = 6 * 1.5 * 1.10 * 1.0 = 9.9 ≈ 10 XP
```

Attribute gain:

```text
base gain = 1.5
strength = 1.2
focus = 0.3
```

This is good. Helpful, but not broken.

---

## 13.2 Example B — deep work structured completion

Quest:

* complete 3 deep work blocks in a day or finish weekly work target
* structured
* high difficulty
* 8-day streak
* integrity = 1.0

Formula:

```text
xp = 16 * 2.2 * 1.16 * 1.0 = 40.8 ≈ 41 XP
```

This is appropriately meaningful.

---

## 13.3 Example C — spammed micro action

Quest:

* repeated tiny low-effort logging
* micro
* low difficulty
* streak 6 days
* integrity = 0.6

Formula:

```text
xp = 6 * 1.0 * 1.12 * 0.6 = 4.032 ≈ 4 XP
```

This is weak by design.

---

## 13.4 Example D — dungeon completion

Dungeon:

* 5-day nutrition lock
* dungeon
* medium difficulty
* streak 10
* integrity 1.0

Formula:

```text
xp = 40 * 1.5 * 1.20 * 1.0 = 72 XP
```

This should feel significant.

Attribute gain:

```text
base gain = 6.0
strength = 4.8
focus = 1.2
```

---

## 13.5 Example E — raid completion

Raid:

* ship MVP milestone
* raid
* high difficulty
* streak 12
* integrity 1.0

Formula:

```text
xp = 100 * 2.2 * 1.24 * 1.0 = 272.8
```

This exceeds normal daily flow.

For raid balance, final XP should be capped by one of these approaches:

* hard cap per raid
* reward band by raid tier
* normalized raid multiplier

### Recommended rule

For raids, apply capped reward band:

* minor raid: 90 to 140 XP
* standard raid: 140 to 220 XP
* major raid: 220 to 320 XP

This keeps raids powerful but controllable.

---

## 14. Recommended Raid Reward Bands

| Raid Tier | XP Range | Base Attribute Gain |
| --------- | -------: | ------------------: |
| Minor     |   90–140 |                   8 |
| Standard  |  140–220 |                  10 |
| Major     |  220–320 |                  12 |

Not all raids should be equal.

A “ship one feature” raid should not equal “complete full MVP launch.”

---

## 15. Calibration Recommendations for MVP

For MVP, use conservative numbers.

### Recommended initial settings

* Micro base XP = 6
* Structured base XP = 16
* Dungeon base XP = 40
* Raid reward via tier band, not raw formula only
* Daily XP cap = 120
* Daily attribute cap = 8
* valid day threshold = 18 XP and 3 meaningful completions
* low-difficulty daily XP contribution cap = 40%

This will make the first version safer.

---

## 16. What to Monitor During Live Testing

Once the system is used, monitor:

1. average XP per day
2. average valid days per week
3. time to first rank-up
4. which quests are over-rewarded
5. whether users spam low-effort actions
6. whether dungeons feel worth doing
7. whether raids feel too rare or too cheap
8. whether any attribute grows much faster than others

---

## 17. Failure Conditions

The calibration is wrong if any of these happen:

### Too easy

* users rank up in under one week
* users can preserve streak with trivial taps
* micro actions dominate progression

### Too hard

* users cannot feel progress in a decent week
* rank-ups feel impossible
* strong days feel unrewarding

### Too noisy

* users cannot understand why they got rewards
* reward variation feels random
* same effort produces inconsistent outcomes without explanation

---

## 18. Final Calibration Philosophy

The system should reward:

* consistency
* meaningful effort
* balance
* completion
* milestone achievements

The system should resist:

* repetition spam
* shallow logging
* fake streak behavior
* single-domain brute force

The user should feel:

* daily motion from honest effort
* strong weekly movement from consistency
* identity shift from major milestones
* long-term depth from rank progression
