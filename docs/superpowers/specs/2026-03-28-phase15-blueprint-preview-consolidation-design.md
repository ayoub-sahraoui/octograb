# Phase 15: Blueprint Preview Consolidation Design

## Goal

Make blueprint preview generation follow the same shared persistence path as save/load so create, validate, and saved-plan previews all use one contract.

## Scope

- Add a shared `Blueprint -> preview via persistence` helper
- Reuse it in AI create/validate flows
- Keep preview shape unchanged for consumers

## Non-Goals

- No AI UI refactor
- No DB schema migration
- No runtime behavior changes

## Approach

Build the preview from `serializeBlueprintToSavedPlan()` and `createSavedPlanPreview()` instead of mixing direct blueprint preview generation with saved-plan preview generation. This makes persisted and in-memory previews consistent without changing the existing preview payload shape.

## Testing

- Extend persistence tests to cover direct blueprint preview-through-persistence
- Run full tests and compile verification
