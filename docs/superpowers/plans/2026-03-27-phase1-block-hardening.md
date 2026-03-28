# Phase 1 Block Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the highest-impact block-system inconsistencies without introducing a broader architecture refactor.

**Architecture:** Keep the current model/factory/validator/executor structure intact for Phase 1, but remove the most user-visible contract drift. The work is limited to validation coverage, persisted block metadata, honest `switch_frame` behavior, and correct condition `elseChildren` reordering.

**Tech Stack:** TypeScript, MobX models, Vitest, WXT Chrome extension runtime

---

## File Structure

- Modify: `entrypoints/models/blueprint-validator.ts`
  Add validation coverage for runtime-supported block types and tighten block-specific checks without changing the overall validator API.
- Modify: `entrypoints/models/blueprint.ts`
  Preserve serialized block metadata that is currently restored by the factory but not persisted.
- Modify: `entrypoints/models/condition-block.ts`
  Add a way to identify else-branch membership during reordering.
- Modify: `entrypoints/content/env-handler.ts`
  Downgrade `switch_frame` semantics so the response clearly communicates that frame context is not actually switched.
- Modify: `entrypoints/stores/blueprint-executor-store.ts`
  Surface the downgraded `switch_frame` behavior honestly in logs and execution flow.
- Modify: `tests/blueprint-validator.test.ts`
  Add regression tests for the new validator coverage.
- Modify: `tests/blueprint-execution.test.ts`
  Add regression tests for serialization preservation and `elseChildren` reorder behavior.

## Chunk 1: Validator Coverage

### Task 1: Align blueprint validation with supported block types

**Files:**
- Modify: `entrypoints/models/blueprint-validator.ts`
- Test: `tests/blueprint-validator.test.ts`

- [ ] **Step 1: Write failing validator tests for supported newer block types**

Add tests covering:
- `assert` should be accepted as a valid block type
- `set_variable` should be accepted and require `config.name`
- `get_variable` should be accepted and require `config.name`
- `hover` should be accepted and require selector unless loop-scoped
- `switch_frame` should be accepted and require `config.target`
- `macro` should be accepted and require `config.macroId`

- [ ] **Step 2: Run the validator tests to verify failure**

Run: `npm test -- tests/blueprint-validator.test.ts`
Expected: FAIL with invalid block type and/or missing validation coverage assertions

- [ ] **Step 3: Expand `BlueprintValidator.validateBlockType` to include all executor-supported types**

Update the valid type list in `entrypoints/models/blueprint-validator.ts` so it matches the runtime router in `entrypoints/stores/blueprint-executor-store.ts`.

- [ ] **Step 4: Add minimal config validation for the new block types**

Implement focused checks:
- `assert`: require `config.check`; require selector unless loop-scoped; require `value` for text-based checks
- `set_variable`: require non-empty `config.name`
- `get_variable`: require non-empty `config.name`
- `hover`: require selector unless loop-scoped
- `switch_frame`: require `target` to be defined
- `macro`: require non-empty `macroId`

- [ ] **Step 5: Re-run validator tests**

Run: `npm test -- tests/blueprint-validator.test.ts`
Expected: PASS

- [ ] **Step 6: Run type-check**

