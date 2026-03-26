# OctoGrab Blueprint System - Issues & Improvement Plan

**Date:** 2026-03-26  
**Source:** Analysis of `entrypoints/models/` and `entrypoints/content/env-handler.ts`

---

## 1. Critical Bugs (Fix Immediately)

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
**Not implemented in:** `applyTransformers()`

Formula like `"{{price}} * 1.2"` is stored but never evaluated during extraction.

**Implementation needed:**
- Parse `{{fieldKey}}` placeholders
- Basic math operators (+, -, *, /, %)
- Parentheses support
- Safe evaluation (no `eval()`)

---

### 2.2 Static Field Types Unimplemented
**Types exist:** `uuid`, `random_number`, `date`, `auto_increment`  
**Not implemented in:** `ENV_EXTRACT_RECORD` handler

```typescript
// Currently ignored:
if (field.mode === 'static') {
    // No implementation - falls through to null
}
```

**Implementation needed:**
| Type | Behavior |
|------|----------|
| `uuid` | Generate v4 UUID per extraction |
| `random_number` | Random between `staticMin` and `staticMax` |
| `date` | Current date in `staticDateFormat` |
| `auto_increment` | Counter starting at `staticStartFrom`, increment per row |

---

### 2.3 `indexVariable` Unused in Loop Elements
**Type exists:** `LoopElementsBlockConfig.indexVariable?: string`  
**Never written to:** Loop context only tracks `loopItemIndex`, not exposed to user-defined variable.

**Use case:** User wants to number rows starting from 1, or use index in conditions.

---

## 3. Improvements

### 3.1 Add Rate Limiting / Politeness
**File:** `blueprint-executor-store.ts`  

No delay between loop iterations. Add:
```typescript
interface LoopElementsBlockConfig {
    // ... existing ...
    delayBetweenIterations?: number;  // ms
    randomJitter?: number;            // max random additional ms
}
```

---

### 3.2 Block-Level Timeouts
Currently only `navigate` has timeout. Add to all blocks:
- `maxExecutionTime?: number` (per block)
- Auto-abort if exceeded
- Configurable in UI

---

### 3.3 XPath Support Gaps
`selector.ts` allows `'xpath'` but env handlers not fully tested. Verify:
- `getElements()` with XPath in all contexts
- Scope resolution with XPath
- AI selector generation producing valid XPath

---

### 3.4 Better Network Idle Fallback
**File:** `env-handler.ts:680-692`

If `__octoGrabNetworkMonitor__` missing, only does 1s delay. Should:
- Listen for `DOMContentLoaded` + `load` events
- Check `document.readyState`
- Wait for `setTimeout(0)` to flush microtasks

---

## 4. New Block Types (Priority Order)

### 4.1 `assert` Block (High Priority)
Validation that fails if condition not met. Like `condition` but throws on mismatch.

```typescript
interface AssertBlockConfig {
    selector: Selector;
    check: 'exists' | 'text_equals' | 'text_contains';
    value?: string;
    failMessage?: string;
}
```

**Use case:** Validate page state before extraction; fail fast with clear message.

---

### 4.2 `set_variable` / `get_variable` Blocks (High Priority)
Enable data flow between blocks:

```typescript
interface SetVariableBlockConfig {
    variableName: string;
    valueSource: 'static' | 'selector' | 'formula';
    value: string;  // or selector config
    scope?: 'local' | 'global' | 'blueprint';
}
```

**Use case:** Extract ID from list page, navigate to detail, use ID in filename.

---

### 4.3 `hover` Block (Medium Priority)
Trigger mouseenter before click (for dropdown menus).

---

### 4.4 `switch_frame` Block (Medium Priority)
Handle iframes:
```typescript
interface SwitchFrameBlockConfig {
    target: 'default' | 'parent' | { selector: Selector };
}
```

---

## 5. Architecture Gaps

### 5.1 Blueprint Schema Versioning
Add `version` field to Blueprint JSON for migration path:
```typescript
interface Blueprint {
    id: string;
    version: number;  // Current: 1
    // ...
}
```

---

### 5.2 Block-Level Hooks / Extensibility
Add lifecycle hooks:
```typescript
interface BaseBlock {
    // ... existing ...
    onBeforeExecute?: string;  // JS snippet (CSP-safe?)
    onAfterExecute?: string;
}
```

Alternative: Plugin system with well-defined extension points.

---

### 5.3 Blueprint Composition / Macros
Allow importing other blueprints as subroutines:
```typescript
interface MacroBlockConfig {
    blueprintId: string;
    parameterMapping: Record<string, string>;  // local var → macro input
}
```

---

## 6. AI Agent Improvements

### 6.1 Better ScopeSelector Guidance
Current auto-fix strips redundant `scopeSelector`, but root cause is AI instruction clarity. Update system prompt:

```
When inside loop_elements:
- DO NOT set extract_scope.scopeSelector to match loop selector
- scopeSelector is for NARROWING scope, not re-specifying it
- Field selectors must be RELATIVE to the loop item
```

---

### 6.2 Execution-Aware Validation
`blueprint-validator.ts` warns about missing `navigate` block. Extend:
- Warn if `extract_scope` at top level without loop
- Warn if `click` with `openInNewTab` has no children
- Warn if infinite loop likely (pagination without exit condition)

---

## Implementation Priority

| Priority | Issue | Effort |
|----------|-------|--------|
| P0 | Fix `_returnUrl` leak | 30 min |
| P0 | Fix transformer silent failures | 30 min |
| P1 | Implement formula evaluation | 4 hrs |
| P1 | Implement static field types | 3 hrs |
| P1 | Add rate limiting to loops | 2 hrs |
| P2 | Add `assert` block | 2 hrs |
| P2 | Add variable system | 6 hrs |
| P2 | Add block-level timeouts | 3 hrs |
| P3 | Add schema versioning | 1 hr |
| P3 | XPath support verification | 2 hrs |
| P3 | Network idle improvements | 2 hrs |
| P4 | Blueprint composition | 8 hrs |
| P4 | New block types (hover, frames) | 4 hrs |

---

## Verification Checklist

After each fix:
- [ ] Run existing blueprint tests
- [ ] Test error recovery in loop with `go_back`
- [ ] Verify transformer errors show in logs
- [ ] Test date parsing with invalid input
- [ ] Check XSS vectors in formula evaluation
- [ ] Verify static fields generate unique values per row
