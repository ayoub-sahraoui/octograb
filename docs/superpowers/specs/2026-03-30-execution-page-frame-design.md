# Execution Page Frame Design

**Goal**

Show a subtle glowing frame around the active webpage while a blueprint is running so users can immediately see that OctoGrab is actively working on the current tab.

## Problem

Execution currently has strong feedback inside the extension, but little or no visible feedback inside the page itself. Users can be left wondering whether the automation is still active, especially during waits, loops, or off-screen actions.

## Recommended Approach

Inject a fixed, pointer-events-none page overlay from the content script that renders only a soft edge glow around the page viewport.

The overlay should:
- cover the current webpage only
- keep the center transparent
- use the app’s main emerald theme color
- pulse softly while running
- disappear immediately on pause, stop, error, or completion

This is better than element highlighting for this use case because the user asked for a page-level “automation active” frame, not a target-element indicator.

## UX

### Visual behavior

- a glowing emerald frame around the four viewport edges
- soft blur and low opacity so it does not obstruct content
- subtle pulse animation while execution is active
- no text, no badge, no controls

### Execution states

- `running`: frame visible
- `paused`: hidden
- `completed`: hidden
- `stopped`: hidden
- `error`: hidden

## Architecture

### Content-side frame controller

Add a tiny content-side controller responsible for:
- creating the overlay once
- toggling visibility
- cleaning up styles and DOM nodes when hidden

This should live outside the env handler because it is purely page-UI state, not DOM automation behavior.

### Messaging

Add two lightweight message types:
- `SHOW_EXECUTION_FRAME`
- `HIDE_EXECUTION_FRAME`

The existing content script message listener in `entrypoints/content.ts` can route these directly to the new frame controller.

### Executor lifecycle integration

Send:
- `SHOW_EXECUTION_FRAME` when execution starts
- `SHOW_EXECUTION_FRAME` when execution resumes
- `HIDE_EXECUTION_FRAME` when execution pauses
- `HIDE_EXECUTION_FRAME` when execution stops
- `HIDE_EXECUTION_FRAME` in `finally` so completion/error cleanup is guaranteed

## Scope

### Included

- page-edge glow while running
- executor lifecycle wiring
- content script overlay controller

### Not Included

- element highlighting
- floating badge or inline controls
- per-block state indicators
- configurable colors/themes

## Testing

- controller toggles overlay on and off correctly
- repeated show/hide calls do not duplicate nodes
- overlay styles use the expected fixed, non-interactive frame structure
