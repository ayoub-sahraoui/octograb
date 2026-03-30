# Phase 8 Variable Scopes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `local`, `global`, and `blueprint` variable scopes distinct in runtime execution and compile-time analysis.

**Architecture:** Add a small runtime variable-scope engine for the executor, persist blueprint-scoped values per blueprint, and update compiled analysis so local definitions do not leak while broader scopes remain available.

**Tech Stack:** TypeScript, MobX, Vitest

---

### Task 1: Lock scope semantics with tests

**Files:**
- Create: `tests/execution-variable-scopes.test.ts`
- Modify: `tests/blueprint-analysis.test.ts`

- [x] **Step 1: Write failing runtime scope tests**
- [x] **Step 2: Write failing compile-time scope visibility tests**
- [x] **Step 3: Run targeted tests and confirm red**

### Task 2: Add the runtime scope engine

**Files:**
- Create: `entrypoints/models/execution-variable-scopes.ts`
- Modify: `entrypoints/stores/blueprint-executor-store.ts`
- Create: `docs/superpowers/specs/2026-03-28-phase8-variable-scopes-design.md`

- [x] **Step 1: Add a local/global/blueprint scope runtime helper**
- [x] **Step 2: Use it in set/get variable execution**
- [x] **Step 3: Add local scope boundaries around loop and branch execution**
- [x] **Step 4: Persist blueprint-scoped values per blueprint**

### Task 3: Align compile-time analysis

**Files:**
- Modify: `entrypoints/models/blueprint-analysis.ts`

- [x] **Step 1: Stop local definitions from leaking across local boundaries**
- [x] **Step 2: Keep global and blueprint definitions visible after assignment**

### Task 4: Verify the phase

**Files:**
- Test: `tests/execution-variable-scopes.test.ts`
- Test: `tests/blueprint-analysis.test.ts`
- Test: `tests/blueprint-validator.test.ts`

- [x] **Step 1: Run targeted tests**
- [x] **Step 2: Run full test suite**
- [x] **Step 3: Run TypeScript compile**
