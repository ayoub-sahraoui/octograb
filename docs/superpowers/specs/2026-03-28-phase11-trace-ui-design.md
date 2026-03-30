# Phase 11: Trace UI Design

## Goal

Expose the richer Phase 10 execution trace context in the sidepanel without overwhelming long-running executions.

## Scope

- Keep the existing Trace tab in the blueprint builder
- Render each trace entry as a compact summary row with expandable details
- Show structured sections for block metadata, execution metadata, scope, variables, macro stack, and errors
- Keep the normal trace list readable during long runs

## Non-Goals

- No AI refactor
- No execution behavior changes
- No persistence changes
- No separate debug page or modal

## Approach

Use the existing Accordion UI primitive so only one or a few trace entries need to be expanded at a time. Add a small pure formatting helper that turns raw trace details into stable display sections and summary chips. That helper gets unit tests, while the page reuses it for rendering.

## UI Shape

- Compact header row:
  - status dot
  - block label
  - block type
  - timestamp
  - duration if present
  - small hints such as scope depth, variable count, or macro count when available
- Expanded body:
  - block details
  - scope chain
  - variable snapshot
  - macro stack
  - error details

## Testing

- Unit-test the trace formatting helper
- Run existing execution and compile verification to ensure the UI changes do not break runtime code
