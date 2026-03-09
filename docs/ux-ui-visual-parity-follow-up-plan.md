# UX/UI Visual Parity Follow-Up Plan

**Status:** Proposal for cross-agent validation
**Created:** 2026-03-09
**Owner (current phase):** @aios-master
**Source of truth:** user reference screenshots + current frontend + Epic 6 + Epic 7

## Purpose

This plan closes the residual gap between:

- functional parity already delivered in [docs/epics/EPIC-6-PRODUCT-PARITY-UMMENSE.md](docs/epics/EPIC-6-PRODUCT-PARITY-UMMENSE.md)
- UX hardening already delivered in [docs/epics/EPIC-7-UX-HARDENING.md](docs/epics/EPIC-7-UX-HARDENING.md)
- the denser, more product-like operational UX/UI shown in the reference screenshots provided on 2026-03-09

This is a follow-up proposal. It does **not** reopen Stories 7.1-7.5. It defines the next planning package that must be validated by QA first, then broken into stories by SM, reviewed again, approved by PM, specified by UX, implemented by Dev, validated by QA, approved by PM, and only then pushed/deployed by DevOps.

## Scope Boundaries

### In Scope

- visual and interaction polish for current operational surfaces
- stronger design-system foundation for product-facing screens
- denser, more legible shell/navigation patterns
- improved operational home panel, kanban, and card workspace
- responsive and accessibility hardening for the affected screens

### Out of Scope

- new backend domains or new API contracts
- new navigation areas outside current product surface
- redesign of analytics-only routes as a primary goal
- schema or infrastructure changes not required by UI delivery

## Target Routes

The planning and story breakdown should prioritize these existing routes and components:

- `/` - operational home
- `/dashboard/automations` and `/flows/[flowId]` - flows workspace
- `/cards/[cardId]` - card workspace
- shared shell/navigation components used across the protected app

## Current State Summary

The current frontend already has the right product surface, but not yet the same product feel as the reference:

- shell exists in [packages/frontend/src/components/layout/AppShell.tsx](packages/frontend/src/components/layout/AppShell.tsx), [packages/frontend/src/components/layout/AppSidebar.tsx](packages/frontend/src/components/layout/AppSidebar.tsx), and [packages/frontend/src/components/layout/AppTopbar.tsx](packages/frontend/src/components/layout/AppTopbar.tsx)
- operational home already mixes tasks + calendar in [packages/frontend/src/pages/index.tsx](packages/frontend/src/pages/index.tsx)
- flows workspace already exists in [packages/frontend/src/features/flows/FlowsWorkspace.tsx](packages/frontend/src/features/flows/FlowsWorkspace.tsx)
- kanban primitives already exist in [packages/frontend/src/components/KanbanBoard.tsx](packages/frontend/src/components/KanbanBoard.tsx), [packages/frontend/src/components/Card.tsx](packages/frontend/src/components/Card.tsx), and [packages/frontend/src/components/Column.tsx](packages/frontend/src/components/Column.tsx)
- card workspace exists in [packages/frontend/src/pages/cards/[cardId].tsx](packages/frontend/src/pages/cards/[cardId].tsx)

Residual gaps observed:

1. global visual language is still weak because [packages/frontend/src/styles/globals.css](packages/frontend/src/styles/globals.css) is very thin
2. shell is functional, but still generic compared to the reference
3. operational home is close in structure, but needs higher information density and stronger hierarchy
4. kanban cards are still too simple for the intended product feel
5. card workspace still exposes technical controls such as JWT input and raw JSON in the main operator path

## Success Criteria

This plan is successful only if all of the following become true:

- the operational home, flows board, and card workspace look and behave like one coherent product
- design tokens and reusable UI patterns become the base for further visual work
- no raw JWT or raw JSON editing remains in the main operator journey
- desktop and mobile layouts stay usable across the affected screens
- QA can validate the result with objective criteria, not subjective taste alone

## Required Evidence Package

Every implementation story derived from this plan must require the following evidence:

- before/after screenshots for desktop and mobile on the affected route
- note of what changed in hierarchy, density, navigation, and interaction behavior
- proof that auth, routing, and existing data flows did not regress
- proof that empty/loading/error states still exist and match the new visual language
- explicit responsive notes for at least mobile, tablet, and desktop behavior
- explicit accessibility notes for focus, contrast, keyboard reachability, and readable labels

## Work Packages

### WP1 - Design Foundation and Product Language

**Goal:** establish a reusable visual system before page-level redesign.

**Primary files:**

- [packages/frontend/src/styles/globals.css](packages/frontend/src/styles/globals.css)
- [packages/frontend/tailwind.config.js](packages/frontend/tailwind.config.js)
- [packages/frontend/src/components/ui](packages/frontend/src/components/ui)

**Deliverables:**

- semantic tokens for surface, text, border, accent, success, warning, error
- normalized radius, shadow, spacing, and density rules
- reusable patterns for badges, avatar groups, progress bars, info rows, panel headers, empty/loading/error states
- focus states and contrast rules aligned with accessibility expectations

**QA preflight focus:**

- token naming consistency
- contrast and focus visibility
- component state coverage
- responsiveness of primitives

### WP2 - Shell, Navigation, and Page Framing

**Goal:** move the shell from generic dashboard to operational product shell.

**Primary files:**

- [packages/frontend/src/components/layout/AppShell.tsx](packages/frontend/src/components/layout/AppShell.tsx)
- [packages/frontend/src/components/layout/AppSidebar.tsx](packages/frontend/src/components/layout/AppSidebar.tsx)
- [packages/frontend/src/components/layout/AppTopbar.tsx](packages/frontend/src/components/layout/AppTopbar.tsx)

