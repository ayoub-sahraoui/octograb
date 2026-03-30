# Blueprint Persistence Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace duplicated blueprint save/load wrapper construction with one shared persistence adapter used by builder and AI flows.

**Architecture:** Add a pure persistence module in the model layer, then wire both the builder store and AI save tool to that module. Keep the existing `SavedPlan.plan` DB wrapper unchanged while making description persistence explicit.

**Tech Stack:** TypeScript, MobX, Vitest, Dexie-backed persistence

---

### Task 1: Add shared persistence adapter

**Files:**
- Create: `entrypoints/models/blueprint-persistence.ts`
- Modify: `core/types.ts`
- Test: `tests/blueprint-persistence.test.ts`

- [ ] **Step 1: Write the failing persistence tests**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement minimal shared serialization/deserialization**
- [ ] **Step 4: Run test to verify it passes**

### Task 2: Reuse the adapter in builder and AI paths

**Files:**
- Modify: `entrypoints/stores/blueprint-builder-store.ts`
- Modify: `core/ai/tools.ts`

- [ ] **Step 1: Replace manual save wrapper construction in the builder**
- [ ] **Step 2: Replace manual load wrapper parsing in the builder**
- [ ] **Step 3: Replace manual save wrapper construction in AI tools**
- [ ] **Step 4: Keep existing save behavior unchanged apart from consolidation**

### Task 3: Verify the feature

**Files:**
- Test: `tests/blueprint-persistence.test.ts`

- [ ] **Step 1: Run targeted tests**
- [ ] **Step 2: Run full test suite**
- [ ] **Step 3: Run TypeScript compile verification**
