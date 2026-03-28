# KSHETRA — Frontend and App Architecture Specification (v1)

## 1. Purpose

This document defines the frontend architecture, screen structure, component model, interaction design, motion system, and visual rules for Kshetra.

It is intended to make the product:

* visually premium
* low-friction to use
* emotionally engaging
* structurally clear for implementation

This document does not define backend scoring rules or AI planning rules. It defines how the system is presented and interacted with.

---

## 2. Product Form

Kshetra should start as a:

* responsive web application
* mobile-first in interaction design
* desktop-capable in layout
* optionally installable as a PWA later

### Why

* faster iteration
* easier deployment
* easier testing
* avoids early app-store overhead
* enough for daily usage if designed correctly

---

## 3. Experience Principles

## 3.1 Must not feel like a generic AI dashboard

The UI must not look like:

* a chatbot wrapper
* a template SaaS admin panel
* a Notion clone
* a random glassmorphism demo
* a neon overload toy

It should feel like:

* a personal operating system
* a premium game-like interface
* a controlled sci-fi ritual space
* a growth console

---

## 3.2 Primary emotional goals

The interface should create:

* clarity
* momentum
* seriousness
* progression
* tension without stress
* reward without childishness

---

## 3.3 Friction philosophy

The user should open the app and immediately know:

* who they are right now
* what today requires
* what progress has changed
* what is at risk
* what can be done next

Input must be lighter than the effort it is tracking.

---

## 4. Visual Design System

## 4.1 Design direction

The visual language should combine:

* dark premium interface
* subtle futuristic feel
* elegant motion
* strong contrast hierarchy
* deliberate glow usage
* game-system inspiration without looking like a game clone

---

## 4.2 Visual characteristics

### Base

* dark background, almost black but not pure black
* layered panels with depth
* minimal noise textures or ambient gradients
* strong spacing rhythm

### Accent

* controlled luminous highlights
* one main accent family per state/rank
* stat growth should feel energized, not cartoonish

### Surfaces

* cards with soft edges
* deeper shadows at rest
* brighter borders on active state
* no cluttered outlines

### Typography

* clean sans-serif
* bold display text for ranks, levels, and hero stats
* high readability for body text
* restrained uppercase usage for labels and system states

---

## 4.3 Design tokens

A token system should exist for:

* spacing
* radius
* elevation
* opacity
* motion timing
* stat color assignments
* rank color assignments
* notification severity
* success/failure states

Use a centralized theme definition.

---

## 5. App Information Architecture

## 5.1 Primary navigation

Recommended top-level product sections:

1. Home
2. Quests
3. Progress
4. Dungeons
5. Raids
6. Profile / Settings

For MVP, visible primary sections can be reduced to:

1. Home
2. Progress
3. Missions
4. Profile

Where:

* Missions combines quests, dungeons, and raids initially

---

## 5.2 Navigation behavior

### Mobile

* bottom navigation
* 4 to 5 primary items maximum
* quick access to “log completion” from home

### Desktop

* left sidebar or top navigation
* persistent overview panel possible
* larger radar and richer historical views

---

## 6. Core Screens

## 6.1 Home Screen

### Purpose

Primary operational screen. The user should spend most of their time here.

### Responsibilities

Show:

* current rank and level
* overall state summary
* animated spider web/radar stats
* today’s mandatory quests
* optional/stretch quests
* active streak
* urgent dungeon or raid notice
* one primary CTA

### Layout structure

1. Hero area
2. Radar area
3. Today’s quests
4. Alerts/events
5. Quick progress summary

### Key questions this screen answers

* What state am I in today?
* What must I do?
* What changed recently?
* What should I complete next?

---

## 6.2 Quests / Missions Screen

### Purpose

Focused action screen.

### Responsibilities

Show:

* mandatory quests
* optional quests
* stretch quest
* active event quests
* completion interaction
* deadline states

### Functional requirements

