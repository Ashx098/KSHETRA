# KSHETRA — Structured Build Phases (v1)

## Purpose

This document defines the phased implementation plan for Kshetra.

It is designed for:

* bounded AI-assisted building
* human review after each phase
* minimal scope confusion
* progressive validation

Each phase has:

* goal
* included scope
* excluded scope
* required docs
* deliverables
* review checklist
* exit criteria

The agent must only work on one phase at a time.

---

## Phase 0 — Workspace and Foundation

### Goal

Set up the codebase cleanly so future phases can be built without rework.

### Included

* project structure
* package setup
* frontend app shell
* backend app shell
* database connection setup
* environment config
* base type definitions
* base design token scaffold

### Excluded

* real scoring logic
* real quest generation
* real radar implementation
* notifications
* AI integration

### Required docs

* Database Schema and API Specification
* Frontend and App Architecture Specification
* UI Wireframe and Screen Structure Specification

### Deliverables

* running frontend
* running backend
* database connected
* initial route structure
* initial page placeholders
* shared constants/types scaffold

### Review checklist

* repo structure clean?
* frontend and backend boot correctly?
* DB connectivity works?
* folders/components are not messy?
* no premature overengineering?

### Exit criteria

* app runs locally
* backend runs locally
* DB migrations possible
* route skeleton exists

---

## Phase 1 — Core User and Progression State

### Goal

Implement the minimum persistent state needed for a user to exist in the system.

### Included

* users
* profiles
* goals
* attributes
* streak state
* progression summary endpoint
* onboarding flow
* seed attribute setup

### Excluded

* quest completion scoring
* dungeons
* raids
* AI planning
* notifications

### Required docs

* System Specification
* Database Schema and API Specification
* Core Mechanics Specification

### Deliverables

* onboarding API
* profile fetch/update API
* goals CRUD
* attributes fetch API
* progression summary API
* basic onboarding UI
* profile UI basics

### Review checklist

* does a new user get correct starting state?
* are six attributes seeded properly?
* are profile and goals editable?
* is progression summary sane?
* are migrations clean?

### Exit criteria

* a user can onboard
* a user can view profile/goals/attributes
* no fake logic beyond defined scope

---

## Phase 2 — Quest System MVP

### Goal

Build the daily quest loop without AI.

### Included

* quest templates seed
* quest instances
* daily quests fetch
* quest completion
* quest logging
* deterministic reward application
* XP ledger updates
* attribute history updates

### Excluded

* AI-generated quests
* dungeons
* raids
* advanced event system
* notifications

### Required docs

* Core Mechanics Specification
* Scoring Calibration Specification
* Quest Template Library
* Database Schema and API Specification
* UI Wireframe and Screen Structure Specification

### Deliverables

* quest tables and seed data
* quest fetch API
* quest complete API
* XP and attribute update services
* mandatory/optional/stretch grouping
* Home screen quest cards
* completion modal
* reward feedback UI

### Review checklist

* does quest completion update XP correctly?
* are attribute deltas logged?
* is daily logging fast?
* are quest cards clear?
* can the system be trivially gamed already?

### Exit criteria

* a user can complete daily quests end-to-end
* XP and attribute movement are visible
* logging flow feels light

---

## Phase 3 — Streaks and Progress Screen

### Goal

Make the system feel alive by showing history and streak state.

### Included

* valid-day logic
* streak calculation
* streak milestone bonuses
* progress screen
* attribute cards
* XP/rank progress UI
* simple history timeline

### Excluded

* AI
* dungeons
* raids
* notifications

### Required docs

* Core Mechanics Specification
* Scoring Calibration Specification
* UI Wireframe and Screen Structure Specification
* Frontend and App Architecture Specification
* Real-Life Simulation and Validation Notes

### Deliverables

* streak recompute logic
* streak API
* progress history endpoint
* progress screen UI
* milestone ledger view
* basic rank progress visualization

### Review checklist

* does valid-day logic feel fair?
* do streaks break/reset correctly?
* does progress screen actually feel motivating?
* are weak/strong days distinguishable?

### Exit criteria

* daily quest loop + streak loop both work
* user can see meaningful progress over time

---

## Phase 4 — Radar / Signature Visual System

### Goal

Implement Kshetra’s signature stat visualization properly.

### Included

* custom radar chart
* current stat polygon
* cap ring
* changed-stat pulse
* optional previous snapshot overlay
* radar integration on Home and Progress

### Excluded

* full rank-up cinematic
* advanced animation overload
* dungeons/raids
* AI

### Required docs

* Frontend and App Architecture Specification
* UI Wireframe and Screen Structure Specification

### Deliverables

* custom radar component
* responsive radar behavior
* animated stat transitions
* attribute detail interaction

