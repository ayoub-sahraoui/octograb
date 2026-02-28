# Logging Guide - Blueprint Execution System

## Overview

Comprehensive logging has been added to all execution steps to make debugging easier and track what's happening during blueprint execution.

## Log Locations

### 1. **Extension Logs** (blueprint-executor-store.ts)
- **Where**: Browser DevTools Console (Extension context)
- **Access**: Right-click extension icon → Inspect → Console tab
- **Format**: Structured logs with emojis for easy scanning

### 2. **Content Script Logs** (env-handler.ts)
- **Where**: Browser DevTools Console (Page context)
- **Access**: F12 → Console tab (on the page being scraped)
- **Format**: `[ENV_*]` prefixed logs for DOM operations

---

## Executor Logs (Extension Context)

### Block Execution Lifecycle

```
▶ Executing: Block Name [Scope: .selector[0]]
  📋 Config: {"selector":{"value":".item","type":"css"}}
  ⏱ Delay before: 1000ms
  [Block-specific logs...]
  👶 Processing 2 children...
  ⏱ Delay after: 500ms
  ⏱ Execution time: 1234ms
```

### Navigate Block
```
🌐 Navigating to: https://example.com
  📍 Behavior: same_tab
  ⏱ Timeout: 30000ms
  🎯 Current tab ID: 123
  🔄 Navigating in current tab 123...
  ⏳ Waiting for content script to be ready...
✓ Navigated to: https://example.com
```

### Click Block
```
🖱 Normal click
  🎯 Selector: .button
  📌 Selector type: css
  🔍 Has scope: Yes
✓ Clicked: .button
```

**Click with New Tab:**
```
🆕 Click will open new tab
  🎯 Selector: .link
  📌 Selector type: css
  🔍 Has scope: No
  🖱 Sending click command...
✓ Clicked: .link
  ⏳ Waiting for new tab (max 5s)...
  ✨ New tab created: 456
  ↳ Switched to new tab (id: 456)
  ⏳ Waiting for content script in new tab...
  👶 Executing 3 children in new tab...
  🗑 Closing new tab 456...
  ↳ Closed tab 456
  🔙 Switched back to tab 123
```

### Input Block
```
⌨️ Input value: "test@example.com"
  🎯 Selector: #email
  📌 Selector type: css
  🔍 Has scope: No
✓ Input "test@example.com" into: #email
```

### Wait Block
```
⏱ Wait type: selector_visible
  🎯 Selector: .loading
  📌 Selector type: css
  👁 Target state: hidden
  ⏱ Timeout: 10000ms
  ⏳ Waiting for .loading to be hidden...
  🔍 Check #1: Element is visible
  🔍 Check #2: Element is visible
  🔍 Check #3: Element is hidden
  ✓ Element hidden: .loading (after 750ms)
```

### Scroll Block
```
📜 Scroll target: window
  📍 Behavior: bottom
  ✓ Scrolled bottom
  ⏱ Waiting 500ms for scroll to settle...
```

### Condition Block
```
🔀 Condition check: exists
  🎯 Selector: .error-message
  📌 Selector type: css
  💬 Compare value: ""
  🔄 Negate: No
  🔢 Element count: 0
  ✅ Condition result: FALSE
  🔀 Condition "exists" on .error-message: FALSE
  ➡️ Executing ELSE branch (2 blocks)
```

### Loop Elements
```
🔁 Loop Elements
  🎯 Selector: .product-card
  📌 Selector type: css
  🔍 Has parent scope: No
  🔢 Found 10 elements
  🔄 Max iterations: unlimited
  ▶️ Will iterate: 10 times
  👶 Children per iteration: 3
  ━━━ Iteration 1/10 ━━━
    🔍 Checking if element at index 0 exists...
    ✓ Element exists (10 total elements)
  ━━━ Iteration 2/10 ━━━
    🔍 Checking if element at index 1 exists...
    ✓ Element exists (10 total elements)
  ...
✓ Loop completed: 10 iterations
```

