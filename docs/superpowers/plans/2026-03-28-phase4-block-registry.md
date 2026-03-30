# Phase 4 Block Registry Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a central block registry so block type metadata is defined once and reused by the factory, validator, and executor dispatch.

**Architecture:** Add a `block-registry` module that owns the known block types, default labels, block constructors, validation hooks, child-capability metadata, and executor handler names. Refactor `block-factory.ts`, `blueprint-validator.ts`, and the executor router to delegate to this registry instead of keeping parallel block-type switches.

**Tech Stack:** TypeScript, MobX models, Vitest

---

## File Structure

- Add: `entrypoints/models/block-registry.ts`
  Central block registry and registry helper types.
- Modify: `entrypoints/models/block-factory.ts`
  Replace constructor switch with registry lookup.
- Modify: `entrypoints/models/blueprint-validator.ts`
  Replace hard-coded block type lists and per-type config switching with registry-driven validation hooks where practical.
- Modify: `entrypoints/stores/blueprint-executor-store.ts`
  Replace type-dispatch switch with registry-driven executor method lookup.
- Modify: `tests/blueprint-execution.test.ts`
  Expand coverage to newer block types and registry-backed creation if needed.
- Add: `tests/block-registry.test.ts`
  Verify the registry covers all supported block types and dispatch metadata.

## Chunk 1: Registry Coverage

### Task 1: Introduce the central registry and lock down supported block types

**Files:**
- Add: `entrypoints/models/block-registry.ts`
- Add: `tests/block-registry.test.ts`
- Modify: `tests/blueprint-execution.test.ts`

- [ ] **Step 1: Write failing tests for registry coverage**

Add tests covering:
- the registry exposes all supported block types
- each registered type can create a block from minimal JSON
- executor handler metadata exists for each registered type

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm test -- tests/block-registry.test.ts`
Expected: FAIL because the registry does not exist yet

- [ ] **Step 3: Add the central block registry**

Define registry entries containing:
- `type`
- `defaultLabel`
- `create(json)`
- `validate?(block, helpers)`
- `allowsChildren`
- `executorMethod`

- [ ] **Step 4: Re-run focused tests**

Run: `npm test -- tests/block-registry.test.ts`
Expected: PASS

## Chunk 2: Factory, Validator, and Executor Adoption

### Task 2: Adopt the registry in `block-factory.ts`

**Files:**
- Modify: `entrypoints/models/block-factory.ts`
- Test: `tests/blueprint-execution.test.ts`

- [ ] **Step 1: Replace factory switch with registry lookup**

Use the registry to:
- find the entry by `json.type`
- build the block
- preserve the existing serialized-property replay behavior

- [ ] **Step 2: Re-run focused factory/execution tests**

Run: `npm test -- tests/blueprint-execution.test.ts`
Expected: PASS

### Task 3: Adopt the registry in `blueprint-validator.ts`

**Files:**
- Modify: `entrypoints/models/blueprint-validator.ts`
- Test: `tests/blueprint-validator.test.ts`

- [ ] **Step 1: Replace hard-coded valid type list**

Derive valid types from the registry instead of keeping a manual list.

- [ ] **Step 2: Move per-type config validation into registry hooks where practical**

Delegate block-specific config validation to registry entries while keeping shared validator responsibilities in `BlueprintValidator`.

- [ ] **Step 3: Replace child-capability hard-coding with registry metadata**

Use `allowsChildren` metadata instead of a separate manual type list.

- [ ] **Step 4: Re-run validator tests**

Run: `npm test -- tests/blueprint-validator.test.ts`
Expected: PASS

### Task 4: Adopt the registry in executor dispatch

**Files:**
- Modify: `entrypoints/stores/blueprint-executor-store.ts`
- Test: `tests/block-registry.test.ts`

- [ ] **Step 1: Replace the executor switch with registry method lookup**

Dispatch `executeBlockWithType()` through the registry’s `executorMethod` metadata instead of a hard-coded switch.

- [ ] **Step 2: Preserve unknown-type handling**

Keep the current warning behavior if a block type somehow lacks a registry entry or handler.

- [ ] **Step 3: Run targeted regression suites**

Run: `npm test -- tests/block-registry.test.ts tests/blueprint-validator.test.ts tests/blueprint-execution.test.ts`
Expected: PASS

- [ ] **Step 4: Run type-check**

Run: `npm run compile`
Expected: PASS

## Final Verification

- [ ] **Step 1: Run the full suite**

Run: `npm test`
Expected: PASS

Run: `npm run compile`
Expected: PASS

- [ ] **Step 2: Summarize remaining risks**

Document remaining post-Phase-4 risks:
- no compile step between editor model and executor plan yet
- `switch_frame` still intentionally downgraded
- validator logic is centralized, but executor semantics are still runtime-bound

