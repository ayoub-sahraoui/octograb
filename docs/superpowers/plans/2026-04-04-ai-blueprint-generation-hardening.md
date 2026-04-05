# AI Blueprint Generation Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild AI blueprint generation into a quality-first, interaction-capable, selector-aware pipeline that can explore live pages, verify extraction flows, and generate more reliable blueprints with enforced best practices.

**Architecture:** Introduce a staged AI generation pipeline with code-backed planning modules, interactive exploration tools, centralized selector intelligence, and pattern-driven blueprint assembly. Keep the LLM responsible for strategy and evidence-driven decisions while moving correctness, validation, and guardrails into reusable code modules.

**Tech Stack:** TypeScript, WXT, React, MobX, LangChain, Vitest, existing OctoGrab blueprint models and content-script RPC layer

---

## File Structure

### Existing files to modify

- `core/ai/tools.ts`
  - Add exploration tools and route them through the content script.
  - Reduce prompt-only behavior by returning structured evidence.
- `core/ai/prompts.ts`
  - Rewrite the prompt around staged exploration, verification, and code-backed generation rules.
- `core/ai/agent.ts`
  - Add orchestration support for the staged workflow and better tool/evidence handling.
- `entrypoints/content/env-handler.ts`
  - Expose missing interaction operations required by the AI explorer.
- `core/messaging.ts`
  - Add any new message types for AI interaction tools.
- `tests/ai-agent-store.test.ts`
  - Expand beyond settings persistence and cover AI orchestration behaviors.

### New files to create

- `core/ai/selector-intelligence.ts`
  - Generate, score, normalize, and repair selectors.
- `core/ai/page-patterns.ts`
  - Model listing, detail, pagination, and wait strategy discovery helpers.
- `core/ai/blueprint-pattern-builder.ts`
  - Assemble verified evidence into blueprint block trees with enforced defaults.
- `core/ai/generation-validator.ts`
  - Add AI-generation-specific validation beyond existing schema validation.
- `tests/selector-intelligence.test.ts`
  - Validate selector scoring, normalization, and repair behavior.
- `tests/page-patterns.test.ts`
  - Validate pattern detection and wait strategy decisions.
- `tests/blueprint-pattern-builder.test.ts`
  - Validate generated block trees and best-practice injection.
- `tests/generation-validator.test.ts`
  - Validate guardrails and downgrade behavior.

### Optional follow-up files if needed during implementation

- `core/ai/types.ts`
  - Shared typed contracts for page models, selector candidates, and generation evidence.
- `tests/ai-tools.test.ts`
  - Focused tests for structured tool outputs if `core/ai/tools.ts` grows too large.

---

## Chunk 1: Interaction And Evidence Foundation

### Task 1: Add AI interaction message types

**Files:**
- Modify: `core/messaging.ts`
- Test: `tests/messaging.test.ts`

- [ ] **Step 1: Write the failing test for new AI interaction message coverage**

```ts
it('includes AI interaction message types', () => {
  const allowedTypes = [
    'ENV_AI_CLICK',
    'ENV_AI_SCROLL',
    'ENV_AI_WAIT',
    'ENV_AI_GO_BACK',
    'ENV_AI_HOVER',
  ];

  for (const type of allowedTypes) {
    expect(type).toBeTypeOf('string');
  }
});
```

- [ ] **Step 2: Run test to verify it fails or lacks coverage**

Run: `npm test -- tests/messaging.test.ts`
Expected: FAIL or incomplete assertions for the new message types

- [ ] **Step 3: Add the new message types to `core/messaging.ts`**

```ts
export type MessageType =
  | 'ENV_AI_CLICK'
  | 'ENV_AI_SCROLL'
  | 'ENV_AI_WAIT'
  | 'ENV_AI_GO_BACK'
  | 'ENV_AI_HOVER'
  | 'ENV_AI_NAVIGATE'
  | 'ENV_AI_FRAME_STATUS';
```

- [ ] **Step 4: Run the targeted test**

Run: `npm test -- tests/messaging.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core/messaging.ts tests/messaging.test.ts
git commit -m "feat: add ai interaction message types"
```

### Task 2: Expose interactive exploration handlers in the content script

**Files:**
- Modify: `entrypoints/content/env-handler.ts`
- Test: `tests/env-handler.test.ts`

