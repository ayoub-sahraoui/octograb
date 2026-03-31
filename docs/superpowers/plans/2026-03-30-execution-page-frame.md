# Execution Page Frame Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a glowing page-edge frame on the active webpage while blueprint execution is running.

**Architecture:** Introduce a small content-side page-frame controller and two content-script message types, then wire the executor lifecycle to show and hide the frame at the correct times.

**Tech Stack:** React sidepanel executor store, content script messaging, TypeScript, Vitest

---

## Chunk 1: Page frame controller

### Task 1: Add failing tests for page frame behavior

**Files:**
- Create: `tests/execution-page-frame.test.ts`
- Create: `entrypoints/content/execution-page-frame.ts`

- [ ] **Step 1: Write the failing test**

Cover:
- show creates one frame overlay
- hide removes or hides it
- repeated show does not duplicate the overlay

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/execution-page-frame.test.ts`
Expected: FAIL because the controller does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add a tiny controller for:
- `showExecutionPageFrame()`
- `hideExecutionPageFrame()`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/execution-page-frame.test.ts`
Expected: PASS

## Chunk 2: Content messaging

### Task 2: Add message types and content routing

**Files:**
- Modify: `core/messaging.ts`
- Modify: `entrypoints/content.ts`
- Test: `tests/execution-page-frame.test.ts`

- [ ] **Step 1: Write the failing test**

Cover any helper-level routing assumptions if needed.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/execution-page-frame.test.ts`
Expected: FAIL or remain incomplete until message support is wired.

- [ ] **Step 3: Write minimal implementation**

Add:
- `SHOW_EXECUTION_FRAME`
- `HIDE_EXECUTION_FRAME`
- content listener wiring

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/execution-page-frame.test.ts`
Expected: PASS

## Chunk 3: Executor lifecycle wiring

### Task 3: Show and hide frame during execution

**Files:**
- Modify: `entrypoints/stores/blueprint-executor-store.ts`
- Test: `tests/execution-page-frame.test.ts`

- [ ] **Step 1: Write the failing test**

Add a small focused lifecycle helper test if needed, or extend controller tests only if executor wiring is straightforward.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/execution-page-frame.test.ts`
Expected: FAIL until lifecycle calls are added.

- [ ] **Step 3: Write minimal implementation**

Send show/hide messages on:
- execute start
- pause
- resume
- stop
- execute finally

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/execution-page-frame.test.ts`
Expected: PASS

## Chunk 4: Verification

### Task 4: Run focused verification

**Files:**
- Test: `tests/execution-page-frame.test.ts`

- [ ] **Step 1: Run focused tests**

Run: `npm.cmd test -- tests/execution-page-frame.test.ts`
Expected: PASS

- [ ] **Step 2: Run compile**

Run: `npm.cmd run compile`
Expected: PASS
