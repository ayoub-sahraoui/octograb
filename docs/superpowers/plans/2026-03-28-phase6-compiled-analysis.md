# Phase 6 Compiled Analysis Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared compiled analysis layer that powers structural validation and AI blueprint previews from the same execution-oriented view.

**Architecture:** Keep `compileBlueprint()` as the runtime compiler and add `blueprint-analysis.ts` above it for reusable metadata and structural issues. Reuse that analysis in `blueprint-validator.ts` and `core/ai/tools.ts`, while leaving persistence and the existing preview UI stable.

**Tech Stack:** TypeScript, MobX, Vitest

---

### Task 1: Lock the behavior with failing tests

**Files:**
- Create: `tests/blueprint-analysis.test.ts`

- [x] **Step 1: Write the failing analysis tests**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Re-run after implementation and confirm green**

### Task 2: Add compiled analysis and preview helpers

**Files:**
- Create: `entrypoints/models/blueprint-analysis.ts`
- Create: `docs/superpowers/specs/2026-03-28-phase6-compiled-analysis-design.md`

- [x] **Step 1: Add compiled blueprint metadata analysis**
- [x] **Step 2: Add structural issue analysis**
- [x] **Step 3: Add shared blueprint preview builder**

### Task 3: Reuse compiled analysis in validation and AI preview

**Files:**
- Modify: `entrypoints/models/blueprint-validator.ts`
- Modify: `core/ai/tools.ts`
- Modify: `entrypoints/stores/ai-agent-store.ts`

- [x] **Step 1: Move structural validation onto compiled analysis**
- [x] **Step 2: Build AI preview payloads from shared preview helper**
- [x] **Step 3: Keep existing message/UI contracts compatible**

### Task 4: Verify the phase

**Files:**
- Test: `tests/blueprint-analysis.test.ts`
- Test: `tests/blueprint-validator.test.ts`

- [x] **Step 1: Run targeted tests**
- [x] **Step 2: Run full test suite**
- [x] **Step 3: Run TypeScript compile**
