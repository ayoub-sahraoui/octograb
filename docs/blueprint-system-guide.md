# OctoGrab Blueprint System — Deep Guide

> **Version:** 1.0 · **Last Updated:** 2026-02-12

This guide covers everything about blueprints — how they work internally, how to build them correctly, and the rules the execution engine follows.

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Architecture](#2-architecture)
3. [Block Types Reference](#3-block-types-reference)
4. [Scope & Context System](#4-scope--context-system)
5. [Selector System](#5-selector-system)
6. [Execution Engine Rules](#6-execution-engine-rules)
7. [Blueprint Patterns & Recipes](#7-blueprint-patterns--recipes)
8. [Transformers](#8-transformers)
9. [Error Handling](#9-error-handling)
10. [Best Practices](#10-best-practices)
11. [Anti-Patterns & Pitfalls](#11-anti-patterns--pitfalls)

---

## 1. Core Concepts

### What is a Blueprint?
A **Blueprint** is a structured, reusable automation plan. It defines a sequence of actions (blocks) that OctoGrab executes against a web page — navigating, clicking, typing, looping, and extracting data.

### Blocks
Blocks are the atomic units of a blueprint. Each block represents one action:

```
Blueprint "Scrape Products"
├── Navigate → "https://shop.example.com"
├── LoopElements ← ".product-card"
│   └── ExtractScope
│       ├── Field: title ← "h2.name" → text
│       ├── Field: price ← ".price" → text
│       └── Field: image ← "img" → src
└── LoopPagination ← ".next-page-btn"
    └── (repeats above extraction per page)
```

### Two Levels of Blocks

| Level                   | Stored in                | Execution               | Scope                    |
| ----------------------- | ------------------------ | ----------------------- | ------------------------ |
| **Top-level** (Level 1) | `blueprint.blocks[]`     | Sequential, independent | No scope (full document) |
| **Children** (Level 2+) | `parentBlock.children[]` | Nested inside parent    | Inherits parent's scope  |

> **Rule:** Top-level blocks always run with **no scope** (they see the full document). Children inherit their parent's **scoped context** (e.g., "the 3rd product card").

### Parent–Child Relationship
Every block has:
- `parent?: Block` — reference to its container block (null for top-level)
- `children?: Block[]` — nested blocks that execute within this block's context

This forms a **tree**, not a flat list. The tree depth determines how scope chains are built.

---

## 2. Architecture

### Execution Flow

```
┌──────────────────────────────────────────────────────┐
│                    SIDE PANEL                         │
│                                                      │
│  Blueprint Builder Store  ──►  Blueprint Executor     │
│  (build & edit blocks)         (run blocks)           │
│                                     │                 │
│                          sendToTab(tabId, message)    │
│                                     │                 │
└─────────────────────────────────────┼────────────────┘
                                      │
                    ┌─────────────────┼────────────────┐
                    │          BROWSER TAB              │
                    │                 │                 │
                    │           content.ts              │
                    │           ┌─────┴──────┐         │
                    │     Picking     env-handler.ts    │
                    │     Handler     (DOM actions)     │
                    │                      │            │
                    │               resolveScope()      │
                    │               querySelector()     │
                    │               evaluate() (XPath)  │
                    └──────────────────────────────────┘
```

### Key Principles
1. **The executor runs in the side panel** — it orchestrates by sending messages to the content script.
2. **The content script runs inside the web page** — it accesses the DOM directly.
3. **Tab locking** — at execution start, the executor locks to the active tab's ID and sends ALL messages to that specific tab (not "whatever is active").
4. **Scope resolution** — when the executor sends a message with a scope, the content script's `resolveScope()` walks the scope chain to find the exact DOM element.

---

## 3. Block Types Reference

### Navigate
Opens a URL in the browser.

| Config Property | Type   | Required | Description                                          |
| --------------- | ------ | -------- | ---------------------------------------------------- |
| `url`           | string | ✅        | The URL to navigate to                               |
| `waitUntil`     | enum   |          | `load`, `domcontentloaded`, `networkidle`, `timeout` |
| `behavior`      | enum   |          | `same_tab` (default), `new_tab`, `replace`           |
| `timeout`       | number |          | Max wait time in ms (default: 30000)                 |

**Children:** ✅ Supported — children execute after the page loads.

**Behavior details:**
- `same_tab`: Updates the current target tab's URL
- `new_tab`: Creates a new tab and **switches the executor to target it**
- After navigation, the executor waits for the content script to be ready

---

### Click
Clicks a DOM element.

| Config Property | Type     | Required | Description               |
| --------------- | -------- | -------- | ------------------------- |
| `selector`      | Selector | ✅        | Element to click          |
| `delayBefore`   | number   |          | Wait before clicking (ms) |
| `delayAfter`    | number   |          | Wait after clicking (ms)  |

**Children:** ✅ Supported — children execute after the click, within the parent's scope.

**Scope behavior:** The click targets the element matching the selector *within the current scope*. If inside a `LoopElements`, it clicks relative to the current iteration's element.

---

### Input
Types text into an input field.

| Config Property | Type     | Required | Description                |
| --------------- | -------- | -------- | -------------------------- |
| `selector`      | Selector | ✅        | Input element to type into |
| `value`         | string   | ✅        | Text to enter              |
| `delayBefore`   | number   |          | Wait before typing (ms)    |
| `delayAfter`    | number   |          | Wait after typing (ms)     |

**Children:** ✅ Supported (but uncommon — input is usually a leaf block).

**Behavior:** Sets the input value, then dispatches `input` and `change` events so frameworks (React, Vue) detect the change.

---

### Wait
Pauses execution.

| Config Property | Type     | Required | Description                                                                            |
| --------------- | -------- | -------- | -------------------------------------------------------------------------------------- |
| `type`          | enum     | ✅        | `timeout`, `selector_visible`, `selector_hidden`, `network_idle`, `dom_content_loaded` |
| `timeout`       | number   |          | Duration in ms (for timeout type)                                                      |
| `selector`      | Selector |          | Element to watch (for visibility types)                                                |
| `idleTime`      | number   |          | Idle duration threshold (for network_idle)                                             |

**Children:** ✅ Supported (but uncommon).

**Wait types:**
- `timeout`: Simple delay
- `selector_visible`: Polls until the element is visible (useful after AJAX loads)
- `selector_hidden`: Polls until the element is hidden (useful for loading spinners)

---

### Scroll
Scrolls the page or an element.

| Config Property | Type     | Required | Description                                        |
| --------------- | -------- | -------- | -------------------------------------------------- |
| `target`        | enum     | ✅        | `window` or `element`                              |
| `behavior`      | enum     | ✅        | `bottom`, `top`, `pixels`, `element_into_view`     |
| `pixels`        | number   |          | Number of pixels to scroll (for `pixels` behavior) |
| `selector`      | Selector |          | The scrollable element (for `element` target)      |
| `smooth`        | boolean  |          | Use smooth scrolling animation                     |
| `delayAfter`    | number   |          | Wait after scrolling (ms)                          |

**Children:** ✅ Supported (executes after scroll completes).

---

### GoBack
Navigates the browser back.

| Config Property | Type | Required | Description                          |
| --------------- | ---- | -------- | ------------------------------------ |
| *(none)*        |      |          | Simply calls `browser.tabs.goBack()` |

**Children:** ✅ Supported (children execute after the page finishes going back and the content script is ready).

---

### Condition
Conditional branching — if/else logic.

| Config Property | Type     | Required | Description                                                                                                                     |
| --------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `selector`      | Selector | ✅        | Element to evaluate                                                                                                             |
| `check`         | enum     | ✅        | `exists`, `not_exists`, `visible`, `hidden`, `text_contains`, `text_equals`, `text_regex`, `count_equals`, `count_greater_than` |
| `value`         | string   |          | Comparison value (for text/count checks)                                                                                        |
| `negate`        | boolean  |          | Invert the condition result                                                                                                     |

**Children:** ✅ Required — `children[]` = THEN branch, `elseChildren[]` = ELSE branch.

**Example:**
```
Condition ← ".out-of-stock" check:exists
  ├── children (THEN): [Skip this product]
  └── elseChildren (ELSE): [ExtractScope → extract data]
```

---

### Loop Elements ⭐
Iterates over multiple matching DOM elements.

| Config Property | Type     | Required | Description                                   |
| --------------- | -------- | -------- | --------------------------------------------- |
| `selector`      | Selector | ✅        | CSS/XPath selector matching multiple elements |
| `maxIterations` | number   |          | Limit iterations (default: all matches)       |
| `indexVariable` | string   |          | Variable name for current index               |

**Children:** ✅ Required — children execute **once per matched element**, each time with a scoped context pointing to that specific element.

**This is the most important block for scraping.** It creates a **scope chain**:
```
Scope = {
  selector: ".product-card",
  index: 3,           // 4th card (0-indexed)
  parent: undefined   // top-level scope
}
```

Children within the loop see selectors **relative to the current card**, not the full document.

---

### Loop Pagination ⭐
Iterates across pages by clicking a "next" button.

| Config Property      | Type            | Required | Description                                   |
| -------------------- | --------------- | -------- | --------------------------------------------- |
| `nextButtonSelector` | Selector        | ✅        | The "Next Page" button                        |
| `maxPages`           | number          |          | Max pages to iterate (default: 100)           |
| `delayBetweenPages`  | number          |          | Delay after clicking next (ms, default: 1000) |
| `stopWhen`           | ConditionConfig |          | Condition to stop early                       |
| `onNoNextButton`     | enum            |          | `stop` (default) or `error`                   |

**Children:** ✅ Required — children execute **once per page** before clicking next.

**Execution order per page:**
1. Execute all children (e.g., extract data on current page)
2. Check if next button exists
3. Click next button
4. Wait for page to load
5. Repeat

---

### Extract Scope ⭐
Extracts structured data from the page.

| Config Property | Type     | Required | Description                              |
| --------------- | -------- | -------- | ---------------------------------------- |
| `scopeSelector` | Selector |          | Narrows extraction to a specific element |
| `fields[]`      | Array    | ✅        | List of extraction fields                |

**Each field has:**

| Property         | Type     | Required | Description                                                                  |
| ---------------- | -------- | -------- | ---------------------------------------------------------------------------- |
| `key`            | string   | ✅        | Column name in the output                                                    |
| `selector`       | Selector |          | Element to extract from (within scope)                                       |
| `attribute`      | enum     | ✅        | `text`, `html`, `href`, `src`, `value`, `class`, `id`, or any HTML attribute |
| `transformers[]` | Array    |          | Post-processing transformers                                                 |

**Children:** ✅ Supported (children execute after extraction, within the extract scope).

**Scope behavior:**
- If `scopeSelector` is set → creates a nested scope within the parent scope
- If `scopeSelector` is not set → uses the parent scope directly
- Field selectors are relative to the resolved scope element

---

## 4. Scope & Context System

### What is Scope?
Scope is a chain of selectors + indices that pinpoints a specific DOM element. Think of it as "coordinates" for an element on the page.

```typescript
interface Scope {
    selector: string;         // ".product-card"
    selectorType: 'css' | 'xpath';
    index: number;            // Which match (0-based)
    parent?: Scope;           // Parent scope (chained)
}
```

### Scope Resolution
When the content script receives a message with a scope, it resolves it by walking the chain recursively:

```
Scope: { selector: ".price", index: 0,
  parent: { selector: ".product-card", index: 2,
    parent: undefined }}

Resolution:
1. Start at document.documentElement
2. querySelectorAll(".product-card") → take [2] (3rd card)
3. Within that card: querySelectorAll(".price") → take [0]
4. Result: the price element inside the 3rd product card
```

### Scope Rules

| Rule                                   | Description                                                  |
| -------------------------------------- | ------------------------------------------------------------ |
| **Top-level blocks have no scope**     | `blueprint.blocks[]` always execute with `scope = undefined` |
| **LoopElements creates scopes**        | Each iteration creates `{ selector, index, parent }`         |
| **ExtractScope creates nested scopes** | If `scopeSelector` is set, it wraps in a new scope           |
| **Other blocks pass scope through**    | Click, Wait, etc. pass their parent's scope to children      |
| **Scope is relative**                  | Selectors within a scope search descendants only             |

### Scope Chain Example

```
Blueprint
├── LoopElements ← ".category"          scope: { ".category", i }
│   └── LoopElements ← ".product"       scope: { ".product", j, parent: { ".category", i } }
│       └── ExtractScope                 scope: { ".product", j, parent: { ".category", i } }
│           ├── title ← "h3"            → h3 inside the j-th product of the i-th category
│           └── price ← ".cost"         → .cost inside that same product  
```

---

## 5. Selector System

### Selector Object

```typescript
interface Selector {
    type: SelectorType;    // 'css' | 'xpath' | 'text' | 'role'
    value: string;         // The actual selector string
    timeout?: number;      // Wait timeout for element
    waitForVisible?: boolean;
    fallbacks?: Selector[];
    detected?: DetectedSelectors;
    frameSelector?: string;
}
```

### CSS vs XPath

| Feature              | CSS                    | XPath                            |
| -------------------- | ---------------------- | -------------------------------- |
| **Speed**            | Faster                 | Slower                           |
| **Text matching**    | Limited                | Full (`contains(text(), 'Buy')`) |
| **Parent traversal** | Not possible           | Possible (`..`)                  |
| **Index access**     | Limited (`:nth-child`) | Full (`[position()=3]`)          |
| **Recommendation**   | ✅ Default choice       | Use when CSS can't do it         |

### Element Picker
The visual element picker generates both CSS and XPath selectors. When you pick an element:
1. It sends `START_PICKING` to the content script
2. You hover and click elements on the page
3. Both CSS and XPath are generated
4. The system stores the selected type in `selector.type`

### Scoped Picking
When picking inside a scoped context (e.g., a field inside a LoopElements):
- The picker shows a **visual scope mask** (amber border + dark overlay)
- The generated selector is **relative to the scope element**
- You can only pick elements within the scope

---

## 6. Execution Engine Rules

### Rule 1: Sequential Top-Level Execution
```
blueprint.blocks[0] → ... → blocks[1] → ... → blocks[2] → ...
```
Top-level blocks run one after another. Each one completes fully before the next starts. No scope is passed.

### Rule 2: Children Execute Within Parent Context
When a block has children, those children execute after the parent's action, receiving the parent's scope.

```
Navigate → "https://example.com"
  └── LoopElements ← ".item"     ← receives scope: undefined
        └── ExtractScope         ← receives scope: { ".item", i }
```

### Rule 3: Container Blocks Manage Their Own Children
These blocks handle children internally with special logic:

| Block            | How it handles children                                         |
| ---------------- | --------------------------------------------------------------- |
| `LoopElements`   | Runs children N times, each with `{ selector, index: i }` scope |
| `LoopPagination` | Runs children once per page before clicking next                |
| `Condition`      | Runs `children` if true, `elseChildren` if false                |
| `ExtractScope`   | Runs children after extraction, within extract scope            |

### Rule 4: Non-Container Blocks Auto-Process Children
Navigate, Click, Wait, Scroll, Input, GoBack — if they have children, those children automatically execute after the block's action, passing through the current scope.

### Rule 5: Tab Targeting is Locked
The executor locks to the active tab at execution start. All messages go to that specific tab, even if you switch tabs. `Navigate(new_tab)` switches the lock to the newly created tab.

### Rule 6: Error Handling Per Block
Each block can define:
- `onError: 'stop'` — Abort the entire blueprint
- `onError: 'skip'` — Skip this block and continue
- `maxRetries` / `retryDelay` — Retry on failure

---

## 7. Blueprint Patterns & Recipes

### Pattern 1: Simple Page Scrape
Extract data from a single page, no loops.

```
Navigate → "https://example.com/about"
  └── ExtractScope
        ├── company_name ← "h1" → text
        ├── description ← ".about-text" → text
        └── logo ← "img.logo" → src
```

**Result:** 1 row with 3 columns.

---

### Pattern 2: List Scrape
Extract from a list of repeating elements.

```
Navigate → "https://example.com/products"
  └── LoopElements ← ".product-card"
        └── ExtractScope
              ├── title ← "h2" → text
              ├── price ← ".price" → text
              └── link  ← "a" → href
```

**Result:** N rows (one per product card).

---

### Pattern 3: Paginated List Scrape
Extract from multiple pages.

```
Navigate → "https://example.com/products"
  └── LoopPagination ← "a.next-page"
        └── LoopElements ← ".product-card"
              └── ExtractScope
                    ├── title ← "h2" → text
                    └── price ← ".price" → text
```

**Execution flow:**
1. Navigate to page
2. On each page:
   a. Loop all `.product-card` elements and extract
   b. Click `a.next-page`
   c. Wait for new page to load
3. Repeat until no next button found

---

### Pattern 4: Detail Page Scrape (Open in New Tab)
Loop over a list, open each item's detail page in a new tab, extract data, close the tab.

```
Navigate → "https://example.com/products"
  └── LoopElements ← ".product-card"
        ├── Click ← "a.detail-link" (openInNewTab: true)
        ├── Wait ← 2000ms
        ├── ExtractScope
        │     ├── full_title ← "h1" → text
        │     ├── description ← ".description" → text
        │     └── sku ← ".sku-number" → text
        └── GoBack
```

> ⚠️ **Important:** If clicking navigates to a new page, the loop's scope becomes invalid. Use `openInNewTab: true` to keep the original page intact, or add `GoBack` after extraction.

---

### Pattern 5: Search + Extract
Type a query, submit, then extract results.

```
Navigate → "https://example.com"
  ├── Input ← "#search-box" value: "laptop"
  ├── Click ← "#search-button"
  ├── Wait ← selector_visible ".results-container"
  └── LoopElements ← ".result-item"
        └── ExtractScope
              ├── title ← "h3" → text
              └── price ← ".price" → text
```

---

### Pattern 6: Conditional Extraction
Skip items that match a condition.

```
LoopElements ← ".product-card"
  └── Condition ← ".out-of-stock" check: not_exists
        └── (THEN) ExtractScope
              ├── title ← "h2" → text
              └── price ← ".price" → text
```

Only extracts data for in-stock products.

---

### Pattern 7: Infinite Scroll
Handle lazy-loading pages.

```
Navigate → "https://example.com/feed"
  └── LoopPagination ← (dummy — use condition to stop)
        ├── Scroll ← window → bottom
        ├── Wait ← 1500ms
        └── LoopElements ← ".feed-item:not([data-scraped])"
              └── ExtractScope
                    ├── author ← ".author" → text
                    └── content ← ".text" → text
```

---

### Pattern 8: Nested Lists
Categories with sub-items.

```
LoopElements ← ".category-section"
  └── LoopElements ← ".item"
        └── ExtractScope
              ├── category ← "ancestor::.category-section h2" → text
              ├── item_name ← ".name" → text
              └── item_price ← ".price" → text
```

The inner loop's scope chains up to the outer loop's scope. The inner `.item` is searched only within the current `.category-section`.

---

## 8. Transformers

Transformers post-process extracted values before storing them.

| Transformer | Description                      | Config                        |
| ----------- | -------------------------------- | ----------------------------- |
| `trim`      | Remove whitespace from both ends | —                             |
| `uppercase` | Convert to UPPERCASE             | —                             |
| `lowercase` | Convert to lowercase             | —                             |
| `replace`   | Replace text                     | `searchValue`, `replaceValue` |
| `regex`     | Extract via regex match          | `regexPattern`, `regexFlags`  |

### Transformer Chain
Multiple transformers execute in order:

```yaml
Field: price ← ".price" → text
  Transformers:
    1. trim
    2. replace: { search: "$", replace: "" }
    3. replace: { search: ",", replace: "" }
```

Input: `"  $1,299.99  "` → Output: `"1299.99"`

### Regex Transformer
Extracts the first match:

```yaml
Field: sku ← ".product-info" → text
  Transformers:
    1. regex: { pattern: "SKU:\\s*(\\w+)", flags: "i" }
```

Input: `"Color: Red | SKU: AB12345 | In Stock"` → Output: `"SKU: AB12345"`

---

## 9. Error Handling

### Per-Block Error Strategy

```typescript
{
    onError: 'stop' | 'skip',   // Default: 'stop'
    maxRetries: 3,              // Retry count (default: 0)
    retryDelay: 1000,           // Delay between retries in ms
}
```

| Strategy | Behavior                                     |
| -------- | -------------------------------------------- |
| `stop`   | Abort the entire blueprint with an error     |
| `skip`   | Log a warning and continue to the next block |

### Retry Logic
If `maxRetries > 0`, the executor retries the block on failure:
1. First attempt fails
2. Wait `retryDelay` ms
3. Retry (up to `maxRetries` times)
4. If all retries fail, apply `onError` strategy

### Common Error Causes

| Error                              | Cause                           | Fix                                       |
| ---------------------------------- | ------------------------------- | ----------------------------------------- |
| `Element not found: .selector [0]` | Selector doesn't match anything | Check selector, add Wait before           |
| `Content script not ready`         | Page is still loading           | Increase timeout, add Wait block          |
| `No active web page found`         | No tab open                     | Open a web page first                     |
| `Click failed`                     | Element not clickable           | Add scroll-into-view, wait for visibility |

---

## 10. Best Practices

### ✅ DO

1. **Always start with Navigate**
   Every blueprint should begin with a Navigate block. This ensures the executor knows which page to work on.

2. **Use specific CSS selectors**
   Prefer `.product-card` over `div > div > div`. Use classes and IDs when available.

3. **Add Wait blocks after interactions**
   After clicking (especially if it triggers AJAX), add a Wait block:
   ```
   Click ← ".load-more"
   Wait ← selector_visible ".new-content"
   ```

4. **Use LoopElements for repeating content**
   Never try to extract a list manually. Always use LoopElements to iterate.

5. **Keep blueprints modular**
   Use children to group related blocks. A Click that opens a modal should have the modal's extraction as its child.

6. **Set `maxIterations` on loops during testing**
   While developing, limit loops to 2-3 iterations to avoid waiting for full runs.

7. **Use `onError: 'skip'` for optional fields**
   If some items might not have a field (e.g., a discount badge), set the field's parent block error strategy to skip.

8. **Test selectors with the picker first**
   Always use the visual element picker to verify your selectors work before running.

9. **Use transformers for clean data**
   Add `trim` to text fields. Use `replace` to clean up currency symbols, whitespace.

10. **Name your blocks descriptively**
    Name blocks like "Click Login Button" instead of "Click". This makes execution logs readable.

### ❌ DON'T

1. **Don't use absolute XPaths**
   `/html/body/div[2]/ul/li[3]` is fragile. Use relative selectors that target the element's attributes.

2. **Don't put LoopElements at the top level when you need scope**
   If your Loop needs data from a Navigate, make it a child:
   ```
   ❌ Navigate → "..."
      LoopElements ← "..."    (same-level — no scope from Navigate)

   ✅ Navigate → "..."
        └── LoopElements ← "..."  (child — executes in Navigate's context)
   ```

3. **Don't click links that navigate away inside loops without GoBack**
   ```
   ❌ LoopElements ← ".product"
        └── Click ← "a.details"    ← navigates away, scope dies!

   ✅ LoopElements ← ".product"
        ├── Click ← "a.details" (openInNewTab: true)
        ├── ExtractScope ← fields
        └── GoBack
   ```

4. **Don't ignore extraction field keys**
   Every field must have a unique `key`. Duplicate keys will overwrite each other.

5. **Don't skip testing on the actual target page**
   CSS selectors that work on one page may break on another. Always test on the real target.

---

## 11. Anti-Patterns & Pitfalls

### Pitfall 1: Scope Dies After Navigation
**What happens:** You're inside a `LoopElements ← ".product"` and you click a link that navigates to a detail page. The scope says "find `.product` elements and take the Nth one" — but on the detail page, there are no `.product` elements.

**Solution:** Either:
- Use `openInNewTab: true` on the Click
- Or add GoBack after extraction and accept that the scope re-resolves after going back

### Pitfall 2: Same-Level vs Children Confusion
**What happens:** You put blocks at the same level expecting them to share context, but they don't.

```
❌ Same level (independent):
Navigate → "..."
LoopElements ← "..."
ExtractScope            ← runs ONCE with no scope, NOT per iteration

✅ Children (nested):
Navigate → "..."
  └── LoopElements ← "..."
        └── ExtractScope  ← runs per iteration, scoped to each element
```

### Pitfall 3: Tab Switching During Execution
**What happens:** While a blueprint is running, you switch to a different browser tab. The executor is locked to the original tab, so it still sends commands to the right tab. But if you close the target tab, all commands fail.

**Rule:** Don't close the target tab during execution.

### Pitfall 4: Dynamic Content Not Loaded
**What happens:** You try to extract from AJAX-loaded content before it's loaded.

**Solution:** Add `Wait ← selector_visible ".content-container"` before extraction.

### Pitfall 5: Pagination Without Children
**What happens:** `LoopPagination` without children just clicks "Next" repeatedly without doing anything useful.

**Rule:** Always put extraction blocks as children of pagination loops.

### Pitfall 6: Extracting from a Stale Page
**What happens:** After navigation or GoBack, the content script reloads. Old scope references are no longer valid. The executor must wait for the new content script to be ready.

**The executor handles this automatically** via `waitForTab()`, but very fast operations right after navigation may fail. Add a small Wait block if needed.

---

## Appendix: Full Block Hierarchy Diagram

```
Blueprint
├── blocks[] ← top-level array (sequential, no scope)
│
├── NavigateBlock
│   ├── config: { url, waitUntil, behavior, timeout }
│   └── children[] ← execute after page loads (no scope)
│
├── ClickBlock
│   ├── config: { selector, delayBefore, delayAfter }
│   └── children[] ← execute after click (parent scope)
│
├── InputBlock
│   ├── config: { selector, value, delayBefore, delayAfter }
│   └── children[] ← execute after input (parent scope)
│
├── WaitBlock
│   ├── config: { type, timeout, selector, idleTime }
│   └── children[] ← execute after wait (parent scope)
│
├── ScrollBlock
│   ├── config: { target, behavior, pixels, selector, smooth }
│   └── children[] ← execute after scroll (parent scope)
│
├── GoBackBlock
│   ├── config: { }
│   └── children[] ← execute after back navigation (parent scope)
│
├── ConditionBlock
│   ├── config: { selector, check, value, negate }
│   ├── children[] ← THEN branch (parent scope)
│   └── elseChildren[] ← ELSE branch (parent scope)
│
├── LoopElementsBlock
│   ├── config: { selector, maxIterations, indexVariable }
│   └── children[] ← execute per matched element (iteration scope)
│
├── LoopPaginationBlock
│   ├── config: { nextButtonSelector, maxPages, delayBetweenPages }
│   └── children[] ← execute per page (parent scope)
│
└── ExtractScopeBlock
    ├── config: { scopeSelector, fields[] }
    └── children[] ← execute after extraction (extract scope)
```
