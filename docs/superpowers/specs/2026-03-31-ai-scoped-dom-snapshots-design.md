# AI Scoped DOM Snapshots Design

## Goal

Improve AI helper accuracy by letting `field-suggester` and `selector-generator` request a DOM snapshot for the relevant subtree instead of always sending a truncated full-page snapshot.

## Current Problem

The current AI helpers request `ENV_DOM_SNAPSHOT`, which serializes the whole visible page. On large pages this means:

- useful local context is diluted by unrelated markup
- HTML is truncated before the model sees the relevant loop item or sub-container
- prompts must rely on text hints like `loopSelector` and `scopeSelector` instead of the actual scoped subtree

This is especially harmful for:

- `suggestFields`, where the model should reason about one loop item shape
- `generateSelectorFromElement`, where the model should reason about the selected element in its nearby structural context

## Design

Add a scoped snapshot mode to the existing content-side DOM snapshot flow.

### Snapshot API

Extend the content-side snapshot function so it can accept optional scope parameters:

- `loopSelector?`
- `scopeSelector?`
- `maxMatches?`

Behavior:

- with no scope parameters, keep current full-page behavior
- with `loopSelector`, find the first matching loop element and serialize that subtree
- with both `loopSelector` and `scopeSelector`, find the first loop element, then the nested scoped element inside it, and serialize that subtree
- if scope resolution fails, fall back to the broader available scope and include metadata describing the fallback

### Metadata

Extend snapshot metadata to describe what the helper actually received:

- `scopeMode`: `page | loop | scoped`
- `scopeResolved`: boolean
- `scopeFallbackReason?`

This keeps callers simple and gives prompts truthful context.

### Messaging

Reuse `ENV_DOM_SNAPSHOT` instead of adding a new message type. The message payload will become optional and backward-compatible:

- old callers can still send `{ type: 'ENV_DOM_SNAPSHOT' }`
- new callers can send `{ type: 'ENV_DOM_SNAPSHOT', data: { loopSelector, scopeSelector, maxMatches } }`

### Helper Integration

`suggestFields`:

- pass `loopSelector` and `scopeSelector` when present
- mention the returned `scopeMode` in prompt context
- keep full-page fallback if no scope is available

`generateSelectorFromElement`:

- accept optional scope context from the selector picker path
- request a scoped snapshot when parent scope is known
- otherwise keep current full-page behavior

## Error Handling

- invalid selectors should not crash the helper flow
- scoped snapshot resolution should degrade gracefully to loop scope or page scope
- prompts must never claim the snapshot is narrower than what was actually resolved

## Testing

Add regression coverage for:

- full-page snapshot behavior remains unchanged
- loop-scoped snapshot selects the first matching loop item
- nested scope snapshot prefers the inner scoped element
- failed scope resolution falls back predictably
- `suggestFields` passes scope parameters through the messaging layer
- `generateSelectorFromElement` passes scope parameters through when available

## Non-Goals

This slice does not change:

- AI privacy controls
- chat UX flows
- agent retry/caching logic
- provider/model handling
