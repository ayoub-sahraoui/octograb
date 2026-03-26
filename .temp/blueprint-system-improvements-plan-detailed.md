# OctoGrab Blueprint System - Detailed Issues & Improvement Plan

**Date:** 2026-03-26  
**Source:** Analysis of `entrypoints/models/` and `entrypoints/content/env-handler.ts`

---

## 1. Critical Bugs (Fix Immediately)

### 1.1 `_returnUrl` Leak in Loop Elements

**File:** `entrypoints/stores/blueprint-executor-store.ts:1399`  
**Severity:** High  
**Likelihood:** Medium (triggers on error during loop iteration)

#### The Problem

The `_returnUrl` is a private store property used by `go_back` blocks to know where to return after navigating away. In `executeLoopElements`, this is set to the loop's starting URL:

```typescript
// Line ~1366 - Getting the URL before loop starts
const currentTab = await browser.tabs.get(this._targetTabId!);
const loopStartUrl = currentTab.url || null;

// Line ~1399 - Inside the loop iteration
this._returnUrl = loopStartUrl;  // PROBLEM: Set without cleanup
```

The issue: if an exception is thrown during any iteration, `_returnUrl` remains set to `loopStartUrl`. This pollutes subsequent executions:

```typescript
// Scenario: User stops execution mid-loop, then runs a different blueprint
// The second blueprint has a go_back block
// EXPECTED: go_back uses browser history
// ACTUAL: go_back navigates to first blueprint's loop URL (!)
```

#### Root Cause

No stack-based or scoped management of return URL. The property is global to the executor instance across all executions.

#### Impact Scenarios

1. **Cross-blueprint pollution:** Stop blueprint A mid-loop, run blueprint B → B's `go_back` goes to A's URL
2. **Nested loop issues:** Outer loop sets `_returnUrl`, inner loop overwrites it, inner completes → outer's `go_back` uses wrong URL
3. **Resume corruption:** Checkpoint save captures wrong URL state

#### The Fix

```typescript
private async executeLoopElements(block: Block, scope?: Scope) {
    // ... setup code ...
    
    // Save previous state
    const previousReturnUrl = this._returnUrl;
    
    try {
        for (let i = startIndex; i < maxIter; i++) {
            this._returnUrl = loopStartUrl;  // Set for this iteration
            
            // ... iteration body with try/catch per iteration ...
        }
    } finally {
        // RESTORE: Guarantee cleanup even if exception thrown
        this._returnUrl = previousReturnUrl;
    }
}
```

**Additional safeguard:** Clear `_returnUrl` at start of `execute()` method:
```typescript
this._returnUrl = null;  // Reset at execution start
```

#### Test Case

```typescript
// Test: _returnUrl isolation between executions
blueprint1: [navigate → loop → click → go_back]
blueprint2: [navigate → go_back]

1. Start blueprint1, stop during loop
2. Immediately run blueprint2
3. Assert: blueprint2's go_back uses browser history, not blueprint1's URL
```

---

### 1.2 Transformer Silent Failures - Data Loss Bug

**File:** `entrypoints/content/env-handler.ts:119-141` (regex transformer)  
**Severity:** High  
**Likelihood:** High (any invalid regex triggers it)

#### The Problem

In `applyTransformers()`, when a transformer fails, it sets `value = ''` instead of preserving the original:

```typescript
case 'regex':
    if (transform.pattern) {
        const regex = new RegExp(pattern, flags);
        // ... regex operations ...
        try {
            const match = value.match(regex);
            value = match ? match[0] : '';  // If no match, returns ''
        } catch (e) {
            // PROBLEM: Caught but NOT rethrown
            console.warn('Regex failed:', e);
            value = '';  // SILENT DATA LOSS
        }
    }
    break;
```

#### Root Cause

Error handling prioritizes "continue extraction" over "preserve data integrity." When regex fails:
- User sees: ✅ Extraction successful
- Reality: Field value is now empty string
- User doesn't know data was lost unless they manually verify

#### Impact Scenarios

1. **Price extraction:** `"$99.99"` with regex `\d+\.\d{2}` works, but `"$99"` (no decimals) → empty string
2. **Date parsing:** Invalid date format → empty string instead of preserving original
3. **JSON parsing:** Malformed JSON → empty string, losing the entire raw value

#### The Fix

Change error handling strategy:

