# Phase 7 Variable And Macro Hardening Design

## Goal

Add compile-time checks for variable usage order and macro parameter contracts so invalid automation flows are flagged before execution.

## Scope

- Detect unresolved `{{variable}}` references
- Warn when `get_variable` reads a variable before any earlier `set_variable` defines it and no default is provided
- Validate macro parameters against registered macro definitions
- Surface those issues through the existing validation pipeline

## Non-Goals

- No typed variable values yet
- No scope-aware variable model yet
- No macro expansion caching or cycle detection yet

## Architecture

Keep these rules in `blueprint-analysis.ts` as a sequential compile-time pass over compiled blocks.

This preserves a clean split:
- compiler builds the execution shape
- analysis reasons about execution order and contracts
- validator reports issues from shared analysis

Macro parameter validation uses the existing macro registry when definitions are available.

## Expected Outcome

- Broken variable references are caught earlier
- Missing macro parameters are surfaced before runtime expansion
- Validation gets closer to “what will really fail when executed”
