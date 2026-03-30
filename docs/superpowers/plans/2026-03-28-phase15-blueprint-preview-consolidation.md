# Blueprint Preview Consolidation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route blueprint preview generation through the same shared persistence adapter used for save/load so preview contracts stop drifting.

**Architecture:** Extend the persistence adapter with a direct preview helper, then replace the AI create/validate preview path with that helper. Keep the external preview payload unchanged.

**Tech Stack:** TypeScript, Vitest, shared model-layer adapters

---

### Task 1: Add direct preview-through-persistence helper

**Files:**
- Modify: `entrypoints/models/blueprint-persistence.ts`
- Test: `tests/blueprint-persistence.test.ts`

- [ ] **Step 1: Write the failing preview-through-persistence test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement minimal helper**
- [ ] **Step 4: Run test to verify it passes**

### Task 2: Reuse the helper in AI preview flows

**Files:**
- Modify: `core/ai/tools.ts`

- [ ] **Step 1: Replace direct create preview generation**
- [ ] **Step 2: Replace direct validate preview generation**
- [ ] **Step 3: Keep returned payload shape unchanged**

### Task 3: Verify the feature

**Files:**
- Test: `tests/blueprint-persistence.test.ts`

- [ ] **Step 1: Run targeted tests**
- [ ] **Step 2: Run full test suite**
- [ ] **Step 3: Run TypeScript compile verification**
