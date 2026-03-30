# Phase 14: Blueprint Persistence Design

## Goal

Consolidate blueprint save/load and preview preparation around one shared persistence adapter so builder and AI flows stop duplicating the saved-plan contract.

## Scope

- Add a shared adapter for `Blueprint <-> SavedPlan`
- Reuse that adapter in the builder save/load path
- Reuse that adapter in the AI save path
- Preserve the current DB wrapper shape
- Include blueprint descriptions in persisted plan metadata

## Non-Goals

- No DB schema migration
- No compiled-plan persistence yet
- No AI UI refactor

## Approach

Create a pure `blueprint-persistence` module that owns:

- serialization from `Blueprint` to `SavedPlan`
- deserialization from `SavedPlan` to `Blueprint`
- preview generation from a `SavedPlan`

Then switch the builder and AI tool save/load flows to use it.

## Testing

- Add unit tests for shared serialization, deserialization, and preview generation
- Run full tests and compile verification