```typescript
case 'regex':
    if (transform.pattern) {
        try {
            const regex = new RegExp(pattern, flags);
            const match = value.match(regex);
            
            // If no match but pattern valid, preserve original with warning
            if (!match) {
                console.warn(`[OctoGrab] Regex "${pattern}" had no match for: "${value.substring(0, 50)}"`);
                // Keep original value - don't overwrite with ''
                break;
            }
            
            if (transform.extractGroup !== undefined) {
                if (match[transform.extractGroup]) {
                    value = match[transform.extractGroup];
                } else {
                    // Group doesn't exist - log, preserve original
                    console.warn(`[OctoGrab] Regex group ${transform.extractGroup} not found in match`);
                    // Don't overwrite value
                }
            } else {
                value = match[0];
            }
        } catch (e) {
            // Invalid regex pattern - this IS an error
            console.error(`[OctoGrab] Invalid regex pattern "${pattern}":`, e);
            // Option A: Preserve original (data-safe)
            // Option B: Throw to fail extraction (error-visible)
            // Decision: Option B for invalid patterns, A for no-match
            throw new Error(`Invalid regex pattern: ${pattern}`);
        }
    }
    break;
```

#### Additional Transformers Needing Review

| Transformer | Current Behavior | Risk |
|-------------|------------------|------|
| `parse_number` | Returns `''` if no digits found | Medium |
| `currency_convert` | Returns original if NaN | OK |
| `parse_json` | Returns `''` on parse error | High |
| `split` | Returns `''` if delimiter not found | Medium |
| `parse_date` | Returns original on error | OK |

---

### 1.3 Date Parsing Accepts Invalid Input

**File:** `entrypoints/content/env-handler.ts:199-227`  
**Severity:** Medium  
**Likelihood:** High (any non-date string passes through)

#### The Problem

The `parse_date` transformer doesn't validate the Date object created:

```typescript
case 'parse_date':
    try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {  // Only checks for NaN, not invalid dates
            // ... formatting ...
        }
    } catch (e) {
        console.warn('Date parse failed:', e);
    }
    break;
```

JavaScript's `new Date()` is extremely lenient:
- `new Date("not a date")` → Invalid Date object (timestamp = NaN) ✓ Caught
- `new Date("")` → Epoch (1970-01-01) ✗ Passes through!
- `new Date("abc123")` → Invalid Date ✓ Caught
- `new Date("13/45/2024")` → Invalid Date ✓ Caught (some browsers)

But more insidious:
- `new Date("Tuesday")` → Next occurring Tuesday from now (!)
- `new Date("March")` → March 1st of current year
- `new Date("1")` → January 1st, 2001

#### Root Cause

Over-reliance on `new Date()` coercion without input validation.

#### Impact Scenarios

1. **Empty string becomes 1970:** User extracts field that's sometimes empty → becomes "1970-01-01"
2. **Relative dates parsed as absolute:** "Yesterday" in text becomes an actual date
3. **Partial matches:** "Updated 2 hours ago" → parses as something completely wrong

#### The Fix

Add input validation before Date parsing:

```typescript
case 'parse_date':
    try {
        // Pre-validation: reject suspicious inputs
        if (!value || value.trim() === '') {
            console.warn('[OctoGrab] Date parse: empty value');
            break;  // Keep original
        }
        
        // Reject relative time strings
        const relativePatterns = [
            /\b(yesterday|today|tomorrow|now|ago|from now)\b/i,
            /\b\d+\s+(minute|hour|day|week|month|year)s?\s+(ago|from now)\b/i,
        ];
        if (relativePatterns.some(p => p.test(value))) {
            console.warn(`[OctoGrab] Date parse: rejecting relative time "${value}"`);
            break;  // Keep original
        }
        
        const date = new Date(value);
        
        // Validate it's a real date
        if (isNaN(date.getTime())) {
            console.warn(`[OctoGrab] Date parse: invalid date "${value}"`);
            break;  // Keep original
        }
        
        // Sanity check: year should be reasonable (not 1970 epoch from "")
        const year = date.getFullYear();
        if (year < 1900 || year > 2100) {
            console.warn(`[OctoGrab] Date parse: suspicious year ${year} from "${value}"`);
            // Option: still format it, or keep original
        }
        
        // ... formatting ...
        
    } catch (e) {
        console.warn('[OctoGrab] Date parse error:', e);
        // Keep original on any error
    }
    break;
```

---

## 2. Missing Implementations (Type vs Reality)

### 2.1 Formula Evaluation in Extract Scope

**Type exists:** `ExtractionField.formula?: string`  
**Not implemented in:** `ENV_EXTRACT_RECORD` handler  
**Impact:** Users can save formulas but they never execute

#### The Feature

Formulas allow computed fields:
```typescript
{
    key: 'totalPrice',
    formula: '{{price}} * {{quantity}} * 1.08',  // Price + 8% tax
    mode: 'formula'  // Would need to add this mode
}
```

#### Current State

The field exists in the type definition but:
1. No `mode: 'formula'` exists (only 'extracted' | 'static')
2. `ENV_EXTRACT_RECORD` doesn't check for formulas
3. No formula parser implemented

