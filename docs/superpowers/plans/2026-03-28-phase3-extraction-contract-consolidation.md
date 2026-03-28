# Phase 3 Extraction Contract Consolidation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the extraction boundary so the content-script RPC layer uses one explicit DOM extraction contract instead of relying on duplicated `ExtractionField` shapes.

**Architecture:** Keep the rich extraction model in the blueprint editor and keep static fields, formulas, defaults, and required-field enforcement in the executor. Introduce a dedicated DOM extraction payload type plus a small adapter that converts model fields into the content-script contract. Make the executor, content handler, and execution environment all depend on that shared boundary type.

**Tech Stack:** TypeScript, MobX models, Vitest, Chrome extension content script messaging

---

## File Structure

- Modify: `core/types.ts`
  Replace the ambiguous extraction boundary type with a dedicated DOM extraction contract.
- Modify: `core/env.ts`
  Update the environment interface to use the DOM extraction contract explicitly.
- Add: `core/extraction-contract.ts`
  Define the DOM extraction field type and adapter helpers shared across runtime boundaries.
- Modify: `entrypoints/stores/blueprint-executor-store.ts`
  Replace inline field-shaping logic with the shared adapter.
- Modify: `entrypoints/content/env-handler.ts`
  Consume the explicit DOM extraction field type for `ENV_EXTRACT_RECORD`.
- Modify: `core/ai/dom-snapshot.ts`
  Keep the AI extraction preview contract aligned with the DOM extraction boundary where applicable.
- Add: `tests/extraction-contract.test.ts`
  Validate model-to-DOM field adaptation and preserve executor-side semantics boundaries.

## Chunk 1: Explicit DOM Extraction Contract

### Task 1: Create and test the shared DOM extraction boundary

**Files:**
- Add: `core/extraction-contract.ts`
- Modify: `core/types.ts`
- Modify: `core/env.ts`
- Add: `tests/extraction-contract.test.ts`

- [ ] **Step 1: Write failing extraction contract tests**

Add tests covering:
- adapting a standard extracted model field into the DOM payload
- omitting editor-only properties like `mode`, `formula`, `defaultValue`, and static-field config from the DOM payload
- preserving selector, selector type, attribute, transformers, required, and multiple flags

- [ ] **Step 2: Run the new tests to verify failure**

Run: `npm test -- tests/extraction-contract.test.ts`
Expected: FAIL because the contract/helper does not exist yet

- [ ] **Step 3: Add the shared DOM extraction contract**

Create `core/extraction-contract.ts` with:
- a `DomExtractionField` type for content-script extraction
- a helper like `toDomExtractionField(modelField)` for converting model fields
- a helper for arrays if useful

- [ ] **Step 4: Update shared core typings to use the new boundary type**

In `core/types.ts` and `core/env.ts`, reference the explicit DOM extraction contract instead of the old ambiguous extraction field type.

- [ ] **Step 5: Re-run focused tests**

Run: `npm test -- tests/extraction-contract.test.ts`
Expected: PASS

## Chunk 2: Executor and Content Alignment

### Task 2: Replace inline extraction payload shaping with the shared adapter

**Files:**
- Modify: `entrypoints/stores/blueprint-executor-store.ts`
- Modify: `entrypoints/content/env-handler.ts`
- Modify: `core/ai/dom-snapshot.ts`
- Test: `tests/extraction-contract.test.ts`

- [ ] **Step 1: Update executor extraction payload building**

Replace the inline `envFields` mapping in `entrypoints/stores/blueprint-executor-store.ts` with the shared adapter so the DOM payload is built in one place only.

- [ ] **Step 2: Update the content handler to consume the explicit contract**

Switch `ENV_EXTRACT_RECORD` handling in `entrypoints/content/env-handler.ts` to use `DomExtractionField`.

- [ ] **Step 3: Keep AI/test extraction helpers aligned**

Update any relevant helper signatures in `core/ai/dom-snapshot.ts` to match the explicit DOM extraction contract where appropriate, without pulling in editor-only extraction semantics.

- [ ] **Step 4: Add or update regression coverage**

Extend `tests/extraction-contract.test.ts` if needed to verify the executor-side adapter output matches the content-side expectations.

- [ ] **Step 5: Run targeted regression suites**

Run: `npm test -- tests/extraction-contract.test.ts tests/blueprint-execution.test.ts`
Expected: PASS

- [ ] **Step 6: Run type-check**

Run: `npm run compile`
Expected: PASS

## Final Verification

- [ ] **Step 1: Run the full suite**

Run: `npm test`
Expected: PASS

Run: `npm run compile`
Expected: PASS

- [ ] **Step 2: Summarize remaining risks**

Document remaining post-Phase-3 risks:
- no central block registry yet
- no compile step between editor model and executor plan
- `switch_frame` still intentionally downgraded

