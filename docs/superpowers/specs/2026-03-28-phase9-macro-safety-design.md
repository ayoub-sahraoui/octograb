# Phase 9 Macro Safety Design

## Goal

Prevent recursive or runaway macro expansion in both compile-time validation and runtime execution.

## Scope

- Detect direct and indirect macro cycles
- Enforce a max macro expansion depth
- Enforce a max expanded block budget
- Keep parameter validation from earlier phases
- Add runtime guardrails as a backstop even when compile-time validation is bypassed

## Design

Introduce a shared `macro-safety.ts` module that owns:
- maximum depth and expansion constants
- serialized block counting
- runtime guard checks
- compile-time recursive macro graph analysis

Compile-time analysis uses macro definitions from the macro registry to detect:
- self recursion
- indirect cycles
- oversized expansions

Runtime execution uses the same limits with:
- an active macro stack
- a cumulative expanded block count

## Expected Outcome

- recursive macros fail before execution
- runtime is still protected if a bad macro slips through
- limits are explicit and easy to tune later