#### Implementation Requirements

```typescript
// 1. Add to types
export type FieldMode = 'extracted' | 'static' | 'formula';

// 2. Formula parser (safe - no eval)
class FormulaEvaluator {
    private fields: Record<string, any>;
    
    constructor(fields: Record<string, any>) {
        this.fields = fields;
    }
    
    evaluate(formula: string): string | number {
        // Replace {{fieldKey}} with values
        let expression = formula.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const value = this.fields[key];
            if (value === undefined || value === null) {
                throw new Error(`Field "${key}" not found for formula`);
            }
            // Escape for math evaluation
            return typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : String(value);
        });
        
        // Safe math evaluation
        return this.safeMathEval(expression);
    }
    
    private safeMathEval(expression: string): number {
        // Only allow: numbers, +, -, *, /, %, parentheses, decimals
        if (!/^[\d\s\+\-\*\/\%\(\)\.\"\']+$/.test(expression)) {
            throw new Error('Invalid characters in formula');
        }
        
        // Use Function constructor with limited scope (safer than eval)
        try {
            const fn = new Function('return ' + expression);
            const result = fn();
            if (typeof result !== 'number' || isNaN(result)) {
                throw new Error('Formula did not evaluate to a number');
            }
            return result;
        } catch (e) {
            throw new Error(`Formula evaluation failed: ${e.message}`);
        }
    }
}

// 3. Usage in ENV_EXTRACT_RECORD
if (field.mode === 'formula' && field.formula) {
    const evaluator = new FormulaEvaluator(result);  // result has other extracted values
    value = evaluator.evaluate(field.formula);
}
```

#### Edge Cases to Handle

- **Circular dependencies:** Field A formula references B, B references A
- **Type coercion:** String concatenation vs number math
- **Missing fields:** Formula references field that doesn't exist or wasn't extracted
- **Order of evaluation:** Formula fields must be processed after regular fields

#### UI Considerations

- Formula preview: Show result as user types
- Field picker: Dropdown to insert `{{fieldName}}`
- Validation: Real-time error checking

---

### 2.2 Static Field Types Unimplemented

**Types exist:** `uuid`, `random_number`, `date`, `auto_increment` in `StaticFieldType`  
**Interface exists:** `ExtractionField.staticType`, `staticValue`, `staticMin`, `staticMax`, etc.  
**Not implemented:** `ENV_EXTRACT_RECORD` ignores `mode: 'static'`

#### The Current Code Gap

```typescript
// In ENV_EXTRACT_RECORD handler:
for (const field of fields) {
    let value: any = null;
    
    if (field.mode === 'static') {
        // PROBLEM: No implementation - falls through
        // value remains null
    } else {
        // Regular extraction logic...
    }
    
    result[key] = value;  // null for static fields!
}
```

#### Required Implementation

```typescript
if (field.mode === 'static') {
    switch (field.staticType) {
        case 'constant':
            value = field.staticValue ?? '';
            break;
            
        case 'uuid':
            value = crypto.randomUUID();  // Or uuidv4 library
            break;
            
        case 'random_number':
            const min = field.staticMin ?? 0;
            const max = field.staticMax ?? 100;
            value = Math.floor(Math.random() * (max - min + 1)) + min;
            break;
            
        case 'date':
            const now = new Date();
            const format = field.staticDateFormat ?? 'YYYY-MM-DD';
            value = formatDate(now, format);  // Use existing formatter
            break;
            
        case 'auto_increment':
            // PROBLEM: Need counter that persists across loop iterations
            // Store in execution context
            const counterKey = `${blockId}:${field.key}`;
            const current = executionContext.counters[counterKey] ?? (field.staticStartFrom ?? 1);
            value = current;
            executionContext.counters[counterKey] = current + 1;
            break;
    }
}
```

#### Auto-Increment Challenge

The auto-increment type requires state that persists across loop iterations and extractions. Currently `_autoIncrementCounters` exists in `blueprint-executor-store.ts` (line 80) but is never populated.

```typescript
// In blueprint-executor-store.ts
private _autoIncrementCounters: Record<string, number> = {};

// Usage in extract_scope execution:
if (field.staticType === 'auto_increment') {
    const key = `${block.id}:${field.key}`;
    const start = field.staticStartFrom ?? 1;
    const current = this._autoIncrementCounters[key] ?? start;
    value = current;
    this._autoIncrementCounters[key] = current + 1;
}
```

#### Use Cases

| Type | Use Case |
|------|----------|
| `constant` | Add source URL, "scraped by OctoGrab" watermark |
| `uuid` | Generate unique IDs for database import |
| `random_number` | A/B testing groups, sampling |
| `date` | Extraction timestamp for data freshness |
| `auto_increment` | Row numbering, sequence IDs |

