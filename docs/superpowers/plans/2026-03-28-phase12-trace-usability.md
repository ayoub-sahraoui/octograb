# Trace Usability Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make execution traces easier to search, narrow, and copy during real debugging sessions.

**Architecture:** Extend the pure trace display helper with filtering logic, then layer simple controls and copy actions into the existing Trace tab. Keep all changes local to the trace UI and avoid store or runtime behavior changes.

**Tech Stack:** React, TypeScript, MobX, Vitest

---

### Task 1: Add trace filtering helper behavior

**Files:**
- Modify: `entrypoints/sidepanel/components/execution-trace-display.ts`
- Test: `tests/execution-trace-display.test.ts`

- [ ] **Step 1: Write the failing filter/order test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement minimal filtering and ordering**
- [ ] **Step 4: Run test to verify it passes**

### Task 2: Add Trace tab controls

**Files:**
- Modify: `entrypoints/sidepanel/pages/blueprint-builder.tsx`

- [ ] **Step 1: Add search, status filters, and ordering toggle**
- [ ] **Step 2: Render filtered traces instead of the raw list**
- [ ] **Step 3: Add copy actions for visible traces, sections, and full entries**
- [ ] **Step 4: Preserve the current empty state and trace drawer flow**

### Task 3: Verify the feature

**Files:**
- Test: `tests/execution-trace-display.test.ts`

- [ ] **Step 1: Run targeted tests**
- [ ] **Step 2: Run full test suite**
- [ ] **Step 3: Run TypeScript compile verification**
