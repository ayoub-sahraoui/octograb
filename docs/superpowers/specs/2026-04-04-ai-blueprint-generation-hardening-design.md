# AI Blueprint Generation Hardening Design

Date: 2026-04-04
Status: Approved

## Goal

Upgrade OctoGrab's AI blueprint generation so it is quality-first, interactive, selector-aware, and substantially more reliable on real-world sites.

The AI should be able to:

- explore and interact with live pages
- discover list, detail, and pagination flows
- centralize selector optimization and repair
- apply built-in best practices for waits, scrolls, clicks, and anti-bot pacing
- generate structurally valid blueprints through guarded builders instead of freehand JSON

## Current Problems

The current system is capable, but it still depends too much on the model making correct decisions from prompt instructions alone.

Primary weaknesses:

- blueprint correctness depends heavily on prompt compliance
- selectors are generated and fixed in a scattered way
- the agent cannot fully explore flows like product detail pages before planning
- best practices like waits, scrolls, and pacing are guidance, not enforced defaults
- validation focuses more on schema correctness than AI-generation reliability

## Proposed Architecture

The AI blueprint generator will become a staged pipeline:

1. Explore
2. Model the page
3. Verify extraction
4. Synthesize blueprint
5. Review and save

### 1. Explore

The agent is allowed to interact with the current page autonomously. It may click, scroll, wait, hover, navigate back, and probe likely flows in order to understand the site.

The exploration phase should discover:

- whether the current page is a listing page, detail page, search page, or a mixed flow
- the best repeating item selector
- whether key fields exist on the listing page or only on detail pages
- whether pagination is button-based, infinite scroll, or absent
- what waits are needed after interactions
- whether anti-bot pacing is needed between actions

### 2. Model The Page

Exploration results should be written into a structured page model owned by code, not only the LLM context.

Suggested model fields:

- pageUrl
- pageType
- listCandidateSelectors
- detailLinkCandidateSelectors
- nextPageCandidateSelectors
- fieldCandidateSelectors
- interactionEvidence
- waitStrategy
- paginationMode
- risks

This model becomes the source of truth for later blueprint assembly.

### 3. Verify Extraction

Before blueprint creation, the agent must verify the chosen strategy on the live page.

Verification should include:

- loop selector quality
- field extraction quality
- detail flow viability
- pagination selector uniqueness
- field completeness thresholds
- selector repair attempts when tests fail

This step is a hard gate. Weak or ambiguous selectors should not move directly into a final blueprint.

### 4. Synthesize Blueprint

Blueprint generation should be pattern-driven and code-assisted.

The model should choose a supported pattern, then pass verified selectors, waits, and options into builder helpers that create the final block tree.

### 5. Review And Save

The agent presents:

- blueprint summary
- verified extraction sample
- any downgraded or excluded fields
- warnings and limitations

Saving still requires explicit user confirmation.

## Interactive Tooling

The AI needs live interaction tools in addition to the current analysis and extraction tools.

New tools:

- `click_element`
- `hover_element`
- `scroll_page`
- `wait_for`
- `go_back_page`
- `navigate_to_url`
- `switch_frame` or equivalent frame-aware interaction helper when needed

These tools are for exploration, not for direct blueprint output.

Tool design requirements:

- each tool returns structured evidence, not only plain text
- click and navigation tools should report whether the page changed meaningfully
- wait tools should support selector-based and time-based waits
- scroll tools should report whether new content appeared
- navigation recovery should be easy after detail-page probing

## Centralized Selector Intelligence

Selector optimization and repair should be centralized in one module rather than split across prompts and individual tools.

This selector intelligence service should:

- generate candidate selectors from DOM evidence
- score selectors by stability and specificity
- reject fragile selectors such as hashed classes and over-broad matches
- normalize selectors for loop-relative extraction
- repair selectors after failed extraction tests
- evaluate selectors by role:
  - list item
  - title
  - price
  - image
  - detail link
  - next page control

It should also encode best practices:

- prefer IDs and stable attributes over cosmetic classes
- prefer relative selectors inside loop scopes
- require next-page selectors to match exactly one actionable control
- verify detail links before using them in a detail-page flow

## Blueprint Patterns

The generator should assemble blueprints from known reliable patterns.

Supported patterns:

- single-page list extraction
- paginated list extraction
- infinite-scroll list extraction
- list to detail-page extraction
- search then extract
- click-to-expand or modal extraction

Each pattern should be built with quality-first defaults.

### Required defaults

- always begin with `navigate`
- inject `wait` after major page transitions
- inject `wait` between pagination steps
- add `scroll` when lazy loading or viewport-triggered loading is observed
- add anti-bot pacing delays where repeated actions occur
- prefer detail-page handling only after live verification

### Hard generation rules

- no top-level `extract_scope` for multi-row flows
- no unverified pagination selector
- no detail-page flow unless verified during exploration
- no unreliable field silently treated as valid
- no direct freeform final blueprint JSON from the model without builder validation

## AI Planning Skills

The agent should gain internal planning modules that behave like code-backed skills.

Suggested planning modules:

- `discover_list_pattern`
- `discover_detail_pattern`
- `discover_pagination_pattern`
- `discover_wait_strategy`
- `repair_selector`
- `choose_extraction_fields`
- `assemble_blueprint_pattern`

These modules should be reusable across providers and should reduce dependence on prompt wording.

## Reliability And Failure Handling

The system should fail safe.

Rules:

- if exploration changes the page unexpectedly, recover through back or re-navigation
- if selectors degrade after interaction, rerun selector repair
- if pagination remains ambiguous, downgrade to single-page extraction and report it
- if detail extraction is unstable, generate a listing-only blueprint instead of hallucinating detail support
- if a field cannot be made reliable, exclude it or mark it partial

The generator must prefer a smaller correct blueprint over a larger unreliable one.

## Prompt Strategy

Prompts should still guide the model, but prompts should become thinner and more procedural because correctness moves into code.

Prompt updates should:

- explain the staged pipeline
- emphasize tool-first reasoning
- require structured evidence collection before blueprint creation
- forbid speculative summary output without a verified created blueprint
- instruct the model to use centralized selector and pattern tools

## Validation Strategy

Validation should be extended beyond existing blueprint schema validation.

New validation layers:

- pattern validation
- selector-quality validation
- pagination uniqueness validation
- extraction completeness validation
- detail-flow verification validation
- AI-generation best-practice validation

The final blueprint should pass both structural and generation-aware checks.

## Expected Module Changes

Likely change areas:

- `core/ai/tools.ts`
- `core/ai/prompts.ts`
- `core/ai/agent.ts`
- new selector intelligence module under `core/ai/`
- new planner/pattern module under `core/ai/`
- new generation-aware validation module under `core/ai/` or `entrypoints/models/`
- updates in `entrypoints/stores/ai-agent-store.ts`

## Testing Strategy

New test coverage should include:

- selector scoring and repair
- list/detail/pagination pattern detection
- wait strategy selection
- blueprint assembly from verified evidence
- fallback and downgrade behavior
- provider-independent agent orchestration behavior
- interactive exploration tool behavior where testable

The test suite should verify that quality-first behavior wins over speed-first behavior.

## Success Criteria

The redesign is successful when:

- the agent can explore and interact with real pages before planning
- generated blueprints are consistently structurally valid
- selector quality improves measurably
- listing, pagination, and detail-page flows are generated through verified evidence
- waits, scrolls, clicks, and pacing are applied automatically when appropriate
- failures degrade safely instead of producing misleading blueprints
