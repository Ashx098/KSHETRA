# KSHETRA Future Plan

This document collects the current forward plan after the core MVP, structured systems, AI planner, notifications, and companion guide are in place. It is a working product roadmap, not a commitment to ship every item immediately.

## Product Direction

KSHETRA should keep moving toward a clear target:

- daily life as a grounded progression game
- backend-authoritative systems
- AI used for constrained selection, explanation, and framing only
- auditable rewards, progression, and state transitions
- high clarity, low friction, and enough novelty to sustain re-entry

The system should feel alive without becoming noisy, manipulative, or easy to exploit.

## Current Principles

- XP, attributes, streaks, valid days, events, dungeons, and raids stay backend-authoritative
- the frontend stays presentation-first and must not invent gameplay logic
- AI may explain and select within approved boundaries, but must not mutate state or invent mechanics
- every reward path should remain traceable through ledgers and history tables
- novelty should come from constrained content variety, not randomness or hidden scoring

## Immediate Product Priorities

### 1. Companion polish

The companion now exists across Home, Missions, Progress, and Profile. The next polish layers are:

- refine motion timing for popup entrance, dock idle movement, and ask response reveal
- tighten copy cadence so Kael feels sharp, not chatty
- add more deterministic fallback lines for moments where AI is unavailable
- improve milestone choreography:
  - quest completion
  - event completion
  - dungeon completion
  - raid completion
  - level up
  - streak milestone
  - stat threshold milestones at `10`, `20`, `30`
- add stronger contextual phrasing for:
  - daily risk
  - day secured
  - raid verification ready
  - mission focus

Longer-term companion ideas, only if the current version proves valuable:

- subtle portrait parallax
- multi-state expression variants per art asset
- sound design for milestone moments
- more expressive but still bounded guide persona writing
- tutorial mode using the companion as first-run onboarding

### 2. Home clarity

Home should keep answering one question: `What should I do next?`

Further refinement backlog:

- keep the quest stack dominant over secondary surfaces
- maintain only one strong reward-feedback moment at a time
- avoid stacking event, notification, and companion pressure all equally
- keep the live timed-event banner useful without overpowering the daily loop
- add more visible "today is still recoverable" framing when the day is at risk

### 3. Missions usability

Missions is already the strongest structural screen. Future improvements should focus on:

- making progress logging feel near-instant
- keeping raid verification serious but not tedious
- improving the hierarchy between active dungeon and active raid
- making blockers feel intentional:
  - no active dungeon
  - no active raid
  - raid not ready for verification
  - minimum duration not reached

### 4. Progress usefulness

Progress should keep moving from data display toward usable interpretation.

Backlog:

- expand deterministic insight summaries
- improve short-term trend framing
- explain major changes in plain language
- better show how current state connects to active dungeon or raid arcs

## Content Expansion Plan

### Daily quest variety

The quest library was expanded, but this needs continuous tuning from real usage.

Focus areas:

- tune repetition avoidance using recent template history
- watch underused attributes:
  - Bond
  - Strength
  - Wisdom
- expand quest phrasing and thematic framing without changing deterministic rewards
- improve goal-tag usefulness so goals visibly shape selection over time

Possible future template categories:

- recovery and reset
- discipline and environment control
- relationships and repair
- creation and shipping
- deep focus and restraint
- spiritual or reflective grounding

### Dungeons

Dungeons should become more thematic, not more complex.

Future work:

- add more distinct multi-day arcs
- improve objective identity so dungeons feel less like reskinned counters
- align dungeon themes more strongly with attribute emphasis
- allow better framing around "why this dungeon matters now"

### Raids

Raids should stay rare and heavy.

Future work:

- improve completion ceremony without adding bloated cinematics
- tighten verification UX
- make raid significance more visible in Progress and rank framing
- add more major-arc templates, but keep active-raid limits strict

## AI Roadmap

### Quest planner

The planner is now working with `glm-latest`, strict JSON, retries, and stronger guardrails.

Future hardening:

- monitor acceptance rate vs fallback rate
- tune selection weights against real repetition data
- keep prompt strict around:
  - no invented templates
  - no invented rewards
  - no manipulative framing
  - no overload of safe templates
- keep model switching easy through env config only

### Guide AI

Guide AI should remain helpful, bounded, and low-ego.

Future hardening:

- expand glossary/context coverage
- increase deterministic fallback coverage
- add better answer shaping for:
  - "how many levels left?"
  - "why did this show up?"
  - "what should I focus on?"
  - "what does this field mean?"
- maintain strict JSON validation and rejection paths

### Non-goals for AI

AI should not gain control over:

- XP changes
- attribute deltas
- valid-day calculation
- streak logic
- rank gating
- event trigger authority
- dungeon or raid completion authority

## Retention and Re-entry

The target is compelling re-entry, not manipulation.

Healthy retention hooks to refine:

- daily ready clarity
- streak-risk framing
- bounded recovery events
- visible improvement through radar, trends, and insights
- stronger completion feedback moments
- better day-close and next-day re-entry language

Avoid:

- spammy alerts
- guilt-heavy copy
- too many simultaneous priorities
- hidden reward multipliers
- casino-like mechanics

## Auditing and Anti-Abuse

These should keep growing as the system gets richer.

Future operational tools:

- internal recompute checks for user progression
- template frequency and coverage diagnostics
- AI acceptance and rejection reporting
- event trigger frequency reporting
- dungeon and raid adoption/completion reporting

Maintain hard rules:

- no duplicate reward paths
- no duplicate active event/dungeon/raid state where not allowed
- no silent frontend-derived state mutation
- no loophole for same-day quest regeneration or objective over-logging

## Future UX Backlog

Candidate polish items:

- better mobile layouts for companion + event banner coexistence
- stronger reward card animations
- slightly richer radar milestone pulses
- visual distinction between "informational guide state" and "urgent guide state"
- cleaner empty states across all screens
- softer onboarding into dungeons and raids

## Deferred Systems

These are intentionally not active priorities right now:

- social or guild systems
- leaderboards
- advanced notification delivery channels
- AI-generated progression mechanics
- advanced narrative branching
- large cinematic systems
- economy/currency layers

## Operating Rule

Before adding a new major mechanic, first ask:

1. Does this reduce friction or increase it?
2. Does this strengthen action or just add more information?
3. Can it stay deterministic and auditable?
4. Can the frontend remain non-authoritative?
5. Will it still feel grounded after a week of real use?

If the answer is unclear, prefer polishing the current layers before expanding scope further.
