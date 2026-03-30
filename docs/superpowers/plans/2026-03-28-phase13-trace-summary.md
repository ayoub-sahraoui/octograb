# Trace Summary Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact, filtered run summary to the Trace tab so execution health and timing are visible at a glance.

**Architecture:** Extend the existing pure trace helper with summary generation, then render lightweight summary cards above the Trace controls in the blueprint builder. Keep the summary derived from the visible filtered trace list.

**Tech Stack:** React, TypeScript, MobX, Vitest

---

### Task 1: Add trace summary helper

**Files:**
- Modify: `entrypoints/sidepanel/components/execution-trace-display.ts`
- Test: `tests/execution-trace-display.test.ts`

- [ ] **Step 1: Write the failing summary test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement minimal summary generation**
- [ ] **Step 4: Run test to verify it passes**

### Task 2: Render summary cards in the Trace tab

**Files:**
- Modify: `entrypoints/sidepanel/pages/blueprint-builder.tsx`

- [ ] **Step 1: Derive summary from visible traces**
- [ ] **Step 2: Render counts, durations, timeline, and latest block**
- [ ] **Step 3: Keep the summary aligned with active filters**

### Task 3: Verify the feature

**Files:**
- Test: `tests/execution-trace-display.test.ts`

- [ ] **Step 1: Run targeted tests**
- [ ] **Step 2: Run full test suite**
- [ ] **Step 3: Run TypeScript compile verification**
