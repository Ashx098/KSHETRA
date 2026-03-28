# KSHETRA — UI Wireframe and Screen Structure Specification (v1)

## 1. Purpose

This document defines the exact screen structure, content blocks, priority hierarchy, and interaction layout for Kshetra.

It exists to:

* remove ambiguity for frontend implementation
* stop AI agents from inventing random layouts
* establish page-level visual and functional hierarchy
* define what appears on each screen and in what order
* ensure the product feels focused, premium, and intentional

This is a wireframe/specification document, not a pixel-perfect design file.

It describes:

* screens
* sections
* component order
* information priority
* interactions
* responsive behavior

---

## 2. Product Layout Philosophy

Kshetra should feel like:

* a personal system console
* a progression interface
* a life-state dashboard with intentional action paths

It should NOT feel like:

* a messy admin dashboard
* a chatbot with side widgets
* a task app with game stickers
* a giant analytics page

The UI must answer quickly:

1. where am I now?
2. what matters today?
3. what should I do next?
4. what changed?
5. what is at risk?
6. what is growing?

---

## 3. Primary App Structure

## 3.1 MVP navigation structure

Top-level sections:

1. Home
2. Missions
3. Progress
4. Profile

For v2 and later:
5. Dungeons
6. Raids
7. Notifications
8. Settings

For MVP, Dungeons and Raids can live inside Missions as distinct sections or tabs.

---

## 3.2 Mobile navigation

Bottom nav with 4 items:

* Home
* Missions
* Progress
* Profile

Rules:

* persistent on core screens
* active state must be visually strong
* icons + labels
* no more than 4 items in MVP

---

## 3.3 Desktop navigation

Preferred structure:

* left sidebar navigation
* top utility bar

Sidebar items:

* Home
* Missions
* Progress
* Profile

Top utility bar:

* streak
* quick notification icon
* user identity/avatar
* system state accent

---

## 4. Screen Inventory

The MVP requires these screens:

1. Home
2. Missions
3. Progress
4. Profile

The following overlays/modals are also required:

* Quest Completion Modal
* Reward Feedback Overlay
* Rank Up Overlay
* Event Prompt Card / Modal
* Error / Retry State
* Empty State

Optional but recommended in MVP:

* Quest Detail Drawer
* Attribute Detail Drawer

---

## 5. HOME SCREEN

## 5.1 Purpose

The Home screen is the main daily-use screen.

It should provide:

* current identity state
* radar overview
* daily tasks
* immediate urgency
* recent movement

This is the most important screen in the product.

---

## 5.2 Home screen content order

### Block 1 — Hero Identity Panel

Position:

* top of page

Must include:

* current rank
* current level
* current XP
* XP progress toward next rank or next level
* current streak
* short system message for the day

Example content:

* Rank D
* Level 8
* 620 XP
* 6-day streak
* “Today favors Focus and Strength.”

Purpose:

* establish state immediately

---

### Block 2 — Radar / Spider Web Panel

Position:

* directly under hero panel

Must include:

* six attributes
* current values
* cap ring
* recent deltas
* animated polygon

Optional:

* toggle between current and previous snapshot
* tap axis to view details

Purpose:

* give the user one strong visual answer to “how am I doing overall?”

This block is the visual signature of the app.

---

### Block 3 — Today’s Core Quests

Position:

* immediately below radar

Must include:

* 3 mandatory quests
* clearly marked priority order
* quick complete action
* optional intensity entry

Each quest card must show:

* title
* attribute icon(s)
* difficulty
* reward preview
* deadline if any
* complete button

Purpose:

* present the minimum required action set for the day

---

### Block 4 — Optional and Stretch Quests

Position:

* below core quests

Must include:

* 2 optional quests
* 1 stretch quest if available

Display rules:

* optional quests grouped together
* stretch quest visually distinct
* stretch quest should feel aspirational, not mandatory

Purpose:

* offer upward momentum without overwhelming the user

---

### Block 5 — Active Event Strip

Position:

* between quests and progress summary, or pinned below hero when active

Must include:

