# KSHETRA — Quest Template Library (v1)

## 1. Purpose

This document defines the concrete quest templates used by Kshetra.

It exists to:

* ground the system in realistic tasks
* constrain AI generation
* standardize scoring inputs
* reduce vague or low-quality quest design
* make implementation deterministic and expandable

This document covers:

* daily quest templates
* weekly quest templates
* event quest templates
* dungeon templates
* raid templates
* attribute mappings
* suggested difficulty and effort layer classifications

This document does not define final scoring formulas. It defines the catalog of allowed quest structures.

---

## 2. Template Design Rules

All templates must satisfy these constraints:

### 2.1 Real-world clarity

A quest must be understandable in one read.

### 2.2 Low logging burden

A quest should be completable with:

* one tap
* optional intensity
* optional note only when needed

### 2.3 Observable intent

The user should clearly understand what “done” means.

### 2.4 No shallow spam templates

Templates must not reward trivial activity that is easy to fake repeatedly.

### 2.5 Human realism

Quests must match how real life works:

* people have jobs
* people get tired
* relationships are nuanced
* wisdom is not page farming
* fitness is not constant maximum effort

---

## 3. Quest Taxonomy

Quest templates are organized into:

1. Daily quests
2. Weekly quests
3. Event quests
4. Dungeon templates
5. Raid templates

Effort layers:

* Micro
* Structured
* Dungeon
* Raid

Difficulty levels:

* Low
* Medium
* High

---

## 4. Attribute Reference

Available attributes:

* Strength
* Wisdom
* Focus
* Mastery
* Wealth
* Bond

Weight distributions below should sum to 1.0 where possible.

---

## 5. Daily Quest Templates

## 5.1 Strength daily quests

### S-D-01 — Complete Workout Session

* Type: Daily
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Strength: 0.8
  * Focus: 0.2
* Completion rule:

  * user completes planned workout session
* Logging:

  * complete
  * optional intensity
* Notes:

  * can represent gym, home workout, sport, or structured physical training

---

### S-D-02 — Hit Daily Movement Goal

* Type: Daily
* Effort Layer: Micro
* Difficulty: Low
* Attributes:

  * Strength: 0.7
  * Focus: 0.3
* Completion rule:

  * user hits intended walking or movement goal for the day
* Notes:

  * should not be over-rewarded
  * best used as support quest, not core progression driver

---

### S-D-03 — Stay on Nutrition Plan Today

* Type: Daily
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Strength: 0.7
  * Focus: 0.3
* Completion rule:

  * user stayed aligned with planned nutrition for the day
* Notes:

  * not macro-perfect policing
  * should reflect adherence, not obsessive detail

---

### S-D-04 — Recovery Discipline Maintained

* Type: Daily
* Effort Layer: Micro
* Difficulty: Low
* Attributes:

  * Strength: 0.5
  * Wisdom: 0.1
  * Focus: 0.4
* Completion rule:

  * user followed one deliberate recovery behavior
  * examples: stretching, sleep preparation, mobility, rest compliance

---

## 5.2 Wisdom daily quests

### W-D-01 — Read and Reflect

* Type: Daily
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Wisdom: 0.8
  * Focus: 0.2
* Completion rule:

  * user reads a meaningful passage and reflects on it
* Notes:

  * reflection is required for full validity
  * without reflection, the quest should either not appear or count as weaker variant

---

### W-D-02 — Quiet Reflection Session

* Type: Daily
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Wisdom: 0.7
  * Focus: 0.3
* Completion rule:

  * user completes a short reflective or stillness practice
* Notes:

  * could include journaling, meditation, or philosophical reflection

---

### W-D-03 — Apply One Guiding Principle Today

* Type: Daily
* Effort Layer: Micro
* Difficulty: High
* Attributes:

  * Wisdom: 0.7
  * Bond: 0.2
  * Focus: 0.1
* Completion rule:

  * user intentionally applies one chosen principle in real behavior
* Notes:

  * stronger than passive reading
  * should be used less frequently