---

### 2.3 `indexVariable` Unused in Loop Elements

**Type exists:** `LoopElementsBlockConfig.indexVariable?: string`  
**Never implemented:** Not read, not set, not passed to context

#### The Gap

```typescript
// Type definition has it:
export interface LoopElementsBlockConfig {
    selector: Selector;
    maxIterations?: number;
    indexVariable?: string;  // Exists!
}

// But in executeLoopElements:
const childScope: Scope = {
    selector: sel.value,
    selectorType: (sel.type || 'css') as 'css' | 'xpath',
    index: i,
    parent: scope,
    context: {
        ...scope?.context,
        loopItemIndex: i,  // Only this is set
        // indexVariable NOT used!
    }
};
```

#### What It Should Do

Allow users to name the loop index variable for use in conditions or extraction:

```typescript
// User sets indexVariable: 'rowNum'
// Inside loop, they can reference it:
// - In condition: check if {{rowNum}} > 10
// - In extraction: field with value: '{{rowNum}}'
```

#### Implementation

```typescript
// 1. Store in context
const childScope: Scope = {
    // ...
    context: {
        ...scope?.context,
        loopItemIndex: i,
        // Add dynamic key if indexVariable set
        ...(config.indexVariable ? { [config.indexVariable]: i + 1 } : {}),
    }
};

// 2. Variable resolution system needed
// In condition blocks and field extraction:
function resolveVariables(value: string, context: Record<string, any>): string {
    return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return context[varName] !== undefined ? String(context[varName]) : match;
    });
}
```

#### Requires: Variable System

This depends on the broader variable system (item 4.2). Without variable resolution infrastructure, `indexVariable` has no purpose.

---

## 3. Improvements (Detailed)

### 3.1 Add Rate Limiting / Politeness

**Current State:** Loops hammer the server as fast as possible

```typescript
// Current: No delays between iterations
for (let i = startIndex; i < maxIter; i++) {
    await this.executeBlock(child, scope);  // Immediate next
}
```

#### Why It Matters

1. **Server protection:** Fast scraping can trigger rate limits or IP bans
2. **Page stability:** Some sites need time to render after interactions
3. **Human-like behavior:** Randomized delays appear less bot-like
4. **Resource usage:** Prevents browser freezing on large loops

#### Implementation

```typescript
// Add to LoopElementsBlockConfig
interface LoopElementsBlockConfig {
    selector: Selector;
    maxIterations?: number;
    indexVariable?: string;
    delayBetweenIterations?: number;   // Base delay in ms
    randomJitter?: number;              // Max random additional ms
    respectRobotsTxt?: boolean;         // Future: check robots.txt
}

// In executeLoopElements
for (let i = startIndex; i < maxIter; i++) {
    // ... iteration body ...
    
    // Add delay between iterations (not after last)
    if (i < maxIter - 1 && config.delayBetweenIterations) {
        const jitter = config.randomJitter 
            ? Math.floor(Math.random() * config.randomJitter)
            : 0;
        const totalDelay = config.delayBetweenIterations + jitter;
        
        this.log('info', `  ⏱ Waiting ${totalDelay}ms before next iteration...`);
        await this.delay(totalDelay);
    }
}
```

#### Default Values Discussion

Should there be a default delay? Options:
- **No default:** Fastest, but risk of bans
- **500ms default:** Safer, but slower for all users
- **Smart default:** Detect domain, apply different defaults

Recommendation: No default, but show warning in UI if delay is 0 and iteration count > 10.

---

### 3.2 Block-Level Timeouts

**Current State:** Only `navigate` has a timeout parameter

```typescript
// Navigate block has this:
const timeout = config.timeout || 30000;

// Other blocks hang indefinitely if:
// - Selector never matches
// - Click triggers infinite navigation loop
// - Network request hangs
```

#### Implementation Design

Add timeout to `BaseBlock` so all blocks inherit it:

```typescript
export interface BaseBlock {
    id: string;
    type: string;
    // ... existing ...
    maxRetries?: number;
    retryDelay?: number;
    maxExecutionTime?: number;  // NEW: per-block timeout in ms
}
```

Usage in executeBlock:

```typescript
private async executeBlock(block: Block, scope?: Scope) {
    const timeout = block.maxExecutionTime || 30000;  // Default 30s
    
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(
            new Error(`Block "${block.label}" exceeded ${timeout}ms timeout`)
        ), timeout);
    });
    
    // Race actual execution against timeout
    await Promise.race([
        this.executeBlockInternal(block, scope),
        timeoutPromise
    ]);
}
```

#### Special Cases