* one-tap completion
* optional intensity selection
* optional small note
* completed state animation
* sorting by urgency and importance

### UX rule

Never bury the main action. The user should be able to complete a quest in seconds.

---

## 6.3 Progress Screen

### Purpose

Show long-term growth.

### Responsibilities

Show:

* attribute radar
* rank ladder
* XP progression
* streak history
* attribute change timeline
* raid and dungeon wins
* ghost comparisons to past self

### Key emotional function

This is where the user feels:

* proof
* history
* earned growth

---

## 6.4 Dungeon Screen

### Purpose

Track short, bounded challenge arcs.

### Responsibilities

Show:

* active dungeons
* objectives
* timers
* completion state
* expected reward
* failure state if relevant

### UX requirement

A dungeon should feel heavier than a quest and lighter than a raid.

---

## 6.5 Raid Screen

### Purpose

Track major milestones.

### Responsibilities

Show:

* active raid title and narrative framing
* multi-step objectives
* deadline
* completion requirements
* artifact / summary upload if required
* impact on rank progression

### UX requirement

This must feel important, high-stakes, and visually distinct.

---

## 6.6 Profile / Settings Screen

### Responsibilities

Show/edit:

* account info
* goals
* notification preferences
* timezone
* AI style/tone mode
* privacy settings
* theme preferences later

---

## 7. Home Screen Detailed Composition

## 7.1 Hero panel

Must include:

* rank badge
* level number
* XP current / next threshold
* streak state
* current system phrase or daily summary

Example elements:

* “Rank D”
* “Level 8”
* “6-day streak”
* “Today favors Focus and Strength”

---

## 7.2 Radar panel

This is the signature visual.

Must show:

* six attributes
* current values
* cap ring
* recent changes
* animation on load and change

Optional:

* toggle current vs 7 days ago
* rank ring overlay
* hover/tap attribute detail

---

## 7.3 Today panel

Show:

* mandatory quests first
* optional quests second
* stretch quest last
* event card only if active

Each quest card must clearly show:

* title
* attribute impact
* difficulty
* reward preview
* deadline
* completion button

---

## 7.4 Alert strip / event strip

Compact area for:

* streak risk
* mystery event active
* raid deadline warning
* dungeon completion available

Must not be noisy.

---

## 8. Spider Web / Radar System Specification

## 8.1 Purpose

The radar is the visual identity of Kshetra.

It should communicate:

* current self state
* balance/imbalance
* growth trajectory
* rank expansion
* emotional momentum

---

## 8.2 Data model

The radar consumes:

* six current attribute values
* six caps
* optional previous snapshot
* optional delta values
* rank metadata

---

## 8.3 Visual layers

Recommended layers:

1. Background grid
2. Rank cap ring
3. Current attribute polygon
4. Previous snapshot ghost polygon
5. Attribute nodes
6. Pulse/glow layer on changed attributes
7. Tooltip/detail layer

---

## 8.4 Animation behavior

On entry:

* chart draws progressively
* nodes rise to target values
* soft glow settles

On stat gain:

* affected node pulses
* polygon expands smoothly
* delta label appears briefly
* no flashy arcade effects

On rank-up:

* outer ring expands
* chart scale recalibrates
* new cap becomes visible
* full-screen subtle moment allowed

---

## 8.5 Interaction behavior

On hover/tap:

* highlight one axis
* show attribute detail panel
* show current value
* show cap
* show recent trend
* show major contributing quest types

---

## 8.6 Attribute mapping

Recommended axis order should be stable.

Suggested order:

1. Strength
2. Wisdom
3. Focus
4. Mastery
5. Wealth
6. Bond

This can be adjusted only if design testing shows a better rhythm.

---

## 8.7 Technical recommendation

Do not use a generic default chart library look.

Options:

* build custom SVG radar
* or use a chart library only as a rendering base and fully style/customize it

Preferred:

* custom SVG or Canvas-based component for full control

---

## 9. Component Architecture

## 9.1 Core component groups

