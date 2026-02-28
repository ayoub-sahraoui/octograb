# OctoGrab — System Enhancements & Bug Report

> **Generated:** 2026-02-12 · **Scope:** Full codebase audit

---

## Table of Contents

1. [Critical Bugs](#1-critical-bugs)
2. [Architectural Issues](#2-architectural-issues)
3. [Missing Features](#3-missing-features)
4. [Code Quality Issues](#4-code-quality-issues)
5. [Enhancement Roadmap](#5-enhancement-roadmap)

---

## 1. Critical Bugs

### 🔴 Bug 1: `ENV_IS_VISIBLE` Not in MessageType Union

**File:** `core/messaging.ts` (line 8)  
**Impact:** TypeScript won't catch typos in `ENV_IS_VISIBLE` messages.

The `MessageType` union defines all valid message types, but `ENV_IS_VISIBLE` is missing from it. The executor sends `{ type: 'ENV_IS_VISIBLE' }` and the env-handler handles it, but TypeScript can't validate it because the type isn't in the union.

```typescript
// messaging.ts — ENV_IS_VISIBLE is missing from this union
export type MessageType =
  | 'ENV_EXTRACT_RECORD'
  | 'ENV_COUNT'
  | 'ENV_GET_TEXT'
  | 'ENV_GET_ATTRIBUTE'
  | 'ENV_CLICK'
  | 'ENV_INPUT'
  | 'ENV_SCROLL'
  // ❌ Missing: 'ENV_IS_VISIBLE'
```

**Fix:** Add `| 'ENV_IS_VISIBLE'` to the `MessageType` union.

---

### 🔴 Bug 2: `ENV_GET_ATTRIBUTE` Has No Handler

**File:** `entrypoints/content/env-handler.ts`  
**Impact:** Any block trying to get an element attribute via this message type will silently fail (returns `null`).

The `MessageType` union includes `ENV_GET_ATTRIBUTE`, but the env-handler's switch statement has no `case 'ENV_GET_ATTRIBUTE'`. This means the message falls through to `return null`, which the messaging layer interprets as "not handled."

**Fix:** Add a handler:
```typescript
case 'ENV_GET_ATTRIBUTE': {
    const { selector, selectorType, scope, attribute } = msg.data;
    const scopeEl = resolveScope(scope);
    let target = scopeEl;
    if (selector) {
        const el = getElement(selector, selectorType, scopeEl);
        if (!el) throw new Error(`Element not found: ${selector}`);
        target = el;
    }
    const value = target.getAttribute(attribute) || '';
    return { success: true, data: value };
}
```

---

### 🔴 Bug 3: `text_regex` Condition Check Not Implemented

**File:** `entrypoints/stores/blueprint-executor-store.ts` (line 432)  
**Impact:** The `ConditionBlock` model supports `check: 'text_regex'`, but the executor only handles `text_contains` and `text_equals`. A `text_regex` condition silently does nothing.

```typescript
// condition-block.ts defines this check type:
check: '...' | 'text_regex' | '...'

// executor handles these, but NOT text_regex:
case 'text_contains':
case 'text_equals':
    // ❌ text_regex is never matched
```

**Fix:** Add `text_regex` case in `executeCondition()`:
```typescript
case 'text_regex': {
    const textResp = await this.send({ ... });
    const text = textResp.data as string;
    const regex = new RegExp(config.value || '', 'i');
    conditionMet = regex.test(text);
    break;
}
```

---

### 🔴 Bug 4: `element_into_view` Scroll Behavior Not Implemented

**File:** `entrypoints/content/env-handler.ts` (line 101)  
**Impact:** `ScrollBlockConfig` defines `element_into_view` as a valid behavior, but the env-handler only handles `bottom`, `top`, and `pixels`. Using `element_into_view` does nothing — no error, no scroll.

**Fix:** Add the missing case in the scroll handler:
```typescript
} else if (behavior === 'element_into_view') {
    if (selector) {
        const scopeEl = resolveScope(scope);
        const el = getElement(selector, selectorType, scopeEl);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}
```

---

### 🟡 Bug 5: `RemoteExecutionEnvironment` Still Uses `sendToContentScript` (Legacy)

**File:** `core/remote-env.ts`  
**Impact:** If any code path still uses `RemoteExecutionEnvironment`, it sends messages to the **active tab** instead of the locked target tab, causing commands to go to the wrong tab if the user switches tabs.

The new `BlueprintExecutorStore` correctly uses `sendToTab()`, but `remote-env.ts` uses the old `sendToContentScript()` which queries `{ active: true }`.

**Fix:** Either:
- Delete `remote-env.ts` entirely (if nothing uses it anymore)
- Or refactor it to accept a `tabId` parameter

---

### 🟡 Bug 6: `network_idle` and `dom_content_loaded` Wait Types Are Fake

**File:** `entrypoints/stores/blueprint-executor-store.ts` (lines 366-372)  
**Impact:** These wait types just do a `delay()` — they don't actually check network activity or DOM readiness.

```typescript
} else if (config.type === 'dom_content_loaded') {
    await this.delay(config.timeout || 2000);  // ❌ Not checking DOM
} else if (config.type === 'network_idle') {
    await this.delay(config.idleTime || 500);  // ❌ Not monitoring network
}
```

The `NetworkMonitor` class in `core/network-monitor.ts` exists and is fully implemented, but it's **never used** anywhere.

**Fix:** Wire `NetworkMonitor` into the content script and add `ENV_WAIT_NETWORK_IDLE` message type.

---

### 🟡 Bug 7: Visibility Check Fails for Fixed/Sticky Elements

**File:** `entrypoints/content/env-handler.ts` (line 243)  
**Impact:** `offsetParent` is `null` for fixed/sticky-positioned elements, so they are incorrectly reported as invisible.

```typescript
const isVisible = !!(
    (target as HTMLElement).offsetParent !== null &&  // ❌ Fixed elements have null offsetParent
    ...
);
```

**Fix:** Add a check for `position: fixed` or `position: sticky`:
```typescript
const style = window.getComputedStyle(target);
const isFixed = style.position === 'fixed' || style.position === 'sticky';
const isVisible = !!(
    (isFixed || (target as HTMLElement).offsetParent !== null) &&
    (target as HTMLElement).offsetWidth > 0 &&
    (target as HTMLElement).offsetHeight > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none'
);
```

---

### 🟡 Bug 8: `openInNewTab` Click Opens Window But Executor Doesn't Track It

**File:** `entrypoints/content/env-handler.ts` (line 34) + `blueprint-executor-store.ts`  
**Impact:** When `openInNewTab` is true, the content script opens a `window.open()` but the executor has **no idea** a new tab was created — it doesn't update `_targetTabId`. Children continue executing against the original tab.

**Fix:** After `openInNewTab` click, the executor should:
1. Listen for `browser.tabs.onCreated` to detect the new tab
2. Switch `_targetTabId` to the new tab
3. Wait for content script readiness on the new tab
4. Execute children on the new tab
5. Close the new tab and restore `_targetTabId` when done

---

## 2. Architectural Issues

### 🔴 Issue 1: Dual Execution Systems (Legacy vs New)

The codebase has **two completely separate execution systems** that do the same thing:

| Component                            | System  | Used By                                           |
| ------------------------------------ | ------- | ------------------------------------------------- |
| `core/executor.ts` (PlanExecutor)    | Legacy  | `core/hooks.ts` → `entrypoints/pages/Builder.tsx` |
| `core/remote-env.ts`                 | Legacy  | `PlanExecutor`                                    |
| `core/hooks.ts` (useScraperBuilder)  | Legacy  | `entrypoints/pages/Builder.tsx`                   |
| `stores/blueprint-executor-store.ts` | **New** | `sidepanel/pages/blueprint-builder.tsx`           |

**Problems:**
- Two entry points for running automations, with different behaviors
- Bug fixes in one system don't affect the other
- Confusing for maintenance
- The legacy system uses `Plan` type, the new uses `Blueprint` type — different data models

**Fix:** Remove the legacy chain entirely (`executor.ts`, `remote-env.ts`, `hooks.ts`), and consolidate everything into `BlueprintExecutorStore`.

---

### 🔴 Issue 2: Blueprints Are Not Saved to Database

**File:** `entrypoints/stores/blueprint-builder-store.ts`  
**Impact:** When you close the browser or the extension, **all blueprints are lost**. There is no save/load mechanism.

The database (`core/database.ts`) has full CRUD support for `SavedPlan` — but the `BlueprintBuilderStore` never calls it. The `Blueprint` model and `SavedPlan` type are different data structures, so they can't directly interop.

**Fix:** Add serialization/deserialization:
- `Blueprint.toJSON()` → `SavedPlan` format → `db.savePlan()`
- `db.getPlan()` → `SavedPlan` → `Blueprint.fromJSON()` (new static method)
- Add save/load/delete methods to `BlueprintBuilderStore`

---

### 🔴 Issue 3: Execution History Is Not Saved

**File:** `entrypoints/stores/blueprint-executor-store.ts`  
**Impact:** After execution completes, no history is saved. You can't see past runs, their results, or their logs.

The database has `ExecutionHistory` with full support for saving runs, but `BlueprintExecutorStore` never calls `db.saveExecution()`.

**Fix:** At the end of `execute()`, save the results:
```typescript
await db.saveExecution({
    planId: blueprint.id,
    planName: blueprint.name,
    startedAt: new Date(this.startTime!).toISOString(),
    completedAt: new Date().toISOString(),
    status: this.status === 'completed' ? 'completed' : 'failed',
    itemsScraped: this.extractedData.length,
    results: this.extractedData,
    logs: this.logs.map(l => l.message),
    duration: this.duration || 0,
});
```

---

### 🟡 Issue 4: Unused Modules

Several modules are fully implemented but **never imported or used**:

| Module                    | Purpose                            | Status           |
| ------------------------- | ---------------------------------- | ---------------- |
| `core/network-monitor.ts` | Monitor fetch/XHR for network idle | ❌ Never imported |
| `core/element-cache.ts`   | Cache DOM queries                  | ❌ Never imported |
| `core/plan-validator.ts`  | Validate plans before execution    | ❌ Never imported |
| `core/execution-state.ts` | Track execution state              | ❌ Never imported |
| `core/errors.ts`          | Custom error classes               | ❌ Never imported |
| `core/config.ts`          | Configuration settings             | ❌ Never imported |
| `core/utils.ts`           | Utility functions                  | ❌ Never imported |

**Fix:** Either integrate these modules or delete them. Specifically:
- `NetworkMonitor` → wire into env-handler for real network-idle detection
- `ElementCache` → use in `getElement`/`getElements` for performance
- `PlanValidator` → adapt for Blueprint validation before execution

---

### 🟡 Issue 5: No Background Script Orchestration

**File:** `entrypoints/background.ts`  
**Impact:** The background script only opens the side panel. It should be the hub for:
- Tab lifecycle management (detect when target tab navigates, closes, or crashes)
- Message relay when content script is unavailable
- Execution state persistence across side panel reopens

Currently, if the side panel is closed mid-execution, everything is lost.

---

## 3. Missing Features

### High Priority

| Feature                            | Description                                       | Impact                                                   |
| ---------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| **Blueprint persistence**          | Save/load blueprints to IndexedDB                 | Users lose work on restart                               |
| **Execution history**              | Save completed runs with results                  | No way to review past data                               |
| **Blueprint import/export**        | JSON export/import for sharing                    | Can't share blueprints                                   |
| **Stop signal for content script** | Abort in-progress DOM operations                  | Stop button doesn't immediately cancel content-side work |
| **Execution progress per block**   | Real-time status showing which block is executing | Hard to debug long-running blueprints                    |

### Medium Priority

| Feature                           | Description                                                           | Impact                                                         |
| --------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Duplicate row detection**       | Skip rows already extracted                                           | Paginated scrapes may extract duplicates                       |
| **Variable system**               | Variables like `{{current_url}}`, `{{page_number}}`, `{{loop_index}}` | Can't use dynamic values in blocks                             |
| **Selector fallbacks**            | Try CSS first, then XPath if not found                                | Selector model has `fallbacks[]` but executor doesn't use them |
| **Frame/iframe support**          | Execute inside iframes                                                | Can't interact with iframe content                             |
| **Proxy/rate limiting**           | Configurable delays between requests                                  | Risk of getting blocked                                        |
| **Data preview during execution** | Live table of extracted data while running                            | Have to wait until completion                                  |
| **Blueprint templates**           | Pre-built blueprints for common sites                                 | Faster onboarding                                              |

### Low Priority

| Feature                 | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| **Execution resume**    | Resume a failed/stopped execution from the last checkpoint   |
| **Scheduled execution** | Run blueprints on a timer                                    |
| **Webhook/API export**  | Send extracted data to an endpoint                           |
| **Multi-tab execution** | Run different blueprints across multiple tabs simultaneously |
| **Visual flow editor**  | Drag-and-drop block arrangement                              |

---

## 4. Code Quality Issues

### Type Safety

| Issue                                                          | Files                                   | Description                                                              |
| -------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| Excessive `as any` casts                                       | `blueprint-executor-store.ts`           | Every `block.config` is cast to `any` — loses all type safety            |
| `Block` union is union of classes but executor uses it loosely | `types.ts`, executor                    | Should use discriminated union pattern with `block.type` as discriminant |
| `Selector` model vs `SelectorType` from core                   | `models/selector.ts` vs `core/types.ts` | Two different selector systems — one with objects, one with string pairs |

**Fix for config typing:**
```typescript
// Instead of: const config = block.config as any;
// Use type guards:
function isClickBlock(block: Block): block is ClickBlock {
    return block.type === 'click';
}

// In executor:
if (block.type === 'click') {
    const config = (block as ClickBlock).config; // Fully typed
}
```

### Error Messages

| Issue                                                | Impact                           |
| ---------------------------------------------------- | -------------------------------- |
| Generic error messages like "Click failed"           | Can't diagnose what went wrong   |
| No selector value in error messages from env-handler | Don't know which selector failed |
| Stack traces lost in message serialization           | Error origin is hidden           |

**Fix:** Include selector, scope context, and DOM state in error messages:
```typescript
throw new Error(
    `Click failed: selector="${sel.value}" (${sel.type}), ` +
    `scope=${scope ? scope.selector + '[' + scope.index + ']' : 'none'}, ` +
    `error: ${response.error}`
);
```

### Performance

| Issue                                            | Impact                                                 | Fix                     |
| ------------------------------------------------ | ------------------------------------------------------ | ----------------------- |
| No DOM query caching                             | Repeated selectors re-query DOM                        | Use `ElementCache`      |
| `getComputedStyle()` called twice for visibility | Expensive layout recalc                                | Call once, reuse result |
| `scrollIntoView` before every click              | Unnecessary layout thrash for already-visible elements | Check visibility first  |

---

## 5. Enhancement Roadmap

### Phase 1: Stability (Fix Critical Bugs)
- [ ] Add `ENV_IS_VISIBLE` to `MessageType` union
- [ ] Add `ENV_GET_ATTRIBUTE` handler to env-handler
- [ ] Implement `text_regex` condition check
- [ ] Implement `element_into_view` scroll behavior
- [ ] Fix visibility check for fixed/sticky elements
- [ ] Fix `openInNewTab` tab tracking

### Phase 2: Data Persistence
- [ ] Add `Blueprint.toJSON()` / `Blueprint.fromJSON()` serialization
- [ ] Wire `BlueprintBuilderStore` to `db.savePlan()` / `db.getPlan()`
- [ ] Save execution history to database after each run
- [ ] Add UI for browsing execution history

### Phase 3: Remove Legacy Code
- [ ] Delete `core/executor.ts` (PlanExecutor)
- [ ] Delete `core/remote-env.ts` (RemoteExecutionEnvironment)
- [ ] Delete `core/hooks.ts` (useScraperBuilder)
- [ ] Delete `entrypoints/pages/Builder.tsx` (legacy builder page)
- [ ] Consolidate type systems (`core/types.ts` Block vs `models/types.ts` Block)

### Phase 4: Robustness
- [ ] Wire `NetworkMonitor` for real network-idle detection
- [ ] Wire `ElementCache` for DOM query performance
- [ ] Implement selector fallback chain
- [ ] Add `ENV_WAIT_NETWORK_IDLE` content script handler
- [ ] Add tab lifecycle monitoring (detect close, crash, navigate-away)
- [ ] Implement graceful content script reconnection

### Phase 5: Developer Experience
- [ ] Replace `as any` config casts with proper type guards
- [ ] Add rich error messages with context
- [ ] Add blueprint validation before execution
- [ ] Add duplicate row detection
- [ ] Add variable interpolation system

### Phase 6: Advanced Features
- [ ] Blueprint import/export (JSON)
- [ ] Blueprint templates library
- [ ] Live data preview during execution
- [ ] Frame/iframe support
- [ ] Execution resume from checkpoint