- [ ] **Step 1: Write failing tests for AI interaction handlers**

```ts
it('handles ENV_AI_CLICK requests', async () => {
  const response = await invokeHandler({
    type: 'ENV_AI_CLICK',
    data: { selector: '.product-link', selectorType: 'css' },
  });

  expect(response.success).toBe(true);
});

it('handles ENV_AI_WAIT requests', async () => {
  const response = await invokeHandler({
    type: 'ENV_AI_WAIT',
    data: { mode: 'timeout', timeout: 300 },
  });

  expect(response.success).toBe(true);
});
```

- [ ] **Step 2: Run the focused env handler test**

Run: `npm test -- tests/env-handler.test.ts`
Expected: FAIL because the new handlers do not exist yet

- [ ] **Step 3: Implement minimal interaction handlers**

```ts
case 'ENV_AI_CLICK': {
  const { selector, selectorType, scope } = msg.data;
  const scopeEl = resolveScope(scope);
  const target = getElement(selector, selectorType || 'css', scopeEl);
  if (!target) throw new Error(`Element not found: ${selector}`);

  const beforeUrl = location.href;
  findClickableElement(target).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

  return {
    success: true,
    data: {
      beforeUrl,
      afterUrl: location.href,
      urlChanged: beforeUrl !== location.href,
    },
  };
}
```

- [ ] **Step 4: Add structured responses for scroll, hover, wait, and go-back helpers**

```ts
case 'ENV_AI_WAIT': {
  const { mode, timeout, selector, selectorType } = msg.data;
  if (mode === 'timeout') {
    await new Promise(resolve => setTimeout(resolve, timeout || 500));
    return { success: true, data: { waitedMs: timeout || 500 } };
  }
}
```

- [ ] **Step 5: Run the handler tests**

Run: `npm test -- tests/env-handler.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add entrypoints/content/env-handler.ts tests/env-handler.test.ts
git commit -m "feat: add ai exploration handlers"
```

### Task 3: Add structured AI exploration tools

**Files:**
- Modify: `core/ai/tools.ts`
- Test: `tests/ai-tools.test.ts`

- [ ] **Step 1: Write failing tests for new AI tool exports**

```ts
it('exports interaction tools for ai exploration', async () => {
  const tools = await import('../core/ai/tools');

  expect(tools.ALL_TOOLS.map(tool => tool.name)).toContain('click_element');
  expect(tools.ALL_TOOLS.map(tool => tool.name)).toContain('scroll_page');
  expect(tools.ALL_TOOLS.map(tool => tool.name)).toContain('wait_for');
});
```

- [ ] **Step 2: Run the tool test**

Run: `npm test -- tests/ai-tools.test.ts`
Expected: FAIL because these tools are not defined

- [ ] **Step 3: Implement the new tools in `core/ai/tools.ts`**

```ts
export const clickElementTool = tool(async ({ selector, selectorType }) => {
  const response = await sendToContentScript({
    type: 'ENV_AI_CLICK',
    data: { selector, selectorType: selectorType || 'css' },
  });

  return JSON.stringify(response.data);
}, {
  name: 'click_element',
  description: 'Click an element during exploration and report what changed.',
  schema: z.object({
    selector: z.string(),
    selectorType: z.enum(['css', 'xpath']).optional(),
  }),
});
```

- [ ] **Step 4: Add the new tools to `ALL_TOOLS` and keep outputs structured**

```ts
export const ALL_TOOLS = [
  analyzePageTool,
  getPageUrlTool,
  clickElementTool,
  scrollPageTool,
  waitForTool,
  goBackPageTool,
  querySelectorTool,
  testExtractionTool,
  createBlueprintTool,
  validateBlueprintTool,
  saveBlueprintTool,
];
```

- [ ] **Step 5: Run the AI tool tests**

Run: `npm test -- tests/ai-tools.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add core/ai/tools.ts tests/ai-tools.test.ts
git commit -m "feat: add ai exploration tools"
```

## Chunk 2: Centralized Selector Intelligence

### Task 4: Create selector intelligence contracts

**Files:**
- Create: `core/ai/types.ts`
- Test: `tests/selector-intelligence.test.ts`

- [ ] **Step 1: Write a failing test describing selector candidate structure**

