# Macro Library Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Macro Library page that lists, edits, previews, and deletes saved macros.

**Architecture:** Add a new sidepanel page and route backed by `macroRegistryStore`, plus a small display helper and edit dialog that only changes macro metadata and parameters while preserving stored blocks.

**Tech Stack:** React, MobX, shadcn/ui dialogs/cards/buttons, existing macro registry store, Vitest

---

## Chunk 1: Macro library helpers

### Task 1: Add failing tests for macro display/edit helpers

**Files:**
- Create: `tests/macro-library.test.ts`
- Create: `entrypoints/sidepanel/pages/macro-library-display.ts`

- [ ] **Step 1: Write the failing test**

Cover:
- macro list sorting
- summary counts for blocks and parameters
- edit payload preserving id and blocks

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/macro-library.test.ts`
Expected: FAIL because helper module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add focused helper functions for:
- macro library card display
- metadata edit payload creation

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/macro-library.test.ts`
Expected: PASS

## Chunk 2: Macro library page

### Task 2: Add the page UI and route

**Files:**
- Create: `entrypoints/sidepanel/pages/macro-library.tsx`
- Modify: `entrypoints/sidepanel/pages/router.tsx`
- Modify: `entrypoints/sidepanel/pages/layout.tsx`
- Test: `tests/macro-library.test.ts`

- [ ] **Step 1: Write the failing test**

Cover:
- route/nav metadata expectations in helper space where practical
- macro library empty-state and card-state helpers

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/macro-library.test.ts`
Expected: FAIL because page/helper wiring is incomplete.

- [ ] **Step 3: Write minimal implementation**

Add:
- macro library page
- route
- nav entry
- summary cards using helper data

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/macro-library.test.ts`
Expected: PASS

## Chunk 3: Edit and delete flow

### Task 3: Add metadata edit dialog and delete actions

**Files:**
- Modify: `entrypoints/sidepanel/pages/macro-library.tsx`
- Modify: `entrypoints/stores/macro-registry-store.ts`
- Test: `tests/macro-library.test.ts`

- [ ] **Step 1: Write the failing test**

Cover:
- edit payload preserves stored blocks and identity
- delete removes macro from registry-visible list

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/macro-library.test.ts`
Expected: FAIL because edit/delete flow helpers are incomplete.

- [ ] **Step 3: Write minimal implementation**

Add:
- edit dialog
- save handler using existing registry update path
- delete action using existing registry remove path

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/macro-library.test.ts`
Expected: PASS

## Chunk 4: Verification

### Task 4: Run focused verification

**Files:**
- Test: `tests/macro-library.test.ts`
- Test: `tests/macro-config-display.test.ts`

- [ ] **Step 1: Run focused tests**

Run: `npm.cmd test -- tests/macro-library.test.ts tests/macro-config-display.test.ts`
Expected: PASS

- [ ] **Step 2: Run compile**

Run: `npm.cmd run compile`
Expected: PASS