| Block | Default Timeout | Notes |
|-------|-----------------|-------|
| `navigate` | 30s | Keep existing |
| `click` | 15s | Includes wait after click |
| `wait` | Configurable | Should match wait duration |
| `loop_elements` | 5 min | Per-iteration timeout separate |
| `extract_scope` | 30s | Per-extraction timeout |

#### UI Considerations

- Advanced section: "Max execution time"
- Default shown as placeholder
- Warning if set > 5 minutes

---

### 3.3 XPath Support Gaps

**Current State:** Types allow `'xpath'` selector type, but implementation not verified

```typescript
// selector.ts allows it:
export type SelectorType = 'css' | 'xpath';

// But env-handler.ts never tests XPath paths
```

#### Potential Issues

1. **Scope resolution:** `resolveScope()` in `dom-query.ts` must handle XPath properly
2. **Element preview:** AI agent's `queryElementPreview` likely CSS-only
3. **AI generation:** Prompts don't mention XPath, so AI probably never generates it

#### Verification Checklist

```typescript
// Test cases needed:
[
    { selector: '//div[@class="item"]', type: 'xpath' },
    { selector: './/span[contains(text(), "Price")]', type: 'xpath' },  // Relative
    { selector: '/html/body/div[1]', type: 'xpath' },  // Absolute
]

// With scope:
{
    scope: { selector: '//div[@class="parent"]', type: 'xpath', index: 0 },
    childSelector: './/span',  // Relative to scope
    childType: 'xpath'
}
```

#### Implementation Gaps

If XPath support is incomplete:
1. Remove from types (breaking change)
2. Add `document.evaluate()` based implementation
3. Test thoroughly with scoped queries

Recommendation: Audit current XPath support. If broken, fix or remove to avoid confusion.

---

### 3.4 Better Network Idle Fallback

**Current State:** If network monitor unavailable, falls back to 1s delay

```typescript
case 'ENV_WAIT_NETWORK_IDLE': {
    const monitor = (window as any).__octoGrabNetworkMonitor__;
    if (!monitor) {
        console.warn('[OctoGrab] NetworkMonitor not found, falling back to simple delay');
        await new Promise(r => setTimeout(r, 1000));  // PROBLEM: Arbitrary 1s
        return { success: true, message: 'Fallback delay' };
    }
    // ... use monitor ...
}
```

#### Why 1s Is Insufficient

- Page with heavy JS: May still be loading at 1s
- Fast page: Wastes 1s doing nothing
- No actual idle detection: Just a sleep

#### Better Implementation

```typescript
async function waitForNetworkIdleFallback(timeout: number): Promise<void> {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        // Check if already complete
        if (document.readyState === 'complete') {
            // Still wait for next tick to flush pending microtasks
            setTimeout(resolve, 0);
            return;
        }
        
        // Listen for load event
        const onLoad = () => {
            cleanup();
            // Give extra tick for post-load scripts
            setTimeout(resolve, 100);
        };
        
        // Timeout handler
        const timer = setTimeout(() => {
            cleanup();
            console.warn('[OctoGrab] Network idle timeout');
            resolve();  // Resolve anyway, don't block forever
        }, timeout);
        
        const cleanup = () => {
            window.removeEventListener('load', onLoad);
            clearTimeout(timer);
        };
        
        window.addEventListener('load', onLoad);
    });
}
```

#### Additional: Monitor Initialization Check

The monitor might not be initialized if content script didn't inject properly. Add initialization check:

```typescript
if (!monitor) {
    // Try to initialize now
    (window as any).__octoGrabNetworkMonitor__ = new NetworkMonitor();
    // Retry with monitor
}
```

---

## 4. New Block Types (Detailed Specifications)

### 4.1 `assert` Block

**Purpose:** Fail fast when expected page state is not met

#### Use Cases

1. **Login required detection:** Assert "Sign In" button doesn't exist → fail if found
2. **Data availability:** Assert at least 10 items exist → fail if fewer
3. **Page stability:** Assert loading spinner hidden → fail if still visible after 10s

#### Specification

```typescript
interface AssertBlockConfig {
    selector: Selector;
    check: 'exists' | 'not_exists' | 'visible' | 'hidden' | 
           'text_equals' | 'text_contains' | 'text_regex' | 'count_at_least';
    value?: string | number;
    timeout?: number;  // Max time to wait for condition
    failMessage?: string;  // Custom error shown to user
}

class AssertBlock implements BaseBlock {
    type = 'assert';
    config: AssertBlockConfig;
    // No children - terminal check
}
```

#### Execution Logic