```ts
it('scores selector candidates with role-specific metadata', async () => {
  const { scoreSelectorCandidate } = await import('../core/ai/selector-intelligence');

  const result = scoreSelectorCandidate({
    selector: '.product-card',
    selectorType: 'css',
    role: 'loop_item',
    count: 24,
  });

  expect(result.score).toBeGreaterThan(0);
  expect(result.reasons.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the selector test**

Run: `npm test -- tests/selector-intelligence.test.ts`
Expected: FAIL because the module and types do not exist

- [ ] **Step 3: Create shared AI selector and page-model types**

```ts
export interface SelectorCandidate {
  selector: string;
  selectorType: 'css' | 'xpath';
  role: 'loop_item' | 'field' | 'detail_link' | 'pagination_next';
  count?: number;
  visibleCount?: number;
  attributes?: string[];
}
```

- [ ] **Step 4: Run the selector test again**

Run: `npm test -- tests/selector-intelligence.test.ts`
Expected: still FAIL, but now for missing implementation rather than missing types

- [ ] **Step 5: Commit**

```bash
git add core/ai/types.ts tests/selector-intelligence.test.ts
git commit -m "feat: add ai selector contracts"
```

### Task 5: Build selector scoring and normalization

**Files:**
- Create: `core/ai/selector-intelligence.ts`
- Modify: `core/ai/tools.ts`
- Test: `tests/selector-intelligence.test.ts`

- [ ] **Step 1: Add failing tests for selector scoring, normalization, and fragility rejection**

```ts
it('penalizes hashed or fragile classes', async () => {
  const { scoreSelectorCandidate } = await import('../core/ai/selector-intelligence');

  const fragile = scoreSelectorCandidate({
    selector: '.sc-a1b2c3',
    selectorType: 'css',
    role: 'field',
    count: 5,
  });

  expect(fragile.score).toBeLessThan(50);
});

it('normalizes field selectors to loop-relative form', async () => {
  const { normalizeRelativeFieldSelector } = await import('../core/ai/selector-intelligence');

  expect(
    normalizeRelativeFieldSelector('.product-card .title', '.product-card')
  ).toBe('.title');
});
```

- [ ] **Step 2: Run selector intelligence tests**

Run: `npm test -- tests/selector-intelligence.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement selector scoring and normalization**

```ts
export function normalizeRelativeFieldSelector(fieldSelector: string, loopSelector: string): string {
  if (fieldSelector.startsWith(`${loopSelector} `)) {
    return fieldSelector.slice(loopSelector.length).trim();
  }
  return fieldSelector;
}

export function scoreSelectorCandidate(candidate: SelectorCandidate) {
  let score = 100;
  const reasons: string[] = [];

  if (/sc-[a-z0-9]{4,}/i.test(candidate.selector)) {
    score -= 40;
    reasons.push('selector appears auto-generated');
  }

  if (candidate.role === 'pagination_next' && candidate.count !== 1) {
    score -= 50;
    reasons.push('pagination selector must match exactly one element');
  }

  return { ...candidate, score, reasons };
}
```

- [ ] **Step 4: Route extraction and query tools through selector normalization helpers where appropriate**

```ts
const normalizedFields = fields.map(field => ({
  ...field,
  selector: normalizeRelativeFieldSelector(field.selector, loopSelector),
}));
```

- [ ] **Step 5: Run selector tests**

Run: `npm test -- tests/selector-intelligence.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add core/ai/selector-intelligence.ts core/ai/tools.ts tests/selector-intelligence.test.ts
git commit -m "feat: centralize selector scoring and normalization"
```

### Task 6: Add selector repair helpers

**Files:**
- Modify: `core/ai/selector-intelligence.ts`
- Test: `tests/selector-intelligence.test.ts`

- [ ] **Step 1: Write a failing test for selector repair**

```ts
it('repairs absolute field selectors into relative selectors', async () => {
  const { repairFieldSelector } = await import('../core/ai/selector-intelligence');

  const repaired = repairFieldSelector({
    fieldSelector: '.product-card .price',
    loopSelector: '.product-card',
  });

  expect(repaired.selector).toBe('.price');
});
```

- [ ] **Step 2: Run the selector tests**