### Loop Pagination
```
📄 Loop Pagination
  🎯 Next button selector: .next-page
  📌 Selector type: css
  🔢 Max pages: 5
  ⏱ Delay between pages: 2000ms
  ⚠ On no next button: stop
  👶 Children per page: 2
  ━━━ Page 1/5 ━━━
    👶 Executing 2 children on this page...
    🔍 Looking for next button...
    ✓ Next button found
    🖱 Clicking next button: .next-page
    ⏱ Waiting 2000ms for page transition...
    ⏳ Waiting for page to load...
  ━━━ Page 2/5 ━━━
    ...
✓ Pagination loop completed
```

### Extract Scope
```
📦 Extract Scope
  📊 Fields to extract: 3
  🎯 Scope selector: .product
  🔄 Reset scope: No
  🔍 Has parent scope: Yes
    1. title: selector=".title" attr="text"
    2. price: selector=".price" attr="text"
    3. url: selector="a" attr="href"
  🎯 Building nested scope: .product
  📤 Sending extraction request...
  📝 Extracted values:
    title: "Product Name"
    price: "$19.99"
    url: "https://example.com/product/123"
  ✓ Extracted row #1
  📊 Total rows collected: 1
```

### Error Handling
```
❌ Error on attempt 1: Element not found: .missing-selector
  📍 Error stack: Error: Element not found: .missing-selector
  ↻ Retry 1/3: Click Button
  ⏱ Waiting 1000ms before retry...
  ❌ Error on attempt 2: Element not found: .missing-selector
  📍 Error stack: Error: Element not found: .missing-selector
  ↻ Retry 2/3: Click Button
  ⏱ Waiting 1000ms before retry...
  ❌ Error on attempt 3: Element not found: .missing-selector
  📍 Error stack: Error: Element not found: .missing-selector
  💥 All 3 attempts failed. Stopping execution.
```

---

## Content Script Logs (Page Context)

### Click Operations
```
[ENV_CLICK] Starting click operation {selector: ".button", selectorType: "css", hasScope: false, openInNewTab: false}
[ENV_CLICK] Scope resolved: HTML 
[ENV_CLICK] Finding element with selector: .button
[ENV_CLICK] Element found: BUTTON btn-primary
[ENV_CLICK] Scrolling element into view
[ENV_CLICK] Normal click
[ENV_CLICK] Click completed successfully
```

### Input Operations
```
[ENV_INPUT] Starting input operation {selector: "#email", selectorType: "css", value: "test@example.com", hasScope: false}
[ENV_INPUT] Finding element with selector: #email
[ENV_INPUT] Element found: INPUT form-control
[ENV_INPUT] Input/Textarea element, setting value: test@example.com
[ENV_INPUT] Input completed successfully
```

### Element Counting
```
[ENV_COUNT] Counting elements {selector: ".item", selectorType: "css", hasScope: true}
[ENV_COUNT] Found 15 elements
```

### Scroll Operations
```
[ENV_SCROLL] Starting scroll {target: "window", behavior: "bottom", amount: undefined, selector: undefined}
[ENV_SCROLL] Scrolling window
[ENV_SCROLL] Scrolling to bottom
[ENV_SCROLL] Scroll completed
```

### Extraction
```
[ENV_EXTRACT_RECORD] Starting extraction {fieldCount: 3, hasScope: true}
[ENV_EXTRACT_RECORD] Extracting field "title" {selector: ".title", attribute: "text"}
[ENV_EXTRACT_RECORD] Extracted "title": Product Name
[ENV_EXTRACT_RECORD] Extracting field "price" {selector: ".price", attribute: "text"}
[ENV_EXTRACT_RECORD] Extracted "price": $19.99
[ENV_EXTRACT_RECORD] Extracting field "url" {selector: "a", attribute: "href"}
[ENV_EXTRACT_RECORD] Extracted "url": https://example.com/product/123
[ENV_EXTRACT_RECORD] Extraction complete: 3 fields
```

