# Macro Creation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete v1 flow for creating reusable macros from block subtrees inside the builder.

**Architecture:** Add a builder-side subtree serialization and creation helper, expose a `Save as Macro` action from block cards, and persist macros through the existing registry store. Keep macro consumption in the existing macro config drawer, with immediate registry refresh after save.

**Tech Stack:** React, MobX, shadcn/ui dialogs/forms, existing block model serialization, Vitest

---

## Chunk 1: Macro creation helpers

### Task 1: Add failing helper tests

**Files:**
- Create: `tests/macro-creation.test.ts`
- Modify: `entrypoints/models/macro-block.ts`
- Modify: `entrypoints/stores/macro-registry-store.ts`

- [ ] **Step 1: Write the failing test**

Cover:
- serializing a block subtree for macro storage
- building a macro payload from dialog input
- filtering invalid parameter rows

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/macro-creation.test.ts`
Expected: FAIL because helper functions do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add focused helpers for:
- subtree serialization
- parameter row normalization
- macro definition payload creation

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/macro-creation.test.ts`
Expected: PASS

## Chunk 2: Builder creation flow

### Task 2: Add Save as Macro action and dialog state

**Files:**
- Modify: `entrypoints/sidepanel/components/blueprint-block.tsx`
- Modify: `entrypoints/sidepanel/pages/blueprint-builder.tsx`
- Create: `entrypoints/sidepanel/components/create-macro-dialog.tsx`
- Modify: `entrypoints/stores/blueprint-builder-store.ts`
- Test: `tests/macro-creation.test.ts`

- [ ] **Step 1: Write the failing test**

Cover:
- dialog payload is built from a selected block subtree
- saving triggers registry registration

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/macro-creation.test.ts`
Expected: FAIL with missing creation flow helpers/state.

- [ ] **Step 3: Write minimal implementation**

Add:
- `Save as Macro` action on block cards
- builder dialog state for current subtree source
- create-macro dialog UI
- save handler that registers the macro

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/macro-creation.test.ts`
Expected: PASS

## Chunk 3: Macro config shortcut polish

### Task 3: Add empty-state shortcut into macro config

**Files:**
- Modify: `entrypoints/sidepanel/components/block-configs/macro-block-config.tsx`
- Modify: `entrypoints/sidepanel/pages/blueprint-builder.tsx`
- Test: `tests/macro-creation.test.ts`

- [ ] **Step 1: Write the failing test**

Cover:
- empty-state action surfaces create flow affordance

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/macro-creation.test.ts`
Expected: FAIL because shortcut is missing.

- [ ] **Step 3: Write minimal implementation**

Add a clear `Create New Macro` affordance in macro config empty state or helper area, wired to the shared creation dialog entry point.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/macro-creation.test.ts`
Expected: PASS

## Chunk 4: Verification

### Task 4: Run focused verification

**Files:**
- Test: `tests/macro-creation.test.ts`
- Test: `tests/macro-config-display.test.ts`

- [ ] **Step 1: Run focused tests**

Run: `npm.cmd test -- tests/macro-creation.test.ts tests/macro-config-display.test.ts`
Expected: PASS

- [ ] **Step 2: Run compile**

Run: `npm.cmd run compile`
Expected: PASS
