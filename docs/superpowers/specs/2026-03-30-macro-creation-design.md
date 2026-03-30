# Macro Creation Design

**Goal**

Let users create reusable macros directly from the blueprint builder by saving any block subtree as a macro, then immediately reuse that macro through the existing `Macro` block config.

## Problem

The current app supports executing and selecting saved macros, but it does not expose any UI for creating them. That leaves the `Macro` block as a consumer-only feature and makes the macro registry feel incomplete.

## Recommended Approach

Save macros from a block subtree.

Each block card should expose a `Save as Macro` action. That action captures the clicked block plus all of its nested children, opens a small create-macro dialog, and saves the subtree into `macroRegistryStore`.

This is the simplest model because it matches the existing block tree:
- one parent block
- all nested children
- one reusable workflow fragment

## UX

### Save Entry Point

Add `Save as Macro` to the block card actions. The user should not need to leave the builder or open a separate library page just to create a macro.

### Create Dialog

The dialog should include:
- `Name`
- `Description`
- `Parameters`

For v1, parameters are manually declared rows with:
- parameter name
- optional description
- optional default value
- required toggle

The dialog should also show a short summary of what will be saved:
- root block label/type
- total block count in the subtree

### After Save

After a successful save:
- the macro is registered in `macroRegistryStore`
- the dialog closes
- the builder stays on the current blueprint
- the macro immediately appears in the macro picker

## Architecture

### Builder-side macro creation

Add a small serialization helper that converts any block subtree into the stored macro block shape. This should reuse the existing block JSON behavior rather than inventing a second serialization format.

### Registry integration

Use the existing `macroRegistryStore.createMacroDefinition(...)` and `registerMacro(...)` flow.

### Macro config integration

The `Macro` block config should gain a `Create New Macro` shortcut so users can recover from an empty library state without being stuck. That shortcut can open the same creation dialog with no prefilled subtree context in this phase, or preferably open the dialog only when launched from the builder block action.

For v1, the strongest requirement is the block-card entry point. The macro config shortcut is secondary.

## Scope

### Included

- Save any block subtree as a new macro
- Name/describe the macro
- Define parameters
- Persist macros in the existing registry
- Show newly created macros in the macro picker immediately

### Not Included

- Editing existing macros
- Deleting macros from a dedicated library UI
- Saving arbitrary multi-select block groups
- Previewing nested macro blocks before saving
- Full macro library page

## Data Flow

1. User opens block actions and clicks `Save as Macro`
2. Builder captures the clicked block subtree
3. Dialog collects macro metadata and parameter definitions
4. Builder serializes subtree blocks
5. Registry creates and saves the macro definition
6. Macro config picker reflects the updated registry

## Error Handling

- Empty macro name should be blocked in the dialog
- Duplicate names are allowed in v1 because registry identity is based on `id`, not name
- Save failures should surface a toast or inline error
- Invalid parameter rows should be filtered or rejected before save

## Testing

- subtree serialization preserves nested blocks
- macro definition creation uses the correct stored block shape
- create dialog helper validates rows and payload shape
- macro picker reflects newly registered macros