### Layout components

* AppShell
* MobileNav
* DesktopSidebar
* TopBar
* PageContainer
* SectionHeader

### Identity/progression components

* RankBadge
* LevelDisplay
* XPBar
* StreakCounter
* RadarChart
* AttributeCard
* RankProgressPanel

### Action components

* QuestCard
* QuestGroup
* QuestCompleteButton
* IntensitySelector
* EventCard
* DungeonCard
* RaidCard
* ObjectiveChecklist

### Feedback components

* Toast
* ProgressPulse
* RewardModal
* RankUpMoment
* EmptyState
* ErrorState

### Settings/profile components

* GoalList
* GoalEditor
* NotificationSettings
* SystemModeSelector

---

## 9.2 Recommended component hierarchy

```text
AppShell
  ├── Navigation
  ├── RouteView
  │     ├── HomePage
  │     │     ├── HeroPanel
  │     │     ├── RadarPanel
  │     │     ├── TodayQuestPanel
  │     │     ├── EventStrip
  │     │     └── QuickProgressPanel
  │     ├── MissionsPage
  │     ├── ProgressPage
  │     ├── DungeonsPage
  │     ├── RaidsPage
  │     └── ProfilePage
  └── GlobalOverlays
        ├── ToastLayer
        ├── RewardModal
        └── RankUpMoment
```

---

## 10. Frontend State Management

## 10.1 State categories

### Server state

Fetched from backend:

* profile
* attributes
* quests
* dungeons
* raids
* notifications
* progression summary

### UI state

Client-only:

* active tab
* modal visibility
* selected quest
* selected radar axis
* temporary animations
* local optimistic completion state

### Derived state

Computed in frontend:

* completion percentage
* urgency ordering
* visual deltas
* rank progress display
* grouped quest sections

---

## 10.2 Recommended tooling

For React/Next.js frontend:

* server state: TanStack Query
* local UI state: Zustand or built-in state for small scope
* forms: React Hook Form where needed
* animations: Framer Motion
* chart rendering: custom SVG component

---

## 10.3 State management rules

* keep backend as truth for progression values
* allow optimistic quest completion only if rollback is easy
* do not compute authoritative XP/rank in frontend
* frontend may show estimated feedback, but final values must come from backend response

---

## 11. Interaction Model

## 11.1 Quest completion flow

1. user taps quest
2. optional intensity selector appears if needed
3. user confirms completion
4. optimistic completion state shown
5. API call sent
6. response returns XP and attribute changes
7. radar animates
8. reward feedback shown
9. streak/rank changes shown if applicable

This flow must feel immediate.

---

## 11.2 Dungeon objective completion flow

* checklist style
* clear progress fraction
* visible remaining objectives
* completion state updates challenge card

---

## 11.3 Raid completion flow

* more deliberate than quest completion
* requires summary or verification when applicable
* confirmation step
* stronger post-completion reward moment

---

## 12. Motion System

## 12.1 Motion philosophy

Motion should:

* clarify
* reward
* emphasize progress
* maintain premium feel

Motion should not:

* distract
* delay basic actions
* feel gimmicky

---

## 12.2 Motion categories

### Structural motion

Page transitions, section reveals, panel expansion

### Reward motion

Quest completion pulse, XP bar movement, stat increase animation

### High-impact motion

Rank-up sequence, raid completion, major dungeon completion

### Ambient motion

Background glow drift, subtle panel shimmer, idle radar energy

---

## 12.3 Timing guidance

Use a restrained timing scale:

* fast actions: 120–180ms
* normal transitions: 220–320ms
* celebratory transitions: 400–700ms

Avoid long sluggish motion.

---

## 12.4 Easing guidance

Use:

* soft ease-out for reveals
* spring for stat pulses
* crisp motion for task completion

Avoid bouncy childish effects.

---

## 13. Visual Feedback Rules

## 13.1 Quest completion

On completion:

