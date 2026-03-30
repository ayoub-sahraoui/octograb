# Phase 10: Execution Observability Design

## Goal

Improve executor debugging without changing execution behavior, persistence, or AI flows.

## Scope

- Add a shared runtime-context builder for execution traces
- Include compiled block metadata in trace details
- Include scope summary, variable snapshots, and macro stack in trace details
- Improve executor logs with concise compiled/runtime context summaries

## Non-Goals

- No AI integration refactor
- No UI redesign
- No persistence schema changes
- No new block capabilities

## Design

### Shared Observability Helper

Create a pure helper that receives:

- compiled block
- current scope
- execution variable scopes
- active macro stack
- optional attempt count
- optional error

It returns a stable trace-details payload containing:

- block identity and execution metadata
- normalized config
- scope chain summary
- variable scope snapshot
- macro stack
- optional error summary

### Variable Scope Snapshot

Expose a read-only snapshot method on `ExecutionVariableScopes` so debugging code can inspect runtime state without reaching into private maps.

### Executor Wiring

Use the helper from `executeBlock()` for:

- `start` trace entries
- `success` trace entries
- `error` trace entries

Also add concise log lines for:

- compiled executor metadata
- runtime scope, macro stack, and variable counts

## Testing

- unit-test variable snapshots
- unit-test trace detail construction
- run existing execution tests to ensure no behavior regressions