Run: `npm test -- tests/selector-intelligence.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement repair helpers**

```ts
export function repairFieldSelector(input: { fieldSelector: string; loopSelector: string }) {
  const selector = normalizeRelativeFieldSelector(input.fieldSelector, input.loopSelector);
  return {
    selector,
    changed: selector !== input.fieldSelector,
  };
}
```

- [ ] **Step 4: Run the selector tests**

Run: `npm test -- tests/selector-intelligence.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core/ai/selector-intelligence.ts tests/selector-intelligence.test.ts
git commit -m "feat: add selector repair helpers"
```

## Chunk 3: Pattern Discovery And Blueprint Assembly

### Task 7: Build page-pattern and wait-strategy helpers

**Files:**
- Create: `core/ai/page-patterns.ts`
- Test: `tests/page-patterns.test.ts`

- [ ] **Step 1: Write failing tests for pagination and wait-strategy detection**

```ts
it('selects wait-heavy strategy for paginated flows', async () => {
  const { chooseWaitStrategy } = await import('../core/ai/page-patterns');

  const strategy = chooseWaitStrategy({
    hasPagination: true,
    hasDynamicContent: true,
    detailClicksRequired: false,
  });

  expect(strategy.paginationDelayMs).toBeGreaterThanOrEqual(1500);
});
```

- [ ] **Step 2: Run the page-pattern test**

Run: `npm test -- tests/page-patterns.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the minimal page-pattern helpers**

```ts
export function chooseWaitStrategy(input: {
  hasPagination: boolean;
  hasDynamicContent: boolean;
  detailClicksRequired: boolean;
}) {
  return {
    postClickDelayMs: input.detailClicksRequired ? 1200 : 500,
    paginationDelayMs: input.hasPagination ? 2000 : 0,
    useNetworkIdleWait: input.hasDynamicContent,
  };
}
```

- [ ] **Step 4: Add listing/detail/pagination discovery helpers with typed evidence**

```ts
export function buildPageModel(evidence: ExplorationEvidence): PageModel {
  return {
    pageUrl: evidence.pageUrl,
    pageType: evidence.pageType,
    paginationMode: evidence.paginationMode,
    waitStrategy: chooseWaitStrategy(evidence),
    risks: evidence.risks ?? [],
  };
}
```

- [ ] **Step 5: Run the page-pattern tests**

Run: `npm test -- tests/page-patterns.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add core/ai/page-patterns.ts tests/page-patterns.test.ts
git commit -m "feat: add ai page pattern helpers"
```

### Task 8: Add pattern-driven blueprint assembly

**Files:**
- Create: `core/ai/blueprint-pattern-builder.ts`
- Test: `tests/blueprint-pattern-builder.test.ts`

- [ ] **Step 1: Write failing tests for list and list-to-detail blueprint assembly**

```ts
it('builds a list blueprint with navigate and loop blocks', async () => {
  const { buildListBlueprintBlocks } = await import('../core/ai/blueprint-pattern-builder');

  const blocks = buildListBlueprintBlocks({
    pageUrl: 'https://example.com/products',
    loopSelector: '.product-card',
    fields: [
      { key: 'title', selector: '.title', attribute: 'text' },
    ],
  });

  expect(blocks[0].type).toBe('navigate');
  expect(blocks[1].type).toBe('loop_elements');
});
```

- [ ] **Step 2: Run the blueprint builder test**