---

## 5.3 Focus daily quests

### F-D-01 — Complete One Deep Work Block

* Type: Daily
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Focus: 0.7
  * Mastery: 0.2
  * Wealth: 0.1
* Completion rule:

  * user completes one uninterrupted deep work block
* Notes:

  * exact duration can be configured system-wide

---

### F-D-02 — Win the First Work Block of the Day

* Type: Daily
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Focus: 0.8
  * Wisdom: 0.2
* Completion rule:

  * user starts the day with a deliberate focused block before distraction spiral
* Notes:

  * useful for momentum recovery

---

### F-D-03 — Protect Attention Window

* Type: Daily
* Effort Layer: Micro
* Difficulty: High
* Attributes:

  * Focus: 0.8
  * Wisdom: 0.2
* Completion rule:

  * user completes a distraction-controlled window
* Notes:

  * should appear when the system detects slipping attention patterns

---

## 5.4 Mastery daily quests

### M-D-01 — Technical Learning Session

* Type: Daily
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Mastery: 0.75
  * Focus: 0.25
* Completion rule:

  * user completes one focused learning session in a relevant domain

---

### M-D-02 — Build or Implement One Concept

* Type: Daily
* Effort Layer: Micro
* Difficulty: High
* Attributes:

  * Mastery: 0.7
  * Focus: 0.2
  * Wealth: 0.1
* Completion rule:

  * user turns a concept into practice or code
* Notes:

  * more valuable than passive learning

---

### M-D-03 — Review and Consolidate Notes

* Type: Daily
* Effort Layer: Micro
* Difficulty: Low
* Attributes:

  * Mastery: 0.6
  * Wisdom: 0.1
  * Focus: 0.3
* Completion rule:

  * user reviews prior learning and extracts one usable takeaway

---

## 5.5 Wealth daily quests

### WE-D-01 — Meaningful Project Progress

* Type: Daily
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Wealth: 0.6
  * Focus: 0.2
  * Mastery: 0.2
* Completion rule:

  * user completes one meaningful unit of project or career progress

---

### WE-D-02 — Finish One High-Value Task

* Type: Daily
* Effort Layer: Micro
* Difficulty: High
* Attributes:

  * Wealth: 0.7
  * Focus: 0.3
* Completion rule:

  * user finishes a materially important task tied to work, product, or leverage

---

### WE-D-03 — Reduce One Bottleneck

* Type: Daily
* Effort Layer: Micro
* Difficulty: High
* Attributes:

  * Wealth: 0.5
  * Focus: 0.2
  * Mastery: 0.3
* Completion rule:

  * user resolves one blocker or bottleneck that unlocks future output

---

## 5.6 Bond daily quests

### B-D-01 — Meaningful Check-In

* Type: Daily
* Effort Layer: Micro
* Difficulty: Low
* Attributes:

  * Bond: 0.8
  * Wisdom: 0.2
* Completion rule:

  * user makes one genuine, present, meaningful check-in with someone important

---

### B-D-02 — Quality Presence

* Type: Daily
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Bond: 0.8
  * Focus: 0.1
  * Wisdom: 0.1
* Completion rule:

  * user gives undistracted presence during shared time

---

### B-D-03 — Repair or Support Action

* Type: Daily
* Effort Layer: Micro
* Difficulty: High
* Attributes:

  * Bond: 0.7
  * Wisdom: 0.3
* Completion rule:

  * user makes one mature supportive or repair-oriented move in a relationship
* Notes:

  * should be used carefully
  * not for forced emotional manipulation

---

## 6. Weekly Quest Templates

Weekly quests should reward pattern completion, not one-off taps.

## 6.1 Strength weekly quests

### S-W-01 — Complete Four Training Sessions

* Type: Weekly
* Effort Layer: Structured
* Difficulty: Medium
* Attributes:

  * Strength: 0.8
  * Focus: 0.2

---

### S-W-02 — Follow Nutrition Plan for Five Days

