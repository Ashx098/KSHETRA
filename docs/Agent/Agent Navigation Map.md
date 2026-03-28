# KSHETRA — Agent Navigation Map (v1)

## Purpose

This document is the entry point for any AI agent or engineer working on Kshetra.

It tells the reader:

* what Kshetra is
* which docs exist
* when to read each doc
* which docs are authoritative for which decisions
* what to do when stuck or when conflicts appear

This document is not the full specification.
It is the map for navigating the specification set.

---

## 1. Reading Order

Read documents in this order:

1. System Specification
2. Core Mechanics Specification
3. Scoring Calibration Specification
4. Quest Template Library
5. Database Schema and API Specification
6. Frontend and App Architecture Specification
7. UI Wireframe and Screen Structure Specification
8. AI Architect Specification
9. Real-Life Simulation and Validation Notes

Do not skip directly to implementation before understanding the first four documents.

---

## 2. Document Roles

### A. Product Identity and System Meaning

Read:

* System Specification

Use when:

* understanding what Kshetra is
* understanding attributes, ranks, progression philosophy
* grounding implementation decisions in product intent

Authoritative for:

* domain concepts
* overall system purpose
* high-level model

---

### B. Deterministic Core Logic

Read:

* Core Mechanics Specification
* Scoring Calibration Specification

Use when:

* implementing scoring
* implementing rank progression
* implementing streak logic
* implementing anti-exploit behavior
* validating fairness

Authoritative for:

* XP logic
* attribute gain logic
* thresholds
* caps
* progression rules

If conflicts appear between intuition and docs, these docs win.

---

### C. Allowed Behavior Units

Read:

* Quest Template Library

Use when:

* generating quests
* building quest seed data
* constraining AI output
* deciding what kinds of tasks exist

Authoritative for:

* allowed quest categories
* allowed quest semantics
* attribute mappings
* examples of realistic tasks

The AI must not invent quests outside the spirit of this document without explicit review.

---

### D. Persistence and Service Interfaces

Read:

* Database Schema and API Specification

Use when:

* implementing database tables
* building backend routes
* creating service boundaries
* designing persistence logic

Authoritative for:

* schema
* ledgers
* endpoints
* service responsibilities

---

### E. Frontend Structure and UX

Read:

* Frontend and App Architecture Specification
* UI Wireframe and Screen Structure Specification

Use when:

* building pages
* building components
* deciding layout hierarchy
* implementing motion and radar behavior

Authoritative for:

* page structure
* component hierarchy
* navigation
* interaction placement
* responsive behavior

---

### F. AI Usage Constraints

Read:

* AI Architect Specification

Use when:

* designing AI prompt flows
* validating AI output
* deciding what AI may or may not do

Authoritative for:

* AI boundaries
* AI inputs and outputs
* safety and anti-chaos constraints

AI must never directly control progression logic.

---

### G. Realism and Validation

Read:

* Real-Life Simulation and Validation Notes

Use when:

* unsure whether a design is too heavy
* unsure whether a flow is realistic
* deciding whether a feature is usable in normal life
* testing retention assumptions

Authoritative for:

* realism
* usability pressure-testing
* behavioral validation

---

## 3. Rule of Authority

When multiple docs are involved, resolve conflicts in this priority order:

1. Core Mechanics Specification
2. Scoring Calibration Specification
3. Database Schema and API Specification
4. UI Wireframe and Screen Structure Specification
5. Frontend and App Architecture Specification
6. Quest Template Library
7. AI Architect Specification
8. Real-Life Simulation and Validation Notes
9. System Specification

Interpretation:

* deterministic logic beats presentation
* persistence and APIs must obey logic
* UI must obey logic and structure
* AI must operate inside the deterministic system

---

## 4. What to Do When Stuck

If stuck on a backend logic question:

* consult Core Mechanics
* then Scoring Calibration
* then Database/API docs

If stuck on quest meaning or realism:

* consult Quest Template Library
* then Real-Life Simulation notes

If stuck on layout or screen priority:

* consult UI Wireframe doc first
* then Frontend Architecture doc

If stuck on AI behavior:

* consult AI Architect doc
* do not guess
* do not let AI mutate system state directly

If still unclear:

* choose the simpler implementation that preserves:

  * fairness
  * low logging friction
  * deterministic progression
  * realistic use

---

## 5. Non-Negotiable Constraints

All agents must respect these constraints:

* progression is deterministic
* AI is advisory, not authoritative
* all XP changes go through a ledger
* all attribute changes go through history logging
* logging must remain low-friction
* quests must remain realistic
* the UI must not become a generic AI dashboard
* no feature should increase complexity unless it improves real usage

---

## 6. MVP Scope Reminder

The MVP is not the full product vision.

The MVP must prioritize:

* user onboarding
* core attributes
* daily quest generation
* quest completion
* XP updates
* attribute updates
* streaks
* rank progress
* home screen
* progress screen
* minimal profile/goals support

Dungeons, raids, advanced events, and deep AI behavior can be added later if needed.

---

## 7. Implementation Philosophy

Do not overbuild.

Build in phases.
Each phase must:

* compile
* run
* be testable
* be reviewable by a human
* preserve future extensibility

No phase should assume future phases already exist unless explicitly specified.

---

## 8. Handoff Rule

Before starting any phase:

* read the relevant docs for that phase only
* summarize the intended implementation in brief
* implement only the requested scope
* surface assumptions clearly
* stop after the requested phase boundary

Do not silently expand scope.