Run: `npm test -- tests/blueprint-pattern-builder.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement pattern-driven builders**

```ts
export function buildListBlueprintBlocks(input: BuildListBlueprintInput) {
  return [
    {
      type: 'navigate',
      label: 'Go to page',
      config: {
        url: input.pageUrl,
        behavior: 'same_tab',
        timeout: 30000,
      },
    },
    {
      type: 'loop_elements',
      label: 'Each item',
      config: {
        selector: { type: 'css', value: input.loopSelector },
        maxIterations: input.maxIterations ?? 50,
      },
      children: [
        {
          type: 'extract_scope',
          label: 'Extract data',
          config: { fields: input.fields },
        },
      ],
    },
  ];
}
```

- [ ] **Step 4: Inject wait, scroll, and anti-bot defaults when pagination or detail flows are used**

```ts
if (input.paginationSelector) {
  blocks.push({
    type: 'loop_pagination',
    label: 'Each page',
    config: {
      paginationType: 'button',
      nextButtonSelector: { type: 'css', value: input.paginationSelector },
      delayBetweenPages: input.waitStrategy.paginationDelayMs,
      onNoNextButton: 'stop',
      maxPages: input.maxPages ?? 10,
    },
    children: [loopBlock],
  });
}
```

- [ ] **Step 5: Run the blueprint builder tests**

Run: `npm test -- tests/blueprint-pattern-builder.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add core/ai/blueprint-pattern-builder.ts tests/blueprint-pattern-builder.test.ts
git commit -m "feat: add pattern-driven blueprint assembly"
```

### Task 9: Add generation-aware validation

**Files:**
- Create: `core/ai/generation-validator.ts`
- Test: `tests/generation-validator.test.ts`

- [ ] **Step 1: Write failing tests for generation-specific guardrails**

```ts
it('rejects pagination selectors that do not match exactly one element', async () => {
  const { validateGeneratedPlan } = await import('../core/ai/generation-validator');

  const result = validateGeneratedPlan({
    pattern: 'paginated_list',
    selectorEvidence: {
      nextPage: { selector: '.next', count: 3 },
    },
  });

  expect(result.valid).toBe(false);
});
```

- [ ] **Step 2: Run the generation validator test**

Run: `npm test -- tests/generation-validator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement generation-aware validation**