* card state changes immediately
* XP micro-indicator rises
* related attribute glows
* optional short sound later, not required now

---

## 13.2 Rank-up

Rank-up should feel rare and important.

Recommended sequence:

* screen dim subtly
* rank badge enlarges
* radar outer ring expands
* new rank text appears
* summary of why appears
* user returns to normal state

No excessive explosions.

---

## 13.3 Failure / expired states

Failure must feel serious but not punishing.

Use:

* muted red or warning tone
* lowered glow
* concise explanation
* recovery CTA

Do not shame the user visually.

---

## 14. Responsive Design Rules

## 14.1 Mobile-first constraints

* thumb-reachable interactions
* bottom nav
* full-width quest cards
* radar must remain readable without crowding
* avoid dense tables

---

## 14.2 Desktop enhancements

* larger radar
* side-by-side panels
* richer history charts
* more comparative views
* better raid/dungeon detail layouts

---

## 14.3 Breakpoint behavior

Recommended layout modes:

* small mobile
* large mobile
* tablet
* desktop
* wide desktop

Do not simply stretch mobile cards on desktop; redesign layout regions accordingly.

---

## 15. Design System for Ranks and Attributes

## 15.1 Rank identity

Each rank should have:

* unique visual treatment
* more intense outer ring
* slightly upgraded accent behavior
* stronger badge construction

Rank should feel like identity elevation, not just a label.

---

## 15.2 Attribute identity

Each attribute should have:

* a stable icon or symbol
* stable accent family
* stable tooltip description
* stable motion response

But avoid rainbow chaos. Attribute distinction should be readable and elegant.

---

## 16. Notification UX

## 16.1 In-app notifications

Use for:

* quest generated
* mystery event opened
* dungeon nearly complete
* rank-up
* streak risk

Format:

* short
* precise
* action-oriented

---

## 16.2 Push notification style

Push notifications should feel like system prompts, not generic reminders.

Good examples:

* “Three core quests are ready.”
* “Your 6-day streak can still be saved.”
* “A hidden event is active for the next 45 minutes.”

Bad examples:

* “Don’t forget to be productive!”
* “Keep going champ!”

---

## 17. Frontend Route Map

Recommended initial routes:

```text
/
 /home
 /missions
 /progress
 /dungeons
 /raids
 /profile
 /settings
```

Optional later routes:

```text
 /history
 /notifications
 /friends
 /guilds
```

---

## 18. Suggested Frontend Build Order

## Phase 1

* app shell
* auth-aware layout
* home screen
* quest cards
* simple profile state fetch
* basic progression summary

## Phase 2

* custom radar chart
* quest completion animation
* progress screen
* streak display
* responsive nav polish

## Phase 3

* dungeons
* raids
* richer overlays
* event strip
* reward modals

## Phase 4

* notification center
* installable PWA behavior
* desktop enriched history views
* optional social surfaces

---

## 19. Performance Requirements

* home screen must feel instant after cached load
* chart rendering must remain smooth on mid-range phones
* completion interactions must not wait on full-page refresh
* avoid heavy animation stacking
* prefer skeleton loading over layout jumps

---

## 20. Accessibility Requirements

Even with premium visuals, usability must remain strong.

Must support:

* readable contrast
* visible focus states
* keyboard navigation on desktop
* reduced motion mode
* screen-reader-friendly labels for key actions

Premium does not mean inaccessible.

---

## 21. Anti-Patterns to Avoid

Do not build:

* a giant dashboard with 20 cards
* an AI chat-first home screen
* endless forms
* over-designed glassmorphism everywhere
* RPG parody visuals
* loud gradients with weak hierarchy
* motion-heavy slow interactions

The product must feel intentional, not like a design trend board.

---

## 22. Final UX Goal

The product should make the user feel:

* seen by the system
* challenged but not overwhelmed
* visually rewarded
* structurally guided
* progressively stronger over time

The frontend should communicate one core message at all times:

**your life state is real, readable, and capable of growth**
