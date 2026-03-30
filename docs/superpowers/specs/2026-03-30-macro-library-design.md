# Macro Library Design

**Goal**

Add a dedicated Macro Library page in the sidepanel so users can browse, inspect, edit metadata and parameters, and delete saved macros.

## Problem

Macros can now be created from block subtrees and consumed by the `Macro` block, but there is no place in the UI to manage them after save. That makes macros hard to discover, hard to maintain, and easy to forget.

## Recommended Approach

Create a dedicated sidepanel page for macros.

This page should sit in the main app navigation beside the other first-class surfaces. It should list all saved macros, show a compact summary for each one, and provide edit/delete actions without trying to become a full macro block editor yet.

This is the right v1 because:
- macros are now a real reusable asset
- users need a stable place to manage them
- editing block internals would be a much larger feature than needed right now

## UX

### Navigation

Add a `Macros` nav item to the main sidepanel navigation and router.

### Page Layout

The page should have:
- a page title and short description
- an empty state when no macros exist
- a list of macro cards when macros exist

Each macro card should show:
- macro name
- description
- parameter count
- block count
- updated timestamp if available

Each card should allow:
- preview summary
- edit metadata and parameters
- delete

### Editing

Editing should happen in a dialog using the same app dialog style:
- name
- description
- parameters

This should reuse the same parameter-row model as macro creation where possible.

### Preview

V1 preview should stay summary-level only:
- root block count
- parameter list
- metadata

Do not render full nested block trees yet.

## Architecture

### Data source

Use `macroRegistryStore` as the single source of truth for:
- list
- update
- delete

### Display helpers

Add a focused helper to build macro card display data:
- sorted macros
- block count
- parameter count
- empty state info

### Edit flow

Editing a macro should preserve its existing `id`, `createdAt`, and stored blocks, while updating:
- name
- description
- parameters

This keeps the runtime contract stable.

## Scope

### Included

- dedicated sidepanel macro library page
- macro listing
- macro summary cards
- edit metadata and parameters
- delete macros

### Not Included

- editing the saved macro blocks themselves
- opening a macro in a block-tree editor
- inline block previews
- macro folders/tags/search

## Error Handling

- missing macro on edit should gracefully close or show a “not found” state
- delete failures should show an error toast
- invalid or empty names should be blocked

## Testing

- helper builds correct card summaries
- editing preserves id and blocks while updating metadata
- delete removes macro from store/list
- router/nav includes the new page