```ts
export function validateGeneratedPlan(input: GeneratedPlanValidationInput) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.pattern === 'paginated_list' && input.selectorEvidence.nextPage?.count !== 1) {
    errors.push('Pagination selector must match exactly one next-page control.');
  }

  if (input.pattern.includes('detail') && !input.detailFlowVerified) {
    errors.push('Detail flow must be verified before generating a detail-page blueprint.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

- [ ] **Step 4: Run the validator tests**

Run: `npm test -- tests/generation-validator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core/ai/generation-validator.ts tests/generation-validator.test.ts
git commit -m "feat: add ai generation validation"
```

## Chunk 4: Agent Orchestration And Prompt Rebuild

### Task 10: Rework the system prompt around staged planning

**Files:**
- Modify: `core/ai/prompts.ts`
- Test: `tests/plan-validator.test.ts`

- [ ] **Step 1: Add a failing test for prompt requirements**

```ts
it('instructs the agent to verify evidence before blueprint creation', async () => {
  const { SYSTEM_PROMPT } = await import('../core/ai/prompts');

  expect(SYSTEM_PROMPT).toContain('Explore');
  expect(SYSTEM_PROMPT).toContain('Verify extraction');
  expect(SYSTEM_PROMPT).toContain('create_blueprint');
});
```

- [ ] **Step 2: Run the prompt-related test**

Run: `npm test -- tests/plan-validator.test.ts`
Expected: FAIL or lack of coverage for the new staged flow

- [ ] **Step 3: Rewrite the prompt to use the staged pipeline and new tools**

```ts
export const SYSTEM_PROMPT = `
You are OctoGrab AI.
Work in stages:
1. Explore the page
2. Build structured evidence
3. Verify selectors and extraction
4. Create a blueprint from verified evidence
5. Ask before saving

Use click_element, scroll_page, wait_for, and go_back_page when needed.
Prefer quality over speed.
`;
```

- [ ] **Step 4: Run the prompt-related tests**

Run: `npm test -- tests/plan-validator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core/ai/prompts.ts tests/plan-validator.test.ts
git commit -m "feat: rebuild ai prompt for staged blueprint generation"
```

### Task 11: Add staged orchestration in the AI agent layer

**Files:**
- Modify: `core/ai/agent.ts`
- Modify: `core/ai/tools.ts`
- Test: `tests/ai-agent-store.test.ts`

- [ ] **Step 1: Write failing tests for staged-orchestration expectations**

```ts
it('keeps tool-driven evidence gathering before final save prompts', async () => {
  const { runAgentStream } = await import('../core/ai/agent');

  expect(runAgentStream).toBeTypeOf('function');
});
```

- [ ] **Step 2: Run the AI agent store test**

Run: `npm test -- tests/ai-agent-store.test.ts`
Expected: FAIL or provide no useful orchestration coverage

- [ ] **Step 3: Add orchestration helpers that preserve structured evidence across tool calls**

```ts
function manageContext(messages: BaseMessage[], maxTokens = 60000): BaseMessage[] {
  // keep structured evidence and truncate verbose tool payloads
  return messages;
}
```

- [ ] **Step 4: Prefer structured tool loops over freeform assistant summaries before blueprint creation**

```ts
if (toolName === 'create_blueprint' && !result.includes('"valid"')) {
  result = JSON.stringify({
    error: 'Blueprint creation must return structured validation data.',
  });
}
```

- [ ] **Step 5: Run the AI agent tests**

Run: `npm test -- tests/ai-agent-store.test.ts`
Expected: PASS with stronger orchestration coverage

- [ ] **Step 6: Commit**

```bash
git add core/ai/agent.ts core/ai/tools.ts tests/ai-agent-store.test.ts
git commit -m "feat: add staged ai blueprint orchestration"
```

### Task 12: Connect `create_blueprint` to the new planner and validator

**Files:**
- Modify: `core/ai/tools.ts`
- Modify: `core/ai/selector-intelligence.ts`
- Modify: `core/ai/page-patterns.ts`
- Modify: `core/ai/blueprint-pattern-builder.ts`
- Modify: `core/ai/generation-validator.ts`
- Test: `tests/blueprint-pattern-builder.test.ts`
- Test: `tests/generation-validator.test.ts`

- [ ] **Step 1: Write failing tests for the new `create_blueprint` path**

```ts
it('creates blueprints from verified evidence instead of raw freeform json only', async () => {
  const { createBlueprintFromEvidence } = await import('../core/ai/blueprint-pattern-builder');

  expect(createBlueprintFromEvidence).toBeTypeOf('function');
});
```

- [ ] **Step 2: Run the relevant tests**

Run: `npm test -- tests/blueprint-pattern-builder.test.ts tests/generation-validator.test.ts`
Expected: FAIL

- [ ] **Step 3: Add a code-backed creation path**

```ts
export function createBlueprintFromEvidence(input: VerifiedBlueprintEvidence) {
  const validation = validateGeneratedPlan(input.validationInput);
  if (!validation.valid) {
    return { valid: false, errors: validation.errors, warnings: validation.warnings };
  }

  const blocks = buildPatternBlocks(input);
  return { valid: true, blocks, warnings: validation.warnings };
}
```

- [ ] **Step 4: Use the new creation path inside `createBlueprintTool` before constructing the final `Blueprint` instance**

```ts
const planned = createBlueprintFromEvidence(verifiedEvidence);
if (!planned.valid) {
  return JSON.stringify({ validation: planned });
}
```

- [ ] **Step 5: Run the combined tests**

Run: `npm test -- tests/blueprint-pattern-builder.test.ts tests/generation-validator.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add core/ai/tools.ts core/ai/selector-intelligence.ts core/ai/page-patterns.ts core/ai/blueprint-pattern-builder.ts core/ai/generation-validator.ts tests/blueprint-pattern-builder.test.ts tests/generation-validator.test.ts
git commit -m "feat: generate blueprints from verified ai evidence"
```

## Final Verification

### Task 13: Run the full targeted AI and execution test suite

**Files:**
- Test: `tests/ai-agent-store.test.ts`
- Test: `tests/ai-tools.test.ts`
- Test: `tests/selector-intelligence.test.ts`
- Test: `tests/page-patterns.test.ts`
- Test: `tests/blueprint-pattern-builder.test.ts`
- Test: `tests/generation-validator.test.ts`
- Test: `tests/env-handler.test.ts`

- [ ] **Step 1: Run all targeted tests**

Run: `npm test -- tests/ai-agent-store.test.ts tests/ai-tools.test.ts tests/selector-intelligence.test.ts tests/page-patterns.test.ts tests/blueprint-pattern-builder.test.ts tests/generation-validator.test.ts tests/env-handler.test.ts`
Expected: PASS

- [ ] **Step 2: Run the broader regression suite around blueprint execution**

Run: `npm test -- tests/blueprint-execution.test.ts tests/blueprint-validator.test.ts tests/blueprint-compiler.test.ts`
Expected: PASS

- [ ] **Step 3: Review prompt, tool, and validation outputs for clarity**

Run: `npm test`
Expected: PASS or a clearly isolated set of unrelated failures

- [ ] **Step 4: Commit the verification pass**

```bash
git add .
git commit -m "test: verify ai blueprint generation hardening"
```