Run: `npm run compile`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add entrypoints/models/blueprint-validator.ts tests/blueprint-validator.test.ts
git commit -m "fix: align blueprint validator with supported block types"
```

## Chunk 2: Serialization and Reordering Regressions

### Task 2: Preserve serialized block metadata

**Files:**
- Modify: `entrypoints/models/blueprint.ts`
- Test: `tests/blueprint-execution.test.ts`

- [ ] **Step 1: Write a failing serialization regression test**

Add a test proving that after `Blueprint.toJSON()` and `Blueprint.fromJSON()`:
- `description` is preserved
- `maxExecutionTime` is preserved

- [ ] **Step 2: Run the execution tests to verify failure**

Run: `npm test -- tests/blueprint-execution.test.ts`
Expected: FAIL because the restored block is missing one or both fields

- [ ] **Step 3: Update `Blueprint.serializeBlock` to persist the missing fields**

Add `description` and `maxExecutionTime` to the serialized block payload in `entrypoints/models/blueprint.ts`.

- [ ] **Step 4: Re-run the execution tests**

Run: `npm test -- tests/blueprint-execution.test.ts`
Expected: PASS for the new serialization regression

- [ ] **Step 5: Commit**

```bash
git add entrypoints/models/blueprint.ts tests/blueprint-execution.test.ts
git commit -m "fix: preserve block metadata during blueprint serialization"
```

### Task 3: Fix `condition` else-branch reordering

**Files:**
- Modify: `entrypoints/models/condition-block.ts`
- Modify: `entrypoints/models/blueprint.ts`
- Test: `tests/blueprint-execution.test.ts`

- [ ] **Step 1: Write a failing reorder test for else-branch blocks**

Add a test that creates a `ConditionBlock` with at least two `elseChildren`, reorders one of them, and asserts the reorder happens inside the else branch rather than the then branch.

- [ ] **Step 2: Run the execution tests to verify failure**

Run: `npm test -- tests/blueprint-execution.test.ts`
Expected: FAIL because `Blueprint.reorderBlock()` picks `parent.children`

- [ ] **Step 3: Add explicit branch ownership metadata for else children**

Update `entrypoints/models/condition-block.ts` so `addElseChild()` marks children with branch metadata such as `branch = 'else'` or an equivalent explicit flag.

- [ ] **Step 4: Update `Blueprint.reorderBlock()` to route else children correctly**

Use the explicit branch metadata to choose the right container:
- `parent.children` for normal child blocks
- `parent.elseChildren` for else-branch blocks

Keep top-level and normal child reordering behavior unchanged.

- [ ] **Step 5: Re-run the execution tests**

Run: `npm test -- tests/blueprint-execution.test.ts`
Expected: PASS

- [ ] **Step 6: Run type-check**

Run: `npm run compile`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add entrypoints/models/condition-block.ts entrypoints/models/blueprint.ts tests/blueprint-execution.test.ts
git commit -m "fix: reorder condition else branches correctly"
```

## Chunk 3: Honest `switch_frame` Downgrade

### Task 4: Downgrade `switch_frame` behavior so the product does not over-promise

**Files:**
- Modify: `entrypoints/content/env-handler.ts`
- Modify: `entrypoints/stores/blueprint-executor-store.ts`
- Test: `tests/blueprint-execution.test.ts`

- [ ] **Step 1: Add a focused behavior test or narrow unit assertion around downgraded semantics**

If direct env-handler testing is too heavy for Phase 1, add an executor-level regression test around the message/result contract or add a narrow pure helper test if you extract the response shaping into a helper.

- [ ] **Step 2: Update the env-handler response message**

Change `ENV_SWITCH_FRAME` success payload in `entrypoints/content/env-handler.ts` so it explicitly says:
- frame exists
- execution context was not switched
- later selectors still need frame-aware support elsewhere

Do not pretend the switch succeeded in the usual sense.

- [ ] **Step 3: Update executor logging and handling**

In `entrypoints/stores/blueprint-executor-store.ts`:
- treat the result as a degraded capability, not a full context switch
- log a warning-level message instead of a plain success message
- preserve successful execution only as “frame found / feature limited”

- [ ] **Step 4: Re-run targeted tests**

Run: `npm test -- tests/blueprint-execution.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full relevant verification set**

Run: `npm test -- tests/blueprint-validator.test.ts tests/blueprint-execution.test.ts`
Expected: PASS

Run: `npm run compile`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add entrypoints/content/env-handler.ts entrypoints/stores/blueprint-executor-store.ts tests/blueprint-execution.test.ts
git commit -m "chore: downgrade switch frame behavior for current runtime limits"
```

## Final Verification

- [ ] **Step 1: Run the complete Phase 1 verification**

Run: `npm test`
Expected: PASS

Run: `npm run compile`
Expected: PASS

- [ ] **Step 2: Smoke-check saved blueprint flow**

Manually verify in the app that:
- a block description survives save/reload
- a block max execution time survives save/reload
- blueprints using `assert`, `hover`, variables, macro, and `switch_frame` no longer show invalid-type validation errors
- `switch_frame` messaging now clearly communicates degraded behavior

- [ ] **Step 3: Summarize Phase 1 residual risks**

Document remaining post-Phase-1 risks:
- stale `core/types.ts` / `core/plan-validator.ts`
- split extraction schema
- no true frame-aware execution
- block registry still duplicated