* event title
* time remaining
* reward preview
* action CTA

Rules:

* hidden when no event is active
* should not permanently occupy large space

Purpose:

* create live urgency and dynamism

---

### Block 6 — Quick Progress Summary

Position:

* bottom of home screen

Must include:

* today’s XP gained
* attributes changed today
* streak status
* closest rank requirement remaining

Example:

* +28 XP today
* Strength +2.1
* Focus +1.4
* 4 more days needed for next rank requirement

Purpose:

* close the loop and reinforce movement

---

## 5.3 Home screen mobile wireframe

```text
[Top utility / small header]

[Hero Identity Panel]
 Rank | Level | XP | Streak
 System message

[Radar / Spider Web Panel]

[Today’s Core Quests]
 Quest card 1
 Quest card 2
 Quest card 3

[Optional Quests]
 Optional quest 1
 Optional quest 2

[Stretch Quest]
 Stretch quest card

[Active Event Strip if present]

[Quick Progress Summary]

[Bottom Navigation]
```

---

## 5.4 Home screen desktop wireframe

```text
[Sidebar]   [Top utility bar]

           [Hero Identity Panel]
           [Radar Panel] [Quick Progress Summary / Event panel]
           [Core Quests]
           [Optional + Stretch Quests]
```

Desktop can use a two-column layout, but the radar must remain prominent.

---

## 6. MISSIONS SCREEN

## 6.1 Purpose

The Missions screen is where action items are managed more deeply.

It should include:

* all quests
* active dungeons
* active raids
* event missions
* historical mission completions later if needed

This is the “do the work” screen.

---

## 6.2 Missions screen structure

### Block 1 — Section Header

Must include:

* page title
* short helper text
* optional filter/sort controls

Example:

* Missions
* “Your active paths of growth.”

---

### Block 2 — Tab or segmented control

Tabs:

* Quests
* Dungeons
* Raids

MVP option:

* one page with stacked sections
* tab structure preferred if content volume grows

---

### Block 3 — Quests Section

Must include:

* mandatory quests
* optional quests
* stretch quest
* event quests if active

Grouping order:

1. Mandatory
2. Optional
3. Stretch
4. Event

---

### Block 4 — Dungeons Section

Must include:

* active dungeons
* objective progress
* timer
* reward
* status

Each dungeon card should show:

* title
* progress count
* time remaining
* completion reward
* “view details” or quick expand

---

### Block 5 — Raids Section

Must include:

* active raids
* objective checklist
* urgency
* verification required or not
* reward significance
* rank impact tag if relevant

Each raid card must visually feel heavier than dungeons.

---

## 6.3 Missions mobile wireframe

```text
[Header]
 Missions

[Segmented control]
 Quests | Dungeons | Raids

[Selected section content]

If Quests:
  [Mandatory group]
  [Optional group]
  [Stretch]
  [Event group]

If Dungeons:
  [Dungeon card list]

If Raids:
  [Raid card list]
```

---

## 6.4 Missions desktop wireframe

```text
[Sidebar] [Top bar]

[Page header]
[Segmented control]

[Content region]
- left: selected mission list
- right: selected mission detail panel
```

Desktop should support a detail panel for the selected quest/dungeon/raid.

---

## 7. PROGRESS SCREEN

## 7.1 Purpose

The Progress screen shows history, evolution, and state trajectory.

This page should answer:

* how am I changing?
* which attributes are growing?
* how close am I to next rank?
* what has mattered most recently?

This is not a “numbers page.”
It is the proof page.

---

## 7.2 Progress screen content order

### Block 1 — Rank Progress Panel

Must include:

* current rank
* next rank
* rank requirements remaining
* current level
* XP progression

Purpose:

* answer “how far am I from advancement?”

---

### Block 2 — Expanded Radar Panel

Must include:

* full-size radar
* current vs past snapshot toggle
* rank cap visualization
* attribute values and recent deltas

Optional:

* 7-day / 30-day toggle
* ghost polygon from previous week

---

### Block 3 — Attribute Breakdown Cards

