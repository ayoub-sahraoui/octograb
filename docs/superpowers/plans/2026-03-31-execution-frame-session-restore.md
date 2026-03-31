# Execution Frame Session Restore Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the in-page execution glow earlier across navigations by combining document-start content-script boot with tab-scoped session state.

**Architecture:** Add a small session-state helper for the execution frame, teach the executor to persist the active frame state per tab, and let the content script restore the frame on startup before sidepanel reconnection. Keep the existing message-based show/hide flow and SPA self-heal logic.

**Tech Stack:** WXT content scripts, browser.storage.session, MobX executor store, Vitest

---

## Chunk 1: Session State Helper

### Task 1: Add a per-tab execution-frame session helper

**Files:**
- Create: `entrypoints/content/execution-frame-session.ts`
- Test: `tests/execution-frame-session.test.ts`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run the tests to verify they fail**
- [ ] **Step 3: Implement the session helper**
- [ ] **Step 4: Run the tests to verify they pass**

## Chunk 2: Content Startup Restore

### Task 2: Restore the frame on content-script boot

**Files:**
- Modify: `entrypoints/content.ts`
- Test: `tests/execution-frame-session.test.ts`

- [ ] **Step 1: Add a failing test or extend the helper tests for restore behavior**
- [ ] **Step 2: Run the tests to verify the failure**
- [ ] **Step 3: Implement document-start restore**
- [ ] **Step 4: Re-run tests**

## Chunk 3: Executor Integration

### Task 3: Persist and clear frame state from the executor

**Files:**
- Modify: `entrypoints/stores/blueprint-executor-store.ts`
- Test: `tests/execution-page-frame.test.ts`

- [ ] **Step 1: Write or extend a failing test for executor frame-state toggling**
- [ ] **Step 2: Run the tests to verify the failure**
- [ ] **Step 3: Implement state persistence alongside show/hide**
- [ ] **Step 4: Run the targeted tests and compile**