```typescript
private async executeAssert(block: Block, scope?: Scope) {
    const config = block.config as AssertBlockConfig;
    const startTime = Date.now();
    const timeout = config.timeout || 5000;
    
    while (Date.now() - startTime < timeout) {
        const conditionMet = await this.checkCondition(config, scope);
        
        if (conditionMet) {
            this.log('success', `✓ Assertion passed: ${config.check}`);
            return;  // Success, continue execution
        }
        
        await this.delay(250);
    }
    
    // Timeout = assertion failed
    const message = config.failMessage || 
        `Assertion failed: Expected "${config.check}" on ${config.selector.value}`;
    
    this.log('error', `❌ ${message}`);
    throw new Error(message);  // STOP execution
}
```

#### UI Design

- Warning color (orange) to indicate "this can stop execution"
- Inline error message preview
- Optional: "Continue on failure" checkbox (converts to warning instead of error)

---

### 4.2 Variable System (`set_variable`, `get_variable`)

**Purpose:** Pass data between blocks in a blueprint

#### The Problem

Currently no way to:
- Extract value in loop, use it in later navigation
- Build up a filename from multiple extractions
- Pass parameters between blueprint sections

#### Specification

```typescript
interface SetVariableBlockConfig {
    variableName: string;
    valueSource: 'static' | 'selector' | 'formula' | 'extracted_value';
    // For 'static':
    staticValue?: string;
    // For 'selector':
    selector?: Selector;
    attribute?: AttributeType;
    // For 'formula':
    formula?: string;
    // For 'extracted_value':
    sourceFieldKey?: string;  // From previous extract_scope in same iteration
}

interface GetVariableBlockConfig {
    variableName: string;
    // Used as value source in input blocks, conditions, etc.
}
```

#### Storage

```typescript
// In BlueprintExecutorStore
private _variables: Record<string, any> = {};  // Global to this execution

// Scoped variables per loop iteration?
private _loopVariables: Map<string, Record<string, any>> = new Map();
```

#### Usage Patterns

```typescript
// Pattern 1: Extract and reuse
[
    { type: 'set_variable', variableName: 'productId', valueSource: 'selector', selector: '.id' },
    { type: 'navigate', url: 'https://example.com/product/{{productId}}' },
    { type: 'extract_scope', fields: [...] },
]

// Pattern 2: Accumulate filename
[
    { type: 'set_variable', variableName: 'filename', valueSource: 'static', staticValue: 'data-' },
    { type: 'set_variable', variableName: 'filename', valueSource: 'formula', formula: '{{filename}}{{date}}.csv' },
    // Use in export block (future feature)
]
```

#### Implementation Notes

- Variable names: Allow `[a-zA-Z_][a-zA-Z0-9_]*`
- Resolution order: Loop local → Execution global → '' (empty if not found)
- UI: Variable picker dropdown in input fields

---

### 4.3 `hover` Block

**Purpose:** Trigger mouseenter/mouseover before click (for dropdown menus, tooltips)

#### Specification

```typescript
interface HoverBlockConfig {
    selector: Selector;
    duration?: number;  // ms to hold hover (default: 500)
    moveToElement?: boolean;  // Move mouse to element vs just triggering event
}
```

#### Implementation

```typescript
// Content script side
function hoverElement(selector: string, selectorType: SelectorType, duration: number) {
    const el = getElement(selector, selectorType);
    if (!el) throw new Error('Element not found for hover');
    
    // Trigger events in order
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    
    // Optional: Actually move mouse (requires Chrome DevTools Protocol, not possible in content script)
    // So we just dispatch events
    
    return new Promise(resolve => setTimeout(resolve, duration));
}
```

#### Use Cases

- E-commerce: Hover to reveal "Add to Cart" button
- Dropdown menus: Hover to reveal submenu items
- Tooltips: Hover to reveal additional data

---

### 4.4 `switch_frame` Block

**Purpose:** Handle iframes (embedded content, payment forms)

#### Specification

```typescript
interface SwitchFrameBlockConfig {
    target: 'default' | 'parent' | 'selector';
    selector?: Selector;  // Required if target === 'selector'
}
```

#### Implementation Complexity

HIGH. Requires:
1. Tracking current frame context
2. Modifying all selectors to work within frame
3. Message passing to content script in correct frame
4. Chrome extension APIs for frame access

#### Alternative: Frame-Scoped Extraction

Instead of switching frames, allow specifying frame in selector:

```typescript
interface Selector {
    value: string;
    type: 'css' | 'xpath';
    frameSelector?: string;  // NEW: Query within this iframe
}
```

This is simpler but less flexible.

---

## 5. Architecture Gaps (Detailed)

### 5.1 Blueprint Schema Versioning

#### The Problem

Blueprints saved today may not work with future code:
- New required fields added
- Field meanings change
- New block types added

No migration path exists.

#### Current State