One card per attribute:

* current value
* cap
* recent gain
* strongest contributing quest types
* trend direction

Purpose:

* explain what the radar means

---

### Block 4 — History / Timeline Section

Must include:

* recent XP timeline
* streak milestones
* completed dungeons
* completed raids
* notable progression events

This can begin as a simple list in MVP.

---

### Block 5 — Milestone Ledger

Must include:

* rank-ups
* raid completions
* dungeon completions
* streak milestone bonuses

Purpose:

* long-term reinforcement

---

## 7.3 Progress mobile wireframe

```text
[Header]
 Progress

[Rank Progress Panel]

[Expanded Radar]

[Attribute Cards]
 Strength
 Wisdom
 Focus
 Mastery
 Wealth
 Bond

[Recent Progress Timeline]

[Milestone Ledger]
```

---

## 7.4 Progress desktop wireframe

```text
[Sidebar] [Top bar]

[Page header]

[Top row]
 [Rank Progress Panel] [Expanded Radar]

[Second row]
 [Attribute Cards grid]

[Third row]
 [Timeline / Milestone panels]
```

---

## 8. PROFILE SCREEN

## 8.1 Purpose

The Profile screen manages:

* user identity
* goals
* preferences
* notification settings
* AI mode/tone settings later

This is the least frequently used screen in MVP but still important.

---

## 8.2 Profile screen content order

### Block 1 — User Header

Must include:

* display name
* username
* timezone
* current rank badge
* optional system title or mode

---

### Block 2 — Goals Section

Must include:

* active goals
* add goal
* edit goal
* disable goal

Display each goal with:

* type
* title
* priority weight
* active status

---

### Block 3 — Notification Preferences

Must include:

* notification channel toggles
* daily reminder preference
* event notification toggle
* streak risk toggle

---

### Block 4 — System Preferences

Must include:

* motivation mode / architect tone later
* reduced motion mode
* theme setting later
* data/privacy basics later

---

## 8.3 Profile mobile wireframe

```text
[Header]
 Profile

[User Header]

[Goals Section]

[Notification Preferences]

[System Preferences]
```

---

## 9. OVERLAYS AND MODALS

## 9.1 Quest Completion Modal

Trigger:

* user taps complete on a quest that needs input

Must include:

* quest title
* optional intensity selector
* optional short note
* confirm action

Rules:

* keep small
* do not turn into a form
* must feel fast

---

## 9.2 Reward Feedback Overlay

Trigger:

* successful quest, dungeon objective, dungeon completion, or raid completion

Must include:

* XP gained
* attributes increased
* visual pulse
* optional streak change

Should last briefly and feel satisfying.

---

## 9.3 Rank Up Overlay

Trigger:

* rank promotion

Must include:

* old rank → new rank
* visual radar expansion
* short reason summary
* CTA back to progress or home

This should be the largest celebration in the MVP.

---

## 9.4 Event Prompt Modal or Card

Trigger:

* mystery event or save-day event activated

Must include:

* title
* time window
* reward
* completion CTA
* dismiss or snooze behavior if allowed

---

## 9.5 Quest Detail Drawer

Optional but recommended.

Must include:

* full quest description
* attributes affected
* difficulty
* reward band
* due time
* notes on completion expectations

Useful especially on desktop and on mobile long press.

---

## 10. CARD SPECIFICATIONS

## 10.1 Quest card structure

Each quest card should contain:

Top row:

* quest title
* difficulty tag

Middle:

* short description
* attribute icons/tags

Bottom row:

* reward preview
* deadline if applicable
* complete button

States:

* active
* completing
* completed
* expired
* locked

---

## 10.2 Dungeon card structure

Top:

* dungeon title
* time remaining

Middle:

* objective progress
* short description

Bottom:

* reward preview
* open details button

---

## 10.3 Raid card structure

Top:

* raid title
* urgency / phase

Middle:

* progress checklist
* rank impact note
* verification required badge if relevant

Bottom:

* reward preview
* details button
* complete CTA only when eligible

---