**Deliverables:**

- denser sidebar hierarchy with stronger active state language
- topbar with clearer search/filter/action grouping
- cleaner page framing and spacing rules across routes
- consistent header behavior on mobile and desktop

**QA preflight focus:**

- keyboard navigation
- viewport behavior
- filter/action discoverability
- no regression in existing route access

### WP3 - Operational Home Parity

**Goal:** make the home panel visually closer to the reference without changing domain scope.

**Primary files:**

- [packages/frontend/src/pages/index.tsx](packages/frontend/src/pages/index.tsx)
- [packages/frontend/src/components/panel/TasksPanel.tsx](packages/frontend/src/components/panel/TasksPanel.tsx)
- [packages/frontend/src/components/panel/CalendarPanel.tsx](packages/frontend/src/components/panel/CalendarPanel.tsx)

**Deliverables:**

- more compact and legible task list rows
- clearer progress language and summary strip
- better use of avatars, tags, and contextual metadata
- calendar side panel with stronger date/event emphasis

**QA preflight focus:**

- information density without readability loss
- mobile collapse rules
- task-to-card navigation continuity
- date/event clarity

### WP4 - Flows Board Visual Parity

**Goal:** raise the flows board to a product-grade operational board.

**Primary files:**

- [packages/frontend/src/features/flows/FlowsWorkspace.tsx](packages/frontend/src/features/flows/FlowsWorkspace.tsx)
- [packages/frontend/src/components/KanbanBoard.tsx](packages/frontend/src/components/KanbanBoard.tsx)
- [packages/frontend/src/components/Card.tsx](packages/frontend/src/components/Card.tsx)
- [packages/frontend/src/components/Column.tsx](packages/frontend/src/components/Column.tsx)

**Deliverables:**

- denser column headers and board controls
- cards with stronger metadata hierarchy
- improved tag, progress, and team indicators
- visual differentiation between active, blocked, completed, and inactive states

**QA preflight focus:**

- drag-and-drop continuity
- readability under many cards
- state clarity
- no regression in existing board/table/indicator modes

### WP5 - Card Workspace Productization

**Goal:** convert the card workspace from technical editing surface into collaborative operator workspace.

**Primary files:**

- [packages/frontend/src/pages/cards/[cardId].tsx](packages/frontend/src/pages/cards/[cardId].tsx)
- [packages/frontend/src/components/TaskModal.tsx](packages/frontend/src/components/TaskModal.tsx)
- [packages/frontend/src/components/CommentSection.tsx](packages/frontend/src/components/CommentSection.tsx)

**Deliverables:**

- visual header closer to the reference
- timeline composer and history with stronger collaboration feel
- common card fields editable without exposing raw JSON
- advanced technical controls removed from the main operator journey or isolated behind secondary admin/debug access
- tighter relation between tags, contacts, team, tasks, and progress

**QA preflight focus:**

- operator can complete common edits without technical knowledge
- no broken path for current data editing needs
- safe handling of advanced data
- clarity of ownership/history/progress

### WP6 - Final Product QA, UAT, and Release Gate

**Goal:** validate the redesigned surface before any push/deploy action.

**Primary artifacts:**

- updated story files created by SM
- QA gates under `docs/qa/`
- release evidence and go/no-go artifact

**Deliverables:**

- quality evidence for desktop and mobile
- accessibility and responsive validation for affected screens
- regression confirmation for auth, flows, cards, tasks, calendar, and existing UX hardening behaviors
- formal PM go/no-go before DevOps push/deploy

## Proposed Validation Sequence

1. `@qa` performs preflight review of this plan for risk, testability, accessibility, and measurable acceptance criteria.
2. `@sm` breaks approved work packages into implementation stories.
3. `@qa` reviews the drafted stories as specification artifacts before implementation starts.
4. `@pm` approves scope, priority, and rollout order.
5. `@ux-design-expert` becomes primary owner of the interaction and visual specification per story.
6. `@dev` implements story by story.
7. `@qa` executes final review and gate for each implemented story and for the release package.
8. `@pm` issues final go/no-go decision.
9. `@devops` runs pre-push, push, PR, and deploy.

## Story Candidates for SM

These are not official stories yet. They are the recommended breakdown for SM:

1. **Design Foundation + Shell Refresh**
   - covers WP1 and WP2
   - should land first because all later visual work depends on it

2. **Operational Home Refresh**
   - covers WP3
   - should reuse the foundation from candidate 1

3. **Flows Board Visual Parity**
   - covers WP4
   - should preserve all current workspace modes and interactions

4. **Card Workspace Productization**
   - covers WP5
   - highest UX risk and should start only after the shell/foundation are stable

5. **Visual QA/UAT + Release Gate**
   - covers WP6
   - owned by QA/PM/DevOps after implementation closes

## Mandatory Guardrails for SM, UX, Dev, and QA

- do not expand backend scope unless a UI blocker is proven
- do not create new product areas outside the current operational surfaces
- do not reintroduce mixed language in the user-facing UI
- do not expose debug-oriented controls in the default operator path
- every story must include explicit mobile behavior, empty/loading/error states, and file list
- every story must define objective QA evidence, not only visual intent
- every story must demand before/after evidence for the affected route before QA final review

## Recommended Next Agent Action

`@qa` should review this proposal first and either:

- approve it for story breakdown, or
- return it with explicit risks, missing acceptance criteria, or missing validation evidence
