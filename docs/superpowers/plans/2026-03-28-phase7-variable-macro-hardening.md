# Phase 7 Variable And Macro Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Catch unresolved variables and invalid macro parameter usage during compile-time analysis and surface them through validation.

**Architecture:** Extend `blueprint-analysis.ts` with a sequential compile-time pass over compiled blocks. Keep the compiler unchanged, let analysis reason about definition order and macro contracts, and let the validator consume the shared issues.

**Tech Stack:** TypeScript, MobX, Vitest

---

### Task 1: Lock new validation behavior with tests

**Files:**
- Modify: `tests/blueprint-analysis.test.ts`
- Modify: `tests/blueprint-validator.test.ts`

- [x] **Step 1: Write failing tests for unresolved variables**
- [x] **Step 2: Write failing tests for get-before-set reads**
- [x] **Step 3: Write failing tests for macro parameter validation**
- [x] **Step 4: Run the targeted tests and confirm red**

### Task 2: Add compile-time variable and macro analysis

**Files:**
- Modify: `entrypoints/models/blueprint-analysis.ts`
- Modify: `entrypoints/stores/macro-registry-store.ts`
- Create: `docs/superpowers/specs/2026-03-28-phase7-variable-macro-hardening-design.md`

- [x] **Step 1: Add sequential variable-definition analysis**
- [x] **Step 2: Add unresolved variable reference warnings**
- [x] **Step 3: Add macro parameter validation from the macro registry**
- [x] **Step 4: Guard macro-store loading in non-browser test environments**

### Task 3: Verify the phase

**Files:**
- Test: `tests/blueprint-analysis.test.ts`
- Test: `tests/blueprint-validator.test.ts`

- [x] **Step 1: Re-run targeted tests and confirm green**
- [x] **Step 2: Run full test suite**
- [x] **Step 3: Run TypeScript compile**