## 11. PRIORITY RULES FOR CONTENT DISPLAY

## 11.1 Home screen priority order

Always prioritize:

1. current identity
2. radar
3. mandatory quests
4. active event
5. optional/stretch
6. summary

If space becomes tight on mobile:

* compress summary first
* never hide mandatory quests behind secondary tabs
* never shrink radar into uselessness

---

## 11.2 Alert priority

Highest priority alerts:

1. raid deadline
2. streak risk
3. active mystery event
4. dungeon almost complete
5. optional encouragement

Only one high-priority alert should dominate at a time.

---

## 12. EMPTY STATES

## 12.1 No quests state

Show:

* calm empty state
* short message
* CTA to generate quests or refresh daily plan

Do not show a blank dead page.

---

## 12.2 No dungeons state

Show:

* “No active dungeons”
* CTA to start one when feature is enabled

---

## 12.3 No raids state

Show:

* “No active raids”
* contextual note: raids unlock when meaningful milestones are ready

---

## 13. ERROR STATES

For any failed fetch or action:

* show clear error
* keep action context visible
* provide retry
* do not dump raw system errors in UI

Examples:

* quest completion failed
* daily plan failed to load
* event creation unavailable

---

## 14. RESPONSIVE LAYOUT RULES

## 14.1 Mobile rules

* vertical stacking first
* large touch targets
* minimal dense side-by-side layouts
* hero and radar remain top priority
* cards must be scroll-friendly

---

## 14.2 Tablet rules

* two-column options begin
* radar can become larger
* quest cards can appear in denser grouped sections

---

## 14.3 Desktop rules

* use panels intentionally
* allow side detail drawers
* avoid giant wasted empty space
* keep main action zone obvious

---

## 15. STATE-DRIVEN UI BEHAVIOR

## 15.1 When user has low activity

Home should prioritize:

* save-day quest visibility
* urgency strip
* simplified CTA

---

## 15.2 When user has high consistency

Home should prioritize:

* streak reinforcement
* stretch quest
* dungeon opportunity

---

## 15.3 When raid is active

Home should include:

* compact raid status panel near the top
* remaining objectives
* urgency indicator

---

## 16. SCREEN BUILD ORDER FOR IMPLEMENTATION

Recommended implementation order:

### Step 1

* App shell
* bottom nav / sidebar
* Home screen hero
* radar placeholder
* core quest list

### Step 2

* quest card interactions
* completion modal
* reward feedback overlay

### Step 3

* Missions screen
* Progress screen
* Profile screen

### Step 4

* expanded radar
* event strip
* rank-up overlay
* dungeon and raid cards

This reduces build chaos and gives a usable core fast.

---

## 17. COMPONENT-TO-SCREEN MAPPING

### Home

* HeroIdentityPanel
* RadarPanel
* QuestGroupMandatory
* QuestGroupOptional
* StretchQuestCard
* EventStrip
* QuickProgressSummary

### Missions

* PageHeader
* MissionTabs
* QuestGroup
* DungeonCardList
* RaidCardList
* MissionDetailDrawer

### Progress

* RankProgressPanel
* ExpandedRadarPanel
* AttributeCardGrid
* TimelineList
* MilestoneLedger

### Profile

* UserHeader
* GoalsList
* GoalEditor
* NotificationSettings
* SystemPreferences

---

## 18. FINAL SCREEN HIERARCHY SUMMARY

### HOME

```text
Hero
Radar
Mandatory Quests
Optional / Stretch
Active Event
Quick Summary
```

### MISSIONS

```text
Header
Tabs
Quests / Dungeons / Raids
Detail Panel
```

### PROGRESS

```text
Rank Progress
Radar
Attribute Breakdown
Timeline
Milestones
```

### PROFILE

```text
User Header
Goals
Notifications
Preferences
```

---

## 19. Final Principle

Every screen in Kshetra must answer a specific question.

* Home = what should I do today?
* Missions = what is active right now?
* Progress = how am I evolving?
* Profile = what is this system tuned for?

If a screen cannot answer its main question clearly, it should be redesigned.
