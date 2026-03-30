# Phase 8 Variable Scopes Design

## Goal

Make variable scopes mean distinct things in both runtime execution and compile-time analysis.

## Scope Semantics

- `local`: scoped to the current local execution boundary such as a loop iteration, condition branch, pagination step, or nested extraction child run
- `global`: shared for the current execution only
- `blueprint`: shared across executions for the same blueprint

## Runtime Design

Introduce a small runtime scope engine that:
- tracks a stack of local scopes
- stores global values for the current run
- stores blueprint values separately and persists them per blueprint
- resolves `{{variable}}` references in nearest-first order:
  - local
  - global
  - blueprint

The executor owns the persistence boundary for blueprint-scoped variables.

## Compile-Time Design

Keep compile-time scope reasoning in `blueprint-analysis.ts`.

The analysis pass should:
- treat local definitions as visible only within the current local boundary
- allow global and blueprint definitions to remain visible after the defining block
- keep unresolved template references as warnings

## Expected Outcome

- local variables stop leaking across loop iterations and branches
- global variables remain execution-wide
- blueprint variables become meaningfully different from global variables
- compile-time validation matches runtime visibility more closely