### Review checklist

* does it look premium?
* does it feel readable on mobile?
* does it feel like the signature of the product?
* is it smooth, not gimmicky?

### Exit criteria

* radar is good enough to keep
* no generic chart-library look remains

---

## Phase 5 — AI Quest Planner (Constrained)

### Goal

Add AI only where it improves personalization without owning system truth.

### Included

* AI input builder
* AI output schema validation
* daily quest generation via AI
* fallback to template-based generation
* AI generation audit storage

### Excluded

* AI scoring
* AI direct state mutation
* advanced narrative modes
* aggressive event generation

### Required docs

* AI Architect Specification
* Quest Template Library
* Database Schema and API Specification
* Real-Life Simulation and Validation Notes

### Deliverables

* AI planner service
* JSON schema validation
* accepted/rejected generation storage
* daily AI-generated quest route
* admin/debug visibility for AI outputs

### Review checklist

* are generated quests realistic?
* are they constrained?
* does the fallback work?
* does AI stay inside allowed behavior?

### Exit criteria

* AI improves daily quest quality without destabilizing system

---

## Phase 6 — Events and Recovery UX

### Goal

Make the system adaptive on messy days.

### Included

* mystery event triggers
* rescue events
* active event strip
* event completion flow
* event scheduling basics

### Excluded

* advanced notification system
* dungeons/raids if not already ready
* social features

### Required docs

* AI Architect Specification
* Quest Template Library
* UI Wireframe and Screen Structure Specification
* Real-Life Simulation and Validation Notes

### Deliverables

* event logic service
* event UI card/modal
* save-day event flow
* time-window enforcement

### Review checklist

* do events feel useful, not annoying?
* can they help recover a bad day?
* are they rare enough?

### Exit criteria

* recovery UX works
* event system feels alive but controlled

---

## Phase 7 — Dungeons

### Goal

Add short challenge arcs that create stronger weekly momentum.

### Included

* dungeon persistence
* dungeon objectives
* dungeon progress tracking
* dungeon completion rewards
* dungeon cards/UI

### Excluded

* raids
* social layers

### Required docs

* Core Mechanics Specification
* Scoring Calibration Specification
* Quest Template Library
* Database Schema and API Specification
* UI Wireframe and Screen Structure Specification

### Deliverables

* dungeon APIs
* dungeon UI
* objective tracking
* reward application

### Review checklist

* do dungeons feel heavier than quests?
* are they worth doing?
* do they create meaningful medium-term momentum?

### Exit criteria

* one full dungeon flow works end-to-end

---

## Phase 8 — Raids and Rank Significance

### Goal

Add major milestone arcs and make ranks feel earned.

### Included

* raid persistence
* raid objectives
* verification summary flow
* raid completion logic
* rank-up gate checks
* rank-up overlay

### Excluded

* social layers
* advanced guild mechanics

### Required docs

* Core Mechanics Specification
* Scoring Calibration Specification
* Quest Template Library
* Database Schema and API Specification
* UI Wireframe and Screen Structure Specification

### Deliverables

* raid APIs
* raid UI
* summary/artifact submission flow
* rank-up UI moment
* deterministic rank check service

### Review checklist

* do raids feel significant?
* does rank-up feel earned?
* can raids be abused?
* is the rank-up moment strong but tasteful?

### Exit criteria

* one meaningful raid flow works
* rank-up can happen correctly and visibly

---

## Phase 9 — Notifications and Daily Re-entry

### Goal

Improve retention and re-entry.

### Included

* notification scheduling
* streak-risk alerts
* daily quest-ready alerts
* event alerts
* notification preferences UI

### Excluded

* social/guild systems
* complex native integrations

### Required docs

* Database Schema and API Specification
* UI Wireframe and Screen Structure Specification
* Real-Life Simulation and Validation Notes

### Deliverables

* notification scheduling job
* notification persistence
* basic delivery channel integration
* settings UI

### Review checklist

* do notifications help rather than irritate?
* are they too frequent?
* do they improve re-entry?

### Exit criteria

* user can leave and return cleanly through notification prompts

---

## Phase 10 — Polish and Validation Pass

### Goal

Tighten the product before broader use.

### Included

* bug fixing
* balancing adjustments
* visual refinement
* performance cleanup
* friction reduction
* final usability review

### Excluded

* major new features

### Required docs

* Real-Life Simulation and Validation Notes
* all prior docs as needed

### Deliverables

* cleaned MVP
* reviewed progression pacing
* reviewed logging friction
* reviewed AI behavior
* reviewed UI quality

### Review checklist

* would a real person use this daily?
* is anything still fake-feeling or heavy?
* does the system feel premium and structured?

### Exit criteria

* stable MVP worth real personal use
