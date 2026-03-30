# Phase 5 Execution Compiler Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce an internal compiler layer that converts editor `Blueprint` models into a plain execution plan before runtime execution.

**Architecture:** Keep persistence and editor models unchanged for this phase. Add a compiler that produces normalized execution blocks with registry-derived metadata, then make the executor run compiled blocks instead of live MobX model instances.

**Tech Stack:** TypeScript, MobX, Vitest

---

### Task 1: Add compiler coverage first

**Files:**
- Create: `tests/blueprint-compiler.test.ts`

- [x] **Step 1: Write the failing tests**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Cover compiled metadata, nested children, and else-branch handling**
- [x] **Step 4: Re-run test to verify the expected green state after implementation**

### Task 2: Add the compiler layer

**Files:**
- Create: `entrypoints/models/blueprint-compiler.ts`
- Modify: `entrypoints/models/block-registry.ts`

- [x] **Step 1: Add `CompiledBlock` and `CompiledBlueprint` shapes**
- [x] **Step 2: Compile blocks into plain objects with normalized defaults**
- [x] **Step 3: Move child-execution metadata into the block registry**
- [x] **Step 4: Keep persistence schema unchanged**

### Task 3: Make the executor run compiled plans

**Files:**
- Modify: `entrypoints/stores/blueprint-executor-store.ts`

- [x] **Step 1: Compile blueprints at execution start**
- [x] **Step 2: Route block execution through compiled metadata**
- [x] **Step 3: Compile macro-expanded blocks before execution**
- [x] **Step 4: Preserve existing runtime behavior**

### Task 4: Verify the integration

**Files:**
- Modify: `tests/block-registry.test.ts` (if needed)
- Test: `tests/blueprint-compiler.test.ts`
- Test: `tests/blueprint-execution.test.ts`

- [x] **Step 1: Run targeted tests**
- [x] **Step 2: Run TypeScript compile**
- [x] **Step 3: Run full test suite**