```typescript
// Blueprint has NO version field
export class Blueprint {
    id: string;
    name: string;
    description: string;
    blocks: Block[];
    // Missing: version!
}
```

#### Implementation

```typescript
const CURRENT_SCHEMA_VERSION = 1;

export class Blueprint {
    id: string;
    version: number = CURRENT_SCHEMA_VERSION;  // NEW
    // ...
}

// Migration system
const migrations: Record<number, (blueprint: any) => any> = {
    1: (b) => b,  // Current, no changes needed
    // 2: (b) => { /* migrate from 1 to 2 */ },
};

export function migrateBlueprint(blueprint: any): Blueprint {
    const currentVersion = blueprint.version || 0;  // Pre-version = 0
    
    for (let v = currentVersion; v < CURRENT_SCHEMA_VERSION; v++) {
        if (migrations[v + 1]) {
            blueprint = migrations[v + 1](blueprint);
        }
    }
    
    return blueprint;
}
```

---

### 5.2 Block-Level Hooks / Extensibility

#### The Problem

Users need escape hatches for complex logic not covered by built-in blocks.

#### Design Options

**Option A: JS Snippets (CSP Issues)**
```typescript
interface BaseBlock {
    onBeforeExecute?: string;  // JS code - BLOCKED by CSP in Chrome extensions
}
```
Chrome Extension CSP prohibits `eval()` and `new Function()`, making this hard.

**Option B: Plugin System**
```typescript
interface BlockPlugin {
    name: string;
    type: string;
    configSchema: JSONSchema;
    execute: (config: any, scope: Scope, context: ExecutionContext) => Promise<any>;
}

// Register plugins
registerBlockPlugin(myCustomBlock);
```

More work but CSP-safe and version-controlled.

**Option C: Predefined Extension Points**
Add specific hooks for common needs:
- `custom_filter` transformer (user-defined predicate)
- `custom_action` block (sends data to webhook)
- `custom_validation` assertion

---

### 5.3 Blueprint Composition / Macros

#### The Problem

Users want to reuse common patterns across blueprints:
- "Login to site X" sequence
- "Extract table data" pattern
- "Handle pagination" logic

Currently must copy-paste blocks.

#### Specification

```typescript
interface MacroBlockConfig {
    macroBlueprintId: string;  // Reference to another blueprint
    parameterMapping: Record<string, string>;  // localVar → macroInputVar
    outputMapping?: Record<string, string>;   // macroOutputVar → localVar
}

// Example usage:
// Macro blueprint: "login-sequence"
//   Input: {{username}}, {{password}}
//   Output: {{loginSuccess}}

// Main blueprint uses it:
{
    type: 'macro',
    macroBlueprintId: 'login-sequence',
    parameterMapping: {
        'emailVar': 'username',      // local "emailVar" → macro "username"
        'passVar': 'password'        // local "passVar" → macro "password"
    },
    outputMapping: {
        'loginSuccess': 'didLogin'   // macro "loginSuccess" → local "didLogin"
    }
}
```

#### Implementation Complexity

- **HIGH**: Requires variable system first
- **MEDIUM**: Stack management (prevent infinite recursion)
- **MEDIUM**: UI for selecting/selecting macros
- **LOW**: Storage (just reference by ID)

#### Security Concern

Macros could be used to hide malicious behavior. Need:
- Macro source verification
- Execution trace transparency (show expanded macro steps)
- Import/export validation

---

## 6. AI Agent Improvements (Detailed)

### 6.1 Better ScopeSelector Guidance

#### Current Issue

AI frequently generates broken blueprints by setting:
```typescript
// Loop selector
{ selector: '.product-item', type: 'loop_elements' }

// Extract inside loop - WRONG:
{ 
    type: 'extract_scope',
    scopeSelector: { value: '.product-item' },  // REDUNDANT - same as loop!
    fields: [...]
}
```

The auto-fix strips this, but AI keeps generating it.

#### Root Cause

System prompt instructions unclear about scope inheritance.

#### Improved Prompt Section

```markdown
## Scope and Selector Rules (CRITICAL)

When a block is inside a loop_elements or loop_pagination block:
- The loop item itself becomes the scope for all children
- Children should use RELATIVE selectors, NOT re-specify the loop selector
- extract_scope.scopeSelector is for NARROWING (finding a sub-element), not re-specifying

WRONG (DO NOT DO):
- Loop selector: ".product-card"
- Extract scopeSelector: ".product-card" (same thing!)
- Field selector: ".product-card .title" (full path)

CORRECT:
- Loop selector: ".product-card"
- Extract scopeSelector: undefined (inherits loop item scope)
- Field selector: ".title" (relative to .product-card)

ONLY set scopeSelector if you need to find a sub-element within the loop item:
- Loop selector: ".product-card"
- Extract scopeSelector: ".details-section" (narrowing scope)
- Field selector: ".price" (relative to .details-section)
```