### Visibility Checks
```
[ENV_IS_VISIBLE] Checking visibility {selector: ".modal", hasScope: false}
[ENV_IS_VISIBLE] Element found: DIV modal
[ENV_IS_VISIBLE] Visibility result: true
```

---

## Log Emoji Legend

| Emoji | Meaning |
|-------|---------|
| ▶️ | Starting execution |
| ✓ | Success |
| ❌ | Error |
| ⚠️ | Warning |
| 🌐 | Navigation |
| 🖱 | Click action |
| ⌨️ | Input action |
| 📦 | Extraction |
| 🔁 | Loop |
| 📄 | Pagination |
| 🔀 | Condition |
| 📜 | Scroll |
| ⏱ | Timing/delay |
| ⏳ | Waiting |
| 🎯 | Selector |
| 📌 | Selector type |
| 🔍 | Searching/checking |
| 👶 | Children processing |
| 🔢 | Count |
| 📊 | Data/statistics |
| 📝 | Text content |
| 💬 | Value/comparison |
| 🔄 | Repeat/retry |
| 💥 | Fatal error |
| 🆕 | New tab |
| 🔙 | Return/back |
| 🗑 | Cleanup/delete |

---

## Debugging Tips

### 1. **Finding Element Selection Issues**
Look for:
```
[ENV_CLICK] Element not found: .selector
```
or
```
🔍 Check #1: Element is visible
🔍 Check #2: Element is visible
❌ Timeout after 40 checks (10000ms)
```

### 2. **Tracking Loop Progress**
Monitor iteration counts:
```
━━━ Iteration 5/10 ━━━
  ✓ Element exists (10 total elements)
```

### 3. **Scope Issues**
Check scope resolution:
```
[ENV_CLICK] Scope resolved: DIV product-card
🔍 Has scope: Yes
```

### 4. **Timing Problems**
Watch for delays and waits:
```
⏱ Delay before: 1000ms
⏳ Waiting for content script to be ready...
⏱ Execution time: 5432ms
```

### 5. **Extraction Verification**
Verify extracted data:
```
📝 Extracted values:
  title: "Product Name"
  price: "$19.99"
📊 Total rows collected: 15
```

---

## Performance Monitoring

Track execution times:
```
⏱ Execution time: 1234ms  // Per block
✓ Blueprint completed. 50 rows extracted in 45.2s  // Total
```

---

## Filtering Logs

### Chrome DevTools Filters

**Show only errors:**
```
❌
```

**Show only specific block type:**
```
[ENV_CLICK]
```
or
```
🔁 Loop
```

**Show extraction only:**
```
📦 Extract
```

**Hide timing logs:**
```
-⏱
```

---

## Common Issues and Their Logs

### Issue: Element not found
```
[ENV_CLICK] Element not found: .missing-button
❌ Error on attempt 1: Element not found: .missing-button
```
**Solution**: Check selector, verify element exists on page

### Issue: Infinite loop
```
━━━ Iteration 100/100 ━━━
⚠ Element at index 100 not found after waiting. Loop stopped.
```
**Solution**: Set `maxIterations` or fix selector

### Issue: Slow execution
```
⏱ Execution time: 15234ms
```
**Solution**: Reduce delays, optimize selectors, check network waits

### Issue: Wrong data extracted
```
📝 Extracted values:
  title: ""
  price: ""
```
**Solution**: Check selectors and scope configuration

---

## Best Practices

1. **Always check both consoles**: Extension console for execution flow, page console for DOM operations
2. **Use emoji filters**: Quick visual scanning of log types
3. **Monitor timing**: Identify slow operations
4. **Track scope changes**: Verify nested scopes resolve correctly
5. **Verify extraction**: Check extracted values match expectations
6. **Watch retry attempts**: Indicates flaky selectors or timing issues

---

## Log Levels

All logs use standard console methods:
- `console.log()` - Info/debug
- `console.warn()` - Warnings
- `console.error()` - Errors

Configure Chrome DevTools log levels to filter as needed.
