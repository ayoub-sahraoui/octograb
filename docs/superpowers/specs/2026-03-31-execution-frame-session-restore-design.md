# Execution Frame Session Restore Design

## Goal

Make the in-page execution glow restore earlier and more reliably across full navigations by using early content-script startup plus tab-scoped session state, without adding heavy background reinjection logic.

## Design

- Keep the existing single content script and execution frame controller.
- Move the content script to `document_start` so it can restore the glow as early as possible on new documents.
- Add a small execution-frame session state helper that stores a per-tab `active` flag in `browser.storage.session`.
- When execution starts, the executor both shows the frame and marks the current tab as frame-active.
- When execution stops, errors, pauses, or completes, the executor hides the frame and clears the tab flag.
- On content-script boot, the script resolves its current tab id and checks whether that tab is marked active. If yes, it shows the frame immediately before the sidepanel reconnects.
- Keep the current message-driven `SHOW_EXECUTION_FRAME` / `HIDE_EXECUTION_FRAME` flow and the DOM self-heal observer for SPA-style DOM replacement.

## Why This Approach

- Faster restore than waiting for the executor to reconnect after navigation.
- Lighter than `chrome.scripting.executeScript()` reinjection on every navigation.
- Uses `storage.session`, which matches temporary runtime state better than `storage.local`.
- Fits the current WXT architecture with minimal moving parts.

## Files

- Modify: `entrypoints/content.ts`
- Modify: `entrypoints/stores/blueprint-executor-store.ts`
- Create: `entrypoints/content/execution-frame-session.ts`
- Add tests: `tests/execution-frame-session.test.ts`
