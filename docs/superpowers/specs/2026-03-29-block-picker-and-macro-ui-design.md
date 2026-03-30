# Block Picker And Macro UI Design

## Goal

Bring the add-block drawer and macro block config closer to the app's current visual language, while making macro usage understandable and practical for real users.

## Problem

The current add-block drawer uses generic pill buttons that do not feel connected to the canvas block UI. The macro block config is more serious: it exposes a raw `macroId` text field and manual parameter-key entry, which makes macros feel developer-only even though the runtime supports reusable workflow fragments.

## Recommended Approach

Use block-style action buttons in the add-block drawer and refactor macro config into a macro picker driven by saved macro definitions.

### Add Block

- Keep button-based interaction
- Make each option look like a miniature block card
- Group blocks into lightweight sections:
  - `Actions`
  - `Flow`
  - `Data`
- Preserve current creation behavior and block limit checks

### Macro Config

- Replace raw free-text-first setup with a real macro selector
- Show saved macros from the macro registry
- After selection, render the selected macro's description and declared parameters
- Generate parameter inputs from the macro definition instead of asking users to invent parameter keys
- Keep parameter values stored on the block as `Record<string, string>`

## Data Flow

- The add-block drawer still creates blocks exactly the same way; only presentation changes
- The macro config reads macro definitions from `macroRegistryStore`
- Selecting a macro updates `block.config.macroId`
- Generated parameter fields write into `block.config.parameters`
- If a selected macro disappears, show a warning state but preserve the stored block config

## Testing Strategy

- Add pure helper coverage for add-block grouping metadata
- Add pure helper coverage for macro parameter form derivation from macro definitions and existing block config
- Run focused tests plus TypeScript compile verification

## Scope

Included:
- add-block visual redesign
- grouped block sections
- macro picker UI
- generated macro parameter inputs
- empty state for missing macros

Excluded:
- full macro library management
- creating/editing macro definitions from this drawer
- nested macro preview of internal blocks
