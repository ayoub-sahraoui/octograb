# Block Picker And Macro UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the add-block drawer to use block-style grouped buttons and refactor macro config into a macro picker with generated parameter inputs.

**Architecture:** Keep existing block creation and macro storage behavior intact, but add small pure helper modules to drive grouped picker sections and macro form rendering. Then refactor the two UI components to consume those helpers so the visuals can improve without changing runtime behavior.

**Tech Stack:** React, MobX, TypeScript, shadcn/ui, Vitest

---

## Chunk 1: Add Block Picker Groups

### Task 1: Add picker grouping helper

**Files:**
- Create: `tests/block-selector-groups.test.ts`
- Create: `entrypoints/sidepanel/components/block-selector-groups.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run test to verify it passes**

### Task 2: Refactor add-block drawer UI

**Files:**
- Modify: `entrypoints/sidepanel/components/blueprint-block-selector.tsx`

- [ ] **Step 1: Refactor the picker to use grouped miniature block-card buttons**
- [ ] **Step 2: Keep existing block creation and limit-check behavior unchanged**
- [ ] **Step 3: Run `npm.cmd run compile`**

## Chunk 2: Macro Config Picker

### Task 3: Add macro form helper

**Files:**
- Create: `tests/macro-config-display.test.ts`
- Create: `entrypoints/sidepanel/components/block-configs/macro-config-display.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal helper implementation**
- [ ] **Step 4: Run test to verify it passes**

### Task 4: Refactor macro block config UI

**Files:**
- Modify: `entrypoints/sidepanel/components/block-configs/macro-block-config.tsx`

- [ ] **Step 1: Replace free-text-first macro setup with a picker over saved macros**
- [ ] **Step 2: Render generated parameter inputs from the selected macro definition**
- [ ] **Step 3: Add empty and missing-macro states**
- [ ] **Step 4: Run `npm.cmd run compile`**

## Chunk 3: Verification

### Task 5: Run focused verification

**Files:**
- Test: `tests/block-selector-groups.test.ts`
- Test: `tests/macro-config-display.test.ts`

- [ ] **Step 1: Run `npm.cmd test -- tests/block-selector-groups.test.ts tests/macro-config-display.test.ts`**
- [ ] **Step 2: Run `npm.cmd run compile`**
- [ ] **Step 3: Summarize the user-facing changes and any remaining UX gaps**
