# Phase 6 Compiled Analysis Design

## Goal

Use the compiled blueprint as the shared source for structural validation and blueprint preview metadata, so validation, runtime reasoning, and AI previews talk about the same execution shape.

## Scope

- Add a compiled analysis module on top of `compileBlueprint()`
- Produce reusable metadata:
  - total block count
  - max nesting depth
  - block types used
  - variable references
  - macro references
- Produce structural issues from the compiled plan
- Feed AI blueprint preview from the shared compiled analysis
- Keep persistence and UI behavior stable

## Non-Goals

- No persisted schema changes
- No UI redesign for the AI preview card
- No typed variable system yet
- No deep macro safety or compile-time expansion limits yet

## Architecture

`blueprint-compiler.ts` remains the raw runtime compiler.

`blueprint-analysis.ts` becomes the next layer up:
- input: compiled blueprint
- output: analysis metadata + structural issues + preview summary

`blueprint-validator.ts` continues to handle editor-model checks like duplicate IDs, missing config, and parent-reference mismatches, but uses compiled analysis for structural runtime-oriented rules.

`core/ai/tools.ts` uses the shared preview builder so AI previews reflect the compiled plan instead of local ad hoc counts.

## Expected Outcome

- Less drift between what validation says and what execution will run
- AI previews become execution-aware without needing a UI rewrite
- Future variable and macro compile-time checks now have a clear home
