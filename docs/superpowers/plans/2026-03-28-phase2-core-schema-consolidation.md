# Phase 2 Core Schema Consolidation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the stale flat core plan/block schema and align the shared core types and core validator with the modern serialized blueprint model.

**Architecture:** Keep the persisted `SavedPlan.plan` wrapper for compatibility, but redefine its `pipeline` payload as serialized modern blocks instead of the legacy flat block shape. Replace the old core validator logic with a thin adapter over the modern blueprint validator so the repo has one validation source of truth.

**Tech Stack:** TypeScript, MobX models, Vitest, Dexie

---

## File Structure

- Modify: `core/types.ts`
  Replace the stale flat `Block` schema with a serialized-block document type that matches `Blueprint.toJSON()`.
- Modify: `core/plan-validator.ts`
  Reimplement validation as an adapter over `Blueprint`, `createBlockFromJSON`, and `BlueprintValidator`.
- Modify: `core/database.ts`
  Keep typings aligned with the updated `Plan` type and remove reliance on the stale flat schema.
- Modify: `tests/blueprint-execution.test.ts`
  Add regression coverage for DB-shaped modern serialized plan payloads if needed.
- Add: `tests/plan-validator.test.ts`
  Verify the core plan validator accepts modern serialized blocks, including newer block types.

## Chunk 1: Shared Core Schema

### Task 1: Replace the stale flat `Plan` block shape with a serialized modern block shape

**Files:**
- Modify: `core/types.ts`
- Modify: `core/database.ts`
- Test: `tests/plan-validator.test.ts`

- [ ] **Step 1: Write failing tests for the core plan schema path**

Add tests covering:
- a `Plan` with serialized `navigate` and `assert` blocks validates successfully
- a `Plan` with missing modern config fails through the core validator

- [ ] **Step 2: Run the new tests to verify failure**

Run: `npm test -- tests/plan-validator.test.ts`
Expected: FAIL because the current core validator still assumes the old flat shape

- [ ] **Step 3: Redefine the shared persisted block/document types**

In `core/types.ts`:
- remove the stale flat block contract used by the old validator
- define a recursive serialized block type that matches persisted blueprint blocks
- keep the persisted `Plan` wrapper and existing `SavedPlan` shape
- preserve extraction/environment helper types still used by the content layer

- [ ] **Step 4: Re-run the new tests**

Run: `npm test -- tests/plan-validator.test.ts`
Expected: still FAIL until the validator adapter is updated

## Chunk 2: Core Validator Alignment

### Task 2: Replace legacy core validation with a wrapper over `BlueprintValidator`

**Files:**
- Modify: `core/plan-validator.ts`
- Test: `tests/plan-validator.test.ts`

- [ ] **Step 1: Reimplement `PlanValidator` as an adapter**

Use:
- `Blueprint`
- `createBlockFromJSON`
- `BlueprintValidator`

Flow:
- construct a `Blueprint` from `plan.meta.name`
- create blocks from `plan.pipeline`
- run `BlueprintValidator`
- map results into the old `ValidationIssue` shape

- [ ] **Step 2: Preserve top-level plan checks**

Keep lightweight checks for:
- missing `meta.name`
- missing `pipeline`

But delegate block semantics to the modern validator.

- [ ] **Step 3: Run the focused tests**

Run: `npm test -- tests/plan-validator.test.ts`
Expected: PASS

- [ ] **Step 4: Run regression suites**

Run: `npm test -- tests/blueprint-validator.test.ts tests/blueprint-execution.test.ts tests/plan-validator.test.ts`
Expected: PASS

- [ ] **Step 5: Run type-check**

Run: `npm run compile`
Expected: PASS

## Final Verification

- [ ] **Step 1: Run the full suite**

Run: `npm test`
Expected: PASS

Run: `npm run compile`
Expected: PASS

- [ ] **Step 2: Summarize remaining risks**

Document remaining post-Phase-2 risks:
- extraction schema split across model/executor/content
- no true frame-aware execution
- no central block registry yet