* Type: Weekly
* Effort Layer: Structured
* Difficulty: High
* Attributes:

  * Strength: 0.7
  * Focus: 0.3

---

### S-W-03 — Consistent Recovery Week

* Type: Weekly
* Effort Layer: Structured
* Difficulty: Medium
* Attributes:

  * Strength: 0.5
  * Focus: 0.3
  * Wisdom: 0.2

---

## 6.2 Wisdom weekly quests

### W-W-01 — Complete Four Read-and-Reflect Sessions

* Type: Weekly
* Effort Layer: Structured
* Difficulty: Medium
* Attributes:

  * Wisdom: 0.8
  * Focus: 0.2

---

### W-W-02 — Write Weekly Reflection

* Type: Weekly
* Effort Layer: Structured
* Difficulty: Medium
* Attributes:

  * Wisdom: 0.7
  * Focus: 0.2
  * Bond: 0.1

---

## 6.3 Focus weekly quests

### F-W-01 — Complete Five Deep Work Blocks

* Type: Weekly
* Effort Layer: Structured
* Difficulty: Medium
* Attributes:

  * Focus: 0.7
  * Wealth: 0.2
  * Mastery: 0.1

---

### F-W-02 — Protect Morning Momentum on Four Days

* Type: Weekly
* Effort Layer: Structured
* Difficulty: High
* Attributes:

  * Focus: 0.8
  * Wisdom: 0.2

---

## 6.4 Mastery weekly quests

### M-W-01 — Finish One Learning Module

* Type: Weekly
* Effort Layer: Structured
* Difficulty: High
* Attributes:

  * Mastery: 0.75
  * Focus: 0.15
  * Wealth: 0.10

---

### M-W-02 — Implement One Learned Concept

* Type: Weekly
* Effort Layer: Structured
* Difficulty: High
* Attributes:

  * Mastery: 0.7
  * Wealth: 0.2
  * Focus: 0.1

---

## 6.5 Wealth weekly quests

### WE-W-01 — Complete One High-Value Work Milestone

* Type: Weekly
* Effort Layer: Structured
* Difficulty: High
* Attributes:

  * Wealth: 0.7
  * Focus: 0.2
  * Mastery: 0.1

---

### WE-W-02 — Advance One Long-Term Project

* Type: Weekly
* Effort Layer: Structured
* Difficulty: Medium
* Attributes:

  * Wealth: 0.6
  * Mastery: 0.2
  * Focus: 0.2

---

## 6.6 Bond weekly quests

### B-W-01 — Plan and Show Up Intentionally

* Type: Weekly
* Effort Layer: Structured
* Difficulty: Medium
* Attributes:

  * Bond: 0.8
  * Wisdom: 0.2

---

### B-W-02 — Give One Strong Support Action This Week

* Type: Weekly
* Effort Layer: Structured
* Difficulty: High
* Attributes:

  * Bond: 0.7
  * Wisdom: 0.3

---

## 7. Event Quest Templates

Event quests are time-bound, limited, contextual opportunities.

They should feel alive but not random nonsense.

## 7.1 Momentum rescue events

### E-R-01 — Save the Day

* Type: Event
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Focus: 0.6
  * Strength: 0.2
  * Wisdom: 0.2
* Completion rule:

  * complete one meaningful quest within a short rescue window
* Usage:

  * when user is close to losing a valid day

---

### E-R-02 — Hidden Focus Window

* Type: Event
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Focus: 0.8
  * Wealth: 0.2
* Completion rule:

  * complete one focused block in next short time window

---

## 7.2 Strength events

### E-S-01 — Quick Physical Reset

* Type: Event
* Effort Layer: Micro
* Difficulty: Low
* Attributes:

  * Strength: 0.7
  * Focus: 0.3
* Completion rule:

  * complete short movement or reset session in limited time

---

## 7.3 Wisdom events

### E-W-01 — Reflection Key

* Type: Event
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Wisdom: 0.8
  * Focus: 0.2
* Completion rule:

  * read and reflect within event window

