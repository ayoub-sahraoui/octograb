# Phase 9 Macro Safety Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add compile-time and runtime protection against recursive or runaway macro expansion.

**Architecture:** Centralize macro safety rules in a shared `macro-safety.ts` module. Use it from compiled blueprint analysis for early errors and from executor macro expansion as a runtime backstop.

**Tech Stack:** TypeScript, MobX, Vitest

---

### Task 1: Lock macro safety behavior with tests

**Files:**
- Modify: `tests/blueprint-analysis.test.ts`
- Create: `tests/macro-safety.test.ts`

- [x] **Step 1: Write failing macro cycle analysis tests**
- [x] **Step 2: Write failing expansion budget tests**
- [x] **Step 3: Write failing runtime guard helper tests**
- [x] **Step 4: Run targeted tests and confirm red**

### Task 2: Add shared macro safety logic

**Files:**
- Create: `entrypoints/models/macro-safety.ts`
- Create: `docs/superpowers/specs/2026-03-28-phase9-macro-safety-design.md`

- [x] **Step 1: Add shared depth and block budget constants**
- [x] **Step 2: Add runtime macro guard helper**
- [x] **Step 3: Add compile-time macro expansion analysis**

### Task 3: Integrate safety into analysis and execution

**Files:**
- Modify: `entrypoints/models/blueprint-analysis.ts`
- Modify: `entrypoints/stores/blueprint-executor-store.ts`

- [x] **Step 1: Surface macro safety issues through compiled analysis**
- [x] **Step 2: Add executor macro stack and expansion budget tracking**
- [x] **Step 3: Reset runtime macro guard state between executions**

### Task 4: Verify the phase

**Files:**
- Test: `tests/macro-safety.test.ts`
- Test: `tests/blueprint-analysis.test.ts`

- [x] **Step 1: Run targeted tests**
- [x] **Step 2: Run full test suite**
- [x] **Step 3: Run TypeScript compile**
