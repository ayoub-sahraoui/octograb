# Bug Fixes - Blueprint Execution System

## Critical Bugs Fixed

### 1. **Selector Handling in ENV Handlers**
**Location**: `entrypoints/content/env-handler.ts`

**Problem**: All ENV handlers (CLICK, INPUT, GET_TEXT, etc.) were not properly handling scope-only operations where no explicit selector is provided but a scope exists.

**Impact**: Blocks inside loops or extract scopes that should operate on the scoped element itself would fail with "selector is required" errors.

**Fix**:
- Added `selector.trim()` checks to allow empty/null selectors when scope exists
- Added default `'css'` fallback for `selectorType` when undefined
- Changed logic to use scope element as target when selector is empty

**Affected Handlers**:
- `ENV_CLICK` (lines 15-55)
- `ENV_INPUT` (lines 57-79)
- `ENV_GET_TEXT` (lines 88-99)
- `ENV_GET_ATTRIBUTE` (lines 101-114)
- `ENV_SCROLL` (lines 116-162)
- `ENV_EXTRACT_RECORD` (lines 164-248)
- `ENV_IS_VISIBLE` (lines 247-272)

**Example Before**:
```typescript
if (selector) {
    const el = getElement(selector, selectorType, scopeEl);
    if (!el) throw new Error(`Element not found: ${selector}`);
    target = el;
}
```

**Example After**:
```typescript
if (selector && selector.trim()) {
    const el = getElement(selector, selectorType || 'css', scopeEl);
    if (!el) throw new Error(`Element not found: ${selector}`);
    target = el;
}
```

### 2. **Selector Null Safety in Executor**
**Location**: `entrypoints/stores/blueprint-executor-store.ts`

**Problem**: Executor was accessing `sel.value` and `sel.type` without null checks, causing crashes when selector is undefined in scope contexts.

**Impact**: Any block operating within a loop or extract scope without an explicit selector would crash.

**Fix**:
- Added optional chaining (`sel?.value`) throughout all block executors
- Added fallback empty string for selector values
- Updated error messages to say "selector or scope is required"
- Updated log messages to show "scope element" when selector is empty

**Affected Methods**:
- `executeClick` (lines 402-497)
- `executeInput` (lines 499-516)
- `executeWait` (lines 518-572)
- `executeCondition` (lines 604-680)

**Example Before**:
```typescript
selector: sel.value,
selectorType: sel.type || 'css',
```

**Example After**:
```typescript
selector: sel?.value || '',
selectorType: sel?.type || 'css',
```

### 3. **Error Message Improvements**
**Problem**: Error messages were misleading, saying "selector is required" even when scope could be used.

**Fix**: Changed all error messages to:
```typescript
throw new Error('Click block: selector or scope is required');
```

This clarifies that either a selector OR a scope is needed, not necessarily both.

## Test Script Added

**Location**: `package.json`

Added test scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

## How These Bugs Manifested

### Scenario 1: Loop with Click on Scoped Element
```typescript
// Loop over product cards
LoopElements {
  selector: '.product-card',
  children: [
    Click {
      selector: null,  // Want to click the card itself
      // ❌ BEFORE: Would fail with "selector is required"
      // ✅ AFTER: Clicks the scoped .product-card element
    }
  ]
}
```

### Scenario 2: Extract with Scope-Relative Fields
```typescript
ExtractScope {
  scopeSelector: '.user-profile',
  fields: [
    { key: 'name', selector: '.name' },  // Works
    { key: 'bio', selector: '' }         // ❌ BEFORE: Would fail
                                         // ✅ AFTER: Extracts from scope element
  ]
}
```

### Scenario 3: Nested Loops with Implicit Clicks
```typescript
LoopElements {
  selector: '.category',
  children: [
    LoopElements {
      selector: '.item',
      children: [
        Click { selector: null }  // Click the item itself
        // ❌ BEFORE: Crash on sel.value access
        // ✅ AFTER: Works with scope
      ]
    }
  ]
}
```

## Testing Recommendations

1. **Test scope-only operations**: Create blocks that operate on scoped elements without explicit selectors
2. **Test nested loops**: Verify children can access parent scope elements
3. **Test extraction**: Ensure fields can extract from scope element when selector is empty
4. **Test all block types**: Click, Input, Wait, Condition all support scope-only mode

## Related Files Modified

1. `entrypoints/content/env-handler.ts` - ENV message handlers
2. `entrypoints/stores/blueprint-executor-store.ts` - Block execution logic
3. `package.json` - Added test scripts

## Validation

All fixes maintain backward compatibility:
- Blocks with explicit selectors work exactly as before
- New capability: blocks can now omit selectors when operating in a scope context
- Error messages are clearer about requirements