---

## 7.4 Bond events

### E-B-01 — Presence Opportunity

* Type: Event
* Effort Layer: Micro
* Difficulty: Medium
* Attributes:

  * Bond: 0.8
  * Wisdom: 0.2
* Completion rule:

  * complete one thoughtful connection act before deadline

---

## 8. Dungeon Templates

Dungeons are short, bounded, higher-impact challenges.

## 8.1 Strength dungeons

### D-S-01 — Five-Day Nutrition Lock

* Type: Dungeon
* Duration: 5 days
* Difficulty: Medium
* Attributes:

  * Strength: 0.8
  * Focus: 0.2
* Objective style:

  * one completion checkpoint per day

---

### D-S-02 — Seven-Day Movement Consistency

* Type: Dungeon
* Duration: 7 days
* Difficulty: Medium
* Attributes:

  * Strength: 0.7
  * Focus: 0.3

---

## 8.2 Wisdom dungeons

### D-W-01 — Seven-Day Read and Reflect Cycle

* Type: Dungeon
* Duration: 7 days
* Difficulty: Medium
* Attributes:

  * Wisdom: 0.8
  * Focus: 0.2

---

### D-W-02 — Silence and Reflection Sequence

* Type: Dungeon
* Duration: 5 days
* Difficulty: High
* Attributes:

  * Wisdom: 0.7
  * Focus: 0.3

---

## 8.3 Focus dungeons

### D-F-01 — Five-Day Focus Reset

* Type: Dungeon
* Duration: 5 days
* Difficulty: High
* Attributes:

  * Focus: 0.8
  * Wisdom: 0.2

---

### D-F-02 — Morning Discipline Streak

* Type: Dungeon
* Duration: 5 days
* Difficulty: High
* Attributes:

  * Focus: 0.7
  * Strength: 0.1
  * Wisdom: 0.2

---

## 8.4 Mastery dungeons

### D-M-01 — Finish One Technical Module

* Type: Dungeon
* Duration: 5 to 7 days
* Difficulty: High
* Attributes:

  * Mastery: 0.8
  * Focus: 0.2

---

### D-M-02 — Implement and Document One Concept

* Type: Dungeon
* Duration: 3 to 7 days
* Difficulty: High
* Attributes:

  * Mastery: 0.7
  * Wealth: 0.2
  * Focus: 0.1

---

## 8.5 Wealth dungeons

### D-WE-01 — Ship One Contained Deliverable

* Type: Dungeon
* Duration: 3 to 7 days
* Difficulty: High
* Attributes:

  * Wealth: 0.7
  * Focus: 0.2
  * Mastery: 0.1

---

### D-WE-02 — Remove One Major Bottleneck

* Type: Dungeon
* Duration: 2 to 5 days
* Difficulty: High
* Attributes:

  * Wealth: 0.6
  * Mastery: 0.25
  * Focus: 0.15

---

## 8.6 Bond dungeons

### D-B-01 — Seven-Day Presence Commitment

* Type: Dungeon
* Duration: 7 days
* Difficulty: Medium
* Attributes:

  * Bond: 0.8
  * Wisdom: 0.2

---

### D-B-02 — Repair and Reconnect Sequence

* Type: Dungeon
* Duration: 3 to 5 days
* Difficulty: High
* Attributes:

  * Bond: 0.7
  * Wisdom: 0.3

---

## 9. Raid Templates

Raids are major milestones. They must be rarer, heavier, and often require proof.

## 9.1 Strength raids

### R-S-01 — Complete 30-Day Fitness Consistency Cycle

* Type: Raid
* Difficulty: High
* Attributes:

  * Strength: 0.8
  * Focus: 0.2
* Verification:

  * summary required
* Notes:

  * this is not about perfection, it is about sustained commitment

---

## 9.2 Wisdom raids

### R-W-01 — Complete One Serious Wisdom Cycle

* Type: Raid
* Difficulty: High
* Attributes:

  * Wisdom: 0.8
  * Focus: 0.2
