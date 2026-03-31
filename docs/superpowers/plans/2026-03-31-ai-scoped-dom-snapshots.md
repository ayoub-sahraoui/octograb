# AI Scoped DOM Snapshots Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scoped DOM snapshot support so AI helper calls can operate on the relevant subtree instead of a truncated full-page snapshot.

**Architecture:** Extend the existing content-side DOM snapshot path with optional scope parameters and metadata, then update `field-suggester` and `selector-generator` to request scoped HTML when context is available. Keep the message type backward-compatible so existing callers and tests continue to work.

**Tech Stack:** TypeScript, WXT content messaging, Vitest

---

## Chunk 1: Content Snapshot Scoping

### Task 1: Extend snapshot types and serializer entry point

**Files:**
- Modify: `core/ai/dom-snapshot.ts`
- Test: `tests/dom-snapshot.test.ts`

- [ ] **Step 1: Write the failing test for loop-scoped snapshots**

Create `tests/dom-snapshot.test.ts` with a case that builds a small DOM, requests a loop-scoped snapshot, and expects the returned HTML to be rooted in the first loop item instead of the full page.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/dom-snapshot.test.ts`
Expected: FAIL because scoped snapshot support does not exist yet.

- [ ] **Step 3: Add snapshot input and metadata types**

In `core/ai/dom-snapshot.ts`, add:

- `DomSnapshotOptions`
- richer `meta` fields for `scopeMode`, `scopeResolved`, and `scopeFallbackReason`

Keep the current return shape backward-compatible for existing consumers.

- [ ] **Step 4: Implement scoped root resolution**

Add a helper that resolves the snapshot root in this order:

- scoped descendant inside first loop match
- first loop match
- full page body children

Invalid selector handling should return page fallback metadata, not throw.

- [ ] **Step 5: Update `createDomSnapshot` to accept options**

Refactor `createDomSnapshot` to serialize from the resolved root while preserving the existing serializer behavior for page snapshots.

- [ ] **Step 6: Run the new test**

Run: `npm.cmd test -- tests/dom-snapshot.test.ts`
Expected: PASS

- [ ] **Step 7: Add fallback coverage**

Add tests for:

- nested `scopeSelector`
- invalid or missing scope falling back to loop scope or page scope

- [ ] **Step 8: Run the focused snapshot suite**

Run: `npm.cmd test -- tests/dom-snapshot.test.ts`
Expected: PASS

## Chunk 2: Content Bridge Wiring

### Task 2: Make `ENV_DOM_SNAPSHOT` accept optional scope data

**Files:**
- Modify: `entrypoints/content/env-handler.ts`
- Modify: `core/messaging.ts`
- Test: `tests/env-handler.test.ts`

- [ ] **Step 1: Write the failing bridge test**

Add or extend a test proving the env handler passes optional snapshot scope arguments to `createDomSnapshot`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/env-handler.test.ts`
Expected: FAIL because the handler ignores scope data today.

- [ ] **Step 3: Update the message typing**

Adjust `core/messaging.ts` comments/types if needed so `ENV_DOM_SNAPSHOT` can include optional `data`.

- [ ] **Step 4: Update the env handler**

Modify `entrypoints/content/env-handler.ts` so:

- `ENV_DOM_SNAPSHOT` reads optional `loopSelector`, `scopeSelector`, and `maxMatches`
- those options are forwarded to `createDomSnapshot`

- [ ] **Step 5: Run the env-handler suite**

Run: `npm.cmd test -- tests/env-handler.test.ts`
Expected: PASS

## Chunk 3: Field Suggestion Integration

### Task 3: Use scoped snapshots in `suggestFields`

**Files:**
- Modify: `core/ai/field-suggester.ts`
- Test: `tests/field-suggester.test.ts`

- [ ] **Step 1: Write the failing helper test**

Add `tests/field-suggester.test.ts` with a mocked `sendToContentScript` assertion that `suggestFields` forwards `loopSelector` and `scopeSelector` when scope context is provided.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/field-suggester.test.ts`
Expected: FAIL because the helper currently requests an unscoped snapshot.

- [ ] **Step 3: Update the snapshot request**

Modify `core/ai/field-suggester.ts` so the `ENV_DOM_SNAPSHOT` request includes:

- `loopSelector`
- `scopeSelector`

when available.

- [ ] **Step 4: Update prompt context**

Mention the returned snapshot scope mode in the context text so the model knows whether it saw a page, loop item, or narrowed sub-scope.

- [ ] **Step 5: Run the focused helper test**

Run: `npm.cmd test -- tests/field-suggester.test.ts`
Expected: PASS

## Chunk 4: Selector Generation Integration

### Task 4: Add optional scope context to `generateSelectorFromElement`

**Files:**
- Modify: `core/ai/selector-generator.ts`
- Modify: `entrypoints/sidepanel/components/selector-input.tsx`
- Test: `tests/selector-generator.test.ts`

- [ ] **Step 1: Write the failing selector-generator test**

Add `tests/selector-generator.test.ts` with a mocked `sendToContentScript` assertion that scope context is forwarded to the snapshot request when provided.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/selector-generator.test.ts`
Expected: FAIL because the generator currently only requests a full-page snapshot.

- [ ] **Step 3: Extend the generator signature**

Add an optional scope context parameter to `generateSelectorFromElement`, keeping existing callers valid.

- [ ] **Step 4: Thread parent scope from the selector UI**

Update `entrypoints/sidepanel/components/selector-input.tsx` so AI extract passes the computed parent selector as loop or scope context when available.

- [ ] **Step 5: Request scoped snapshots in the generator**

Update `core/ai/selector-generator.ts` to send those scope parameters in the `ENV_DOM_SNAPSHOT` request and reflect the resolved scope in prompt context.

- [ ] **Step 6: Run the focused selector-generator test**

Run: `npm.cmd test -- tests/selector-generator.test.ts`
Expected: PASS

## Chunk 5: Final Verification

### Task 5: Run full regression verification

**Files:**
- Modify: `vitest.config.ts` only if required for new focused tests

- [ ] **Step 1: Run TypeScript verification**

Run: `npm.cmd run compile`
Expected: PASS

- [ ] **Step 2: Run the full test suite**

Run: `npm.cmd test`
Expected: PASS

- [ ] **Step 3: Review changed files for scope creep**

Confirm only the scoped snapshot path, helper integrations, and related tests were touched.

- [ ] **Step 4: Commit**

```bash
git add core/ai/dom-snapshot.ts core/ai/field-suggester.ts core/ai/selector-generator.ts core/messaging.ts entrypoints/content/env-handler.ts entrypoints/sidepanel/components/selector-input.tsx tests/dom-snapshot.test.ts tests/field-suggester.test.ts tests/selector-generator.test.ts tests/env-handler.test.ts vitest.config.ts docs/superpowers/specs/2026-03-31-ai-scoped-dom-snapshots-design.md docs/superpowers/plans/2026-03-31-ai-scoped-dom-snapshots.md
git commit -m "feat: add scoped DOM snapshots for AI helpers"
```