#### Additional: Training Examples

Add few-shot examples to prompt showing correct vs incorrect patterns.

---

### 6.2 Execution-Aware Validation

#### Current State

`BlueprintValidator` checks syntax, not semantics:
- ✅ "Missing navigate block" warning exists
- ❌ No warning for "extract_scope at top level" (will only run once)
- ❌ No warning for "click with openInNewTab has no children"
- ❌ No warning for "pagination without exit condition"

#### New Validations Needed

```typescript
// 1. Top-level extract_scope warning
if (block.type === 'extract_scope' && !this.hasAncestorOfType(block, ['loop_elements', 'loop_pagination'])) {
    this.addWarning(
        'Extract block at top level will only execute once. ' +
        'Did you mean to put it inside a loop?',
        block.id, block.label, path
    );
}

// 2. openInNewTab without children
if (block.type === 'click' && block.config.openInNewTab && (!block.children || block.children.length === 0)) {
    this.addWarning(
        'Click with "open in new tab" has no children. ' +
        'The new tab will open and immediately close. ' +
        'Add extraction blocks as children to capture data from the new tab.',
        block.id, block.label, path
    );
}

// 3. Pagination exit condition
if (block.type === 'loop_pagination') {
    const hasExitCondition = block.config.maxPages || 
        block.children?.some(c => c.type === 'condition' && this.isExitCondition(c));
    
    if (!hasExitCondition) {
        this.addWarning(
            'Pagination loop has no exit condition (maxPages or stopping condition). ' +
            'This may run indefinitely.',
            block.id, block.label, path
        );
    }
}
```

---

## Implementation Priority Matrix

| Priority | Issue | Effort | Impact | Risk if Not Fixed |
|----------|-------|--------|--------|-------------------|
| **P0** | Fix `_returnUrl` leak | 30 min | High | Wrong navigation, data corruption |
| **P0** | Fix transformer silent failures | 30 min | High | Silent data loss, user distrust |
| **P0** | Fix date parsing invalid input | 1 hr | Medium | Wrong timestamps, data quality issues |
| **P1** | Implement static field types | 3 hrs | High | Feature appears broken to users |
| **P1** | Implement formula evaluation | 4 hrs | Medium | Power users can't do calculations |
| **P1** | Add rate limiting to loops | 2 hrs | Medium | IP bans, server overload |
| **P2** | Add `assert` block | 2 hrs | Medium | Users can't validate page state |
| **P2** | Add block-level timeouts | 3 hrs | Medium | Hung executions, bad UX |
| **P2** | Add variable system | 6 hrs | High | No data flow between blocks |
| **P3** | Add schema versioning | 1 hr | Low | Migration pain in future |
| **P3** | XPath support verification | 2 hrs | Low | Unclear if feature works |
| **P3** | Network idle improvements | 2 hrs | Low | Unreliable waits |
| **P4** | Blueprint composition | 8 hrs | Medium | Code duplication |
| **P4** | New block types (hover, frames) | 4 hrs | Low | Niche use cases |

---

## Verification Checklist (Per Fix)

### For Each Bug Fix:
- [ ] Unit test reproduces the bug
- [ ] Fix makes test pass
- [ ] No regression in existing tests
- [ ] Manual testing on real blueprints
- [ ] Error messages are user-friendly
- [ ] Logging is appropriate (not too noisy)

### For Each Feature:
- [ ] Type definitions updated
- [ ] UI components updated
- [ ] Validation rules added
- [ ] Documentation updated
- [ ] Example blueprints created
- [ ] Edge cases tested (empty input, large input, special chars)

### Security Review:
- [ ] No `eval()` or `new Function()` without CSP justification
- [ ] All user input sanitized before display
- [ ] Formula evaluation is sandboxed
- [ ] No prototype pollution in object merging
- [ ] Regex patterns are validated before use

---

## Appendix: Code Locations Reference

| Feature | Key Files | Key Functions/Lines |
|---------|-----------|----------------------|
| Loop execution | `blueprint-executor-store.ts` | `executeLoopElements` (~1354) |
| Transformers | `env-handler.ts` | `applyTransformers` (~87) |
| Date parsing | `env-handler.ts` | `parse_date` case (~199) |
| Extraction | `env-handler.ts` | `ENV_EXTRACT_RECORD` (~499) |
| Block factory | `block-factory.ts` | `createBlockFromJSON` (~14) |
| Validation | `blueprint-validator.ts` | `validateBlockConfig` (~104) |
| Blueprint class | `blueprint.ts` | `toJSON`, `fromJSON` |
| Selector types | `selector.ts` | `SelectorType` definition |
