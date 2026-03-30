# Phase 13: Trace Summary Design

## Goal

Add a compact run overview to the Trace tab so users can understand execution health and timing at a glance before drilling into individual trace entries.

## Scope

- Derive run stats from the currently visible traces
- Show counts by trace status
- Show average and slowest durations
- Show a compact first-to-last timeline span
- Show the latest visible block and status

## Non-Goals

- No charts
- No execution behavior changes
- No persistence changes
- No save/preview refactor yet

## Approach

Extend the existing trace display helper with a pure summary function, then render a small stats strip above the Trace tab filters. Base the stats on the filtered trace list so the summary matches what the user is currently inspecting.

## Testing

- Add unit coverage for the summary helper
- Run full tests and compile verification
