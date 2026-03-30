# Trace UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make execution traces readable by default and inspectable on demand in the blueprint builder Trace tab.

**Architecture:** Keep rendering inside the existing blueprint builder page, but move trace display shaping into a small pure helper. Use the existing accordion component to avoid a custom disclosure system and keep long trace lists compact.

**Tech Stack:** React, TypeScript, MobX, Radix accordion, Vitest

---

### Task 1: Add trace display formatting helper

**Files:**
- Create: `entrypoints/sidepanel/components/execution-trace-display.ts`
- Test: `tests/execution-trace-display.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run test to verify it passes**

### Task 2: Upgrade the Trace tab UI

**Files:**
- Modify: `entrypoints/sidepanel/pages/blueprint-builder.tsx`
- Reuse: `components/ui/accordion.tsx`

- [ ] **Step 1: Replace flat trace cards with accordion entries**
- [ ] **Step 2: Render compact summary metadata in the trigger**
- [ ] **Step 3: Render structured details in the accordion content**
- [ ] **Step 4: Keep empty-state and download behavior intact**

### Task 3: Verify the feature

**Files:**
- Test: `tests/execution-trace-display.test.ts`
- Verify: `entrypoints/sidepanel/pages/blueprint-builder.tsx`

- [ ] **Step 1: Run targeted tests**
- [ ] **Step 2: Run full test suite**
- [ ] **Step 3: Run TypeScript compile verification**
