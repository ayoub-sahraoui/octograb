# OctoGrab - Implementation Status & Roadmap

## ✅ Completed

### 1. Architecture Refactoring
- ✅ Moved `SelectorEngine` to content script (runs on web page, not sidebar)
- ✅ Created messaging system for sidepanel ↔ content script communication
- ✅ Updated WXT config with required permissions (`activeTab`, `scripting`)
- ✅ Implemented message-based element picking

### 2. Core Files Created/Updated
- ✅ `entrypoints/content.ts` - Content script with SelectorEngine integration
- ✅ `core/messaging.ts` - Messaging utilities for extension communication
- ✅ `core/hooks.ts` - Updated to use messaging instead of local SelectorEngine
- ✅ `wxt.config.ts` - Added necessary permissions

## 🚧 In Progress / TODO

### 3. Plan Execution Engine
**Status:** Not implemented (currently just UI simulation)

**What needs to be done:**
```typescript
// In content script, add execution handler:
case 'EXECUTE_PLAN':
  const executor = new PlanExecutor(message.plan);
  executor.on('log', (log) => {
    browser.runtime.sendMessage({ type: 'EXECUTION_LOG', data: log });
  });
  executor.on('result', (result) => {
    browser.runtime.sendMessage({ type: 'EXECUTION_RESULT', data: result });
  });
  await executor.run();
  browser.runtime.sendMessage({ type: 'EXECUTION_COMPLETE' });
  break;
```

**Files to create:**
- `core/executor/plan-executor.ts` - Main execution engine
- `core/executor/action-handlers.ts` - Handlers for each action type (navigate, click, extract, etc.)
- `core/executor/data-extractor.ts` - Data extraction logic

### 4. Data Persistence
**Status:** Using mock data in memory

**What needs to be done:**
- Implement `browser.storage.local` for saving plans
- Implement `browser.storage.local` for job history
- Add export/import functionality (JSON, CSV)

**Files to update:**
- `core/hooks.ts` - Replace MOCK_SAVED_PLANS with storage API
- Create `core/storage.ts` - Storage utilities

### 5. Background Service Worker
**Status:** Basic file exists, not functional

**What needs to be done:**
```typescript
// entrypoints/background.ts
- Job queue management
- Plan execution orchestration
- Data export/download handling
```

### 6. Advanced Features (Future)

#### 6.1 AI Plan Generation
- Currently just UI mockup
- Needs integration with AI API (OpenAI, Anthropic, etc.)
- Schema detection from uploaded files

#### 6.2 Pagination Handling
- Auto-detect "next" buttons
- Handle infinite scroll
- Max page limits

#### 6.3 Authentication Support
- Cookie management
- Login flows
- Session persistence

#### 6.4 Rate Limiting & Delays
- Configurable delays between actions
- Respect robots.txt
- Anti-detection measures

## 📋 Implementation Priority

### Phase 1: Core Functionality (Week 1)
1. ✅ Element selector working on web page
2. ✅ Message-based communication
3. 🚧 Basic plan execution (navigate, click, extract)
4. 🚧 Data persistence (save/load plans)

### Phase 2: Advanced Execution (Week 2)
5. 🚧 Loop handling (elements, pagination)
6. 🚧 Data export (JSON, CSV)
7. 🚧 Error handling & recovery
8. 🚧 Execution logs & debugging

### Phase 3: Polish & Features (Week 3)
9. 🚧 AI plan generation
10. 🚧 Template library
11. 🚧 Performance optimization
12. 🚧 User documentation

## 🐛 Known Issues

1. **Content Script Injection delay**
   - When extension reloads, existing tabs don't have the new content script
   - **Fix Implemented:** Error message now prompts user to refresh the page
   - **Future:** could auto-inject using scripting API

2. **Scope Element Passing**
   - TODO: Implement passing scope element reference to content script
   - Currently always uses full page

3. **Type Safety**
   - Some `any` types in messaging
   - Need to strengthen type definitions

## 🔧 Testing Checklist

### Manual Testing
- [ ] Load extension in Chrome
- [ ] Open sidepanel
- [ ] Navigate to a test website (e.g., books.toscrape.com)
- [ ] Click "Pick from page" button
- [ ] Verify overlay appears on web page (not sidebar)
- [ ] Select an element
- [ ] Verify selector appears in sidebar
- [ ] Create a simple plan
- [ ] Save the plan
- [ ] Run the plan (dry run)

### Automated Testing (Future)
- [ ] Unit tests for selector engine
- [ ] Integration tests for messaging
- [ ] E2E tests for plan execution

## 📚 Documentation Needed

1. **User Guide**
   - How to create a scraping plan
   - Understanding selectors
   - Handling pagination
   - Exporting data

2. **Developer Guide**
   - Architecture overview
   - Adding new action types
   - Extending the executor
   - Contributing guidelines

## 🎯 Next Steps

**Immediate (Today):**
1. Test the element selector on a real website
2. Verify messaging works between sidepanel and content script
3. Fix any runtime errors

**Short-term (This Week):**
1. Implement basic plan executor
2. Add storage persistence
3. Implement data export

**Long-term (This Month):**
1. Complete all action types
2. Add AI generation
3. Create template library
4. Write documentation

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Page                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Content Script (content.ts)                       │     │
│  │  - SelectorEngine (visual overlay)                 │     │
│  │  - PlanExecutor (runs scraping actions)            │     │
│  │  - Message listener                                │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕ (browser.runtime.sendMessage)
┌─────────────────────────────────────────────────────────────┐
│                    Background Service Worker                 │
│  - Job queue management                                      │
│  - Message routing                                           │
│  - Data storage coordination                                 │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Sidepanel (UI)                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │  React App                                         │     │
│  │  - Plan Builder                                    │     │
│  │  - Plans Library                                   │     │
│  │  - Jobs Queue                                      │     │
│  │  - AI Wizard                                       │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Message Flow

```
User clicks "Pick Element"
    ↓
Sidepanel sends START_PICKING message
    ↓
Content Script activates SelectorEngine
    ↓
User selects element on page
    ↓
Content Script sends ELEMENT_SELECTED message
    ↓
Sidepanel receives selector & updates UI
```
