# Phase 12: Trace Usability Design

## Goal

Make the Trace tab faster to use during long executions by improving findability and copy workflows.

## Scope

- Filter traces by status
- Search traces by label, type, executor, scope, and error text
- Toggle newest-first vs oldest-first ordering
- Copy the visible filtered traces as JSON
- Copy individual trace sections and full trace JSON from expanded entries

## Non-Goals

- No execution changes
- No persistence changes
- No AI/save-flow refactor

## Approach

Build a small pure filtering helper on top of the Phase 11 display helper, then add lightweight controls to the existing Trace tab. Keep the UI inside the current blueprint builder drawer.

## Testing

- Extend the trace display helper tests to cover filtering and ordering
- Run full tests and TypeScript compile verification