* Verification:

  * summary required
* Example:

  * complete structured reading plus applied reflection over a meaningful period

---

## 9.3 Focus raids

### R-F-01 — Rebuild Personal Discipline Baseline

* Type: Raid
* Difficulty: High
* Attributes:

  * Focus: 0.7
  * Wisdom: 0.2
  * Strength: 0.1
* Verification:

  * summary required
* Notes:

  * good for recovery arcs after prolonged drift

---

## 9.4 Mastery raids

### R-M-01 — Complete a Serious Technical Build

* Type: Raid
* Difficulty: High
* Attributes:

  * Mastery: 0.7
  * Wealth: 0.2
  * Focus: 0.1
* Verification:

  * summary required
  * optional artifact
* Example:

  * technical module, prototype, research implementation, advanced learning milestone

---

## 9.5 Wealth raids

### R-WE-01 — Ship MVP Milestone

* Type: Raid
* Difficulty: High
* Attributes:

  * Wealth: 0.6
  * Mastery: 0.2
  * Focus: 0.2
* Verification:

  * summary required
  * artifact recommended

---

### R-WE-02 — Complete a Career-Leverage Milestone

* Type: Raid
* Difficulty: High
* Attributes:

  * Wealth: 0.7
  * Focus: 0.2
  * Wisdom: 0.1
* Verification:

  * summary required
* Example:

  * portfolio, application package, promotion milestone, serious product step

---

## 9.6 Bond raids

### R-B-01 — Complete a Meaningful Relationship Restoration or Growth Arc

* Type: Raid
* Difficulty: High
* Attributes:

  * Bond: 0.7
  * Wisdom: 0.3
* Verification:

  * summary required
* Notes:

  * should be very carefully framed
  * never reduce relationships to manipulation or performative points

---

## 10. Templates That Should NOT Exist

The following kinds of templates should be disallowed:

### 10.1 Trivial tap farming

Examples:

* drank water
* stood up once
* sent one emoji
* opened book
* thought about task

### 10.2 Easily fake pseudo-discipline

Examples:

* “felt motivated”
* “wanted to focus”
* “planned to work”
* “watched educational content” without engagement

### 10.3 Relationship manipulation quests

Examples:

* send X number of texts
* make them miss you
* force emotional action for points

### 10.4 Spiritual shallowness quests

Examples:

* read one line for points
* chant without intention just to preserve streak

---

## 11. AI Usage Constraints for Templates

AI may:

* select from these templates
* adapt wording slightly
* personalize context
* choose urgency and ordering
* choose event timing

AI may not:

* invent entirely new categories without validation
* create harmful or manipulative quests
* assign impossible deadlines
* overload the user with too many high-difficulty tasks

---

## 12. Recommended MVP Template Subset

For MVP, do not launch the full library.

Start with:

* 8 to 12 daily templates
* 6 to 8 weekly templates
* 4 to 6 event templates
* 4 to 6 dungeon templates
* 3 to 5 raid templates

Recommended MVP daily core:

* Complete Workout Session
* Stay on Nutrition Plan Today
* Read and Reflect
* Complete One Deep Work Block
* Technical Learning Session
* Meaningful Project Progress
* Meaningful Check-In
* Quality Presence

Recommended MVP weekly core:

* Complete Four Training Sessions
* Follow Nutrition Plan for Five Days
* Complete Five Deep Work Blocks
* Finish One Learning Module
* Advance One Long-Term Project
* Plan and Show Up Intentionally

---

## 13. Future Expansion Rules

When adding new templates:

1. map to real behavior
2. define completion clearly
3. assign honest difficulty
4. restrict exploitability
5. define attribute weights
6. test against existing scoring balance

New templates should extend the system, not dilute it.

---

## 14. Final Principle

Quest templates are the behavioral grammar of Kshetra.

If they are weak:

* AI becomes noisy
* users game the system
* progression feels fake

If they are strong:

* AI stays grounded
* logging stays simple
* progression feels earned
* the system remains believable
