/**
 * Plan Executor - Orchestrates scraping plans using an Execution Environment
 * Now supports running in Sidepanel (via RemoteExecutionEnvironment) or potentially ensuring Direct execution if needed.
 */

import { Block, Plan, ExtractionField } from "./types";
import { ExecutionEnvironment, Scope } from "./env";

export interface ExecutorOptions {
  onLog?: (message: string, type: 'info' | 'success' | 'error' | 'system') => void;
  onResult?: (data: any) => void;
  onComplete?: () => void;
}

export class PlanExecutor {
  private plan: Plan;
  private options: ExecutorOptions;
  private env: ExecutionEnvironment;
  private results: any[] = [];
  private isRunning: boolean = false;

  constructor(plan: Plan, env: ExecutionEnvironment, options: ExecutorOptions = {}) {
    this.plan = plan;
    this.env = env;
    this.options = options;
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'system' = 'info') {
    try {
      if (this.options.onLog) {
        this.options.onLog(message, type);
      }
    } catch (e) { console.error('Logging callback failed', e); }
    // console.log(`[Executor] ${message}`);
  }

  private emitResult(data: any) {
    this.results.push(data);
    try {
      if (this.options.onResult) {
        this.options.onResult(data);
      }
    } catch (e) { console.error('Result callback failed', e); }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run(): Promise<any[]> {
    if (this.isRunning) {
      throw new Error('Executor is already running');
    }

    this.isRunning = true;
    this.results = [];

    try {
      this.log('Starting plan execution...', 'system');
      this.log(`Plan: ${this.plan.meta?.name || 'Untitled'} (v${this.plan.meta?.version || '1.0'})`);

      for (const block of this.plan.pipeline) {
        await this.executeBlock(block, { depth: 0, iteration: null });
      }

      this.log('Plan execution completed successfully', 'success');
      return this.results;
    } catch (error: any) {
      this.log(`Execution failed: ${error.message}`, 'error');
      return this.results;
    } finally {
      this.isRunning = false;
      if (this.options.onComplete) {
        this.options.onComplete();
      }
    }
  }

  stop() {
    this.isRunning = false;
    this.log('Execution stopped by user', 'system');
  }

  private async executeBlock(block: Block, ctx: { depth: number; iteration: number | null; scope?: Scope }): Promise<number | void> {
    if (!this.isRunning) return;

    const indent = '  '.repeat(ctx.depth);
    const scope = ctx.scope;

    switch (block.type) {
      case 'navigate':
        await this.executeNavigate(block, indent);
        break;

      case 'click':
        await this.executeClick(block, indent, scope);
        break;

      case 'input':
        await this.executeInput(block, indent, scope);
        break;

      case 'loop_elements':
        return await this.executeLoopElements(block, ctx, indent, scope);

      case 'loop_pagination':
        await this.executeLoopPagination(block, ctx, indent, scope);
        break;

      case 'extract_scope':
        await this.executeExtract(block, ctx, indent, scope);
        break;

      case 'go_back':
        await this.executeGoBack(block, indent);
        break;

      case 'scroll':
        await this.executeScroll(block, indent, scope);
        break;

      case 'wait':
        await this.executeWait(block, indent, scope);
        break;

      case 'condition':
        await this.executeCondition(block, ctx, indent, scope);
        break;

      default:
        this.log(`${indent}❓ Unknown block type: ${block.type}`, 'error');
    }
  }

  private async executeNavigate(block: Block, indent: string): Promise<void> {
    if (!block.url) return;
    this.log(`${indent}🌐 Navigating to: ${block.url}`);

    // Normalize URLs for comparison (strip trailing slashes)
    const currentUrlRaw = await this.env.getUrl();
    const currentUrl = currentUrlRaw.replace(/\/$/, '');
    const targetUrl = block.url.replace(/\/$/, '');

    if (currentUrl === targetUrl) {
      this.log(`${indent}✅ Already on target URL, skipping navigation`, 'info');
      return;
    }

    await this.env.navigate(block.url);
    this.log(`${indent}✅ Page loaded`, 'success');
  }

  private async executeGoBack(block: Block, indent: string): Promise<void> {
    this.log(`${indent}🔙 Going back...`);
    await this.env.goBack();
    // goBack() now handles all waiting internally
    this.log(`${indent}✅ Returned to previous page`, 'success');
  }

  private async executeScroll(block: Block, indent: string, scope?: Scope): Promise<void> {
    const config = block.scrollConfig || { target: 'window', behavior: 'bottom' };
    this.log(`${indent}📜 Scrolling ${config.target} to ${config.behavior}...`);

    await this.env.scroll(
      config.target,
      config.behavior,
      config.pixels,
      config.selector,
      config.selectorType,
      scope
    );

    await this.wait(1000); // Wait for scroll/lazy load
  }

  private async executeWait(block: Block, indent: string, scope?: Scope): Promise<void> {
    const config = block.waitConfig;
    if (!config) return;

    if (config.type === 'timeout') {
      const ms = config.timeout || 2000;
      this.log(`${indent}⏳ Waiting for ${ms}ms...`);
      await this.wait(ms);
    } else if (config.type === 'selector_visible') {
      if (!config.selector) return;
      this.log(`${indent}👀 Waiting for element to be visible: ${config.selector}`);
      await this.waitForSelector(config.selector, config.selectorType || 'css', scope, true);
    } else if (config.type === 'selector_hidden') {
      if (!config.selector) return;
      this.log(`${indent}🙈 Waiting for element to be hidden: ${config.selector}`);
      await this.waitForSelector(config.selector, config.selectorType || 'css', scope, false);
    }
  }

  private async executeCondition(block: Block, ctx: any, indent: string, scope?: Scope): Promise<void> {
    const config = block.conditionConfig;
    if (!config || !config.selector) {
      this.log(`${indent}⚠️ Condition block missing selector`, 'error');
      return;
    }

    this.log(`${indent}❓ Checking condition: ${config.selector} ${config.check} ${config.value || ''}`);

    let isTrue = false;
    const selectorType = config.selectorType || 'css';

    try {
      if (config.check === 'exists') {
        const count = await this.env.count(config.selector, selectorType, scope);
        isTrue = count > 0;
      } else if (config.check === 'not_exists') {
        const count = await this.env.count(config.selector, selectorType, scope);
        isTrue = count === 0;
      } else if (config.check === 'visible') {
        isTrue = await this.env.isVisible(config.selector, selectorType, scope);
      } else if (config.check === 'text_contains' || config.check === 'text_equals') {
        // We need to extract the text
        const data = await this.env.extract([{ key: 'text', selector: config.selector, attribute: 'text', selectorType }], scope);
        const text = String(data.text || '');
        if (config.check === 'text_contains') {
          isTrue = text.includes(config.value || '');
        } else {
          isTrue = text === (config.value || '');
        }
      }
    } catch (e: any) {
      this.log(`${indent}⚠️ Condition check failed: ${e.message}`, 'error');
      isTrue = false;
    }

    this.log(`${indent}  ↳ Condition result: ${isTrue ? 'TRUE' : 'FALSE'}`);

    if (isTrue) {
      if (block.children) {
        for (const child of block.children) {
          await this.executeBlock(child, { ...ctx, depth: ctx.depth + 1 });
        }
      }
    } else {
      if (block.elseChildren) {
        for (const child of block.elseChildren) {
          await this.executeBlock(child, { ...ctx, depth: ctx.depth + 1 });
        }
      }
    }
  }

  private async waitForSelector(selector: string, type: 'css' | 'xpath', scope: Scope | undefined, wantVisible: boolean): Promise<void> {
    const maxRetries = 20; // 10 seconds total (500ms * 20)
    let retries = 0;

    while (retries < maxRetries) {
      if (!this.isRunning) break;

      let isVisible = false;
      try {
        isVisible = await this.env.isVisible(selector, type, scope);
      } catch (e) {
        // If error scanning, assume false?
        isVisible = false;
      }

      if (wantVisible && isVisible) return;
      if (!wantVisible && !isVisible) return;

      await this.wait(500);
      retries++;
    }

    this.log(`⚠️ Timeout waiting for selector "${selector}" to be ${wantVisible ? 'visible' : 'hidden'}`, 'error');
  }

  private async executeClick(block: Block, indent: string, scope?: Scope): Promise<void> {
    if (!block.selector) return;
    this.log(`${indent}🖱️ Clicking element: ${block.selector}`);

    // Use stored selector type or default to css logic
    const selectorType = block.selectorType || 'css';
    const openInNewTab = block.navigationBehavior === 'new_tab';

    await this.env.click(block.selector, selectorType, scope, openInNewTab);

    // If we expect navigation or new content in same tab:
    if (!openInNewTab) {
      await this.wait(500);
      // We might want to wait for network idle or similar? 
      // Env.waitForPageLoad waits for 'complete' status.
      await this.env.waitForPageLoad();
    } else {
      this.log(`${indent}📑 New tab opened (check active tab)`, 'info');
    }
  }

  private async executeInput(block: Block, indent: string, scope?: Scope): Promise<void> {
    if (!block.selector) return;
    this.log(`${indent}⌨️ Typing "${block.value}" into ${block.selector}`);

    const selectorType = block.selectorType || 'css';
    await this.env.type(block.selector, selectorType, block.value || '', scope);
    await this.wait(300);
  }

  private async executeLoopElements(block: Block, ctx: any, indent: string, scope?: Scope): Promise<number> {
    if (!block.selector) return 0;

    const selectorType = block.selectorType || 'css';

    // Count elements first
    let count = 0;
    try {
      count = await this.env.count(block.selector, selectorType, scope);
      this.log(`${indent}🔄 Found ${count} elements matching "${block.selector}"`);
    } catch (e: any) {
      this.log(`${indent}⚠️ Failed to count elements: ${e.message}`, 'error');
      return 0;
    }

    // Limit for safety/demos? Maybe unconstrained.
    // Let's implement max items check if plan config says so (not in plan currently).

    for (let i = 0; i < count; i++) {
      if (!this.isRunning) {
        this.log(`${indent}⏹️ Execution stopped at iteration ${i + 1}`, 'system');
        break;
      }

      // Define new scope for this item
      const itemScope: Scope = {
        selector: block.selector,
        selectorType,
        index: i,
        parent: scope
      };

      // Retry logic for transient failures
      let retryCount = 0;
      const maxRetries = 2;
      let iterationSuccess = false;

      while (retryCount <= maxRetries && !iterationSuccess) {
        try {
          if (block.children) {
            for (const child of block.children) {
              await this.executeBlock(child, {
                depth: ctx.depth + 1,
                iteration: i + 1,
                scope: itemScope
              });
            }
          } else {
            this.log(`${indent}    ⚠️ No children blocks to execute in loop`);
          }
          iterationSuccess = true;
        } catch (err: any) {
          retryCount++;

          // Check if error is retryable
          const isRetryable = err.message?.includes('Content script not ready') ||
            err.message?.includes('Element not found');

          if (isRetryable && retryCount <= maxRetries) {
            this.log(`${indent}⚠️ Iteration ${i + 1} attempt ${retryCount} failed: ${err.message}. Retrying...`, 'info');
            await this.wait(1000 * retryCount); // Exponential backoff
          } else {
            this.log(`${indent}⚠️ Iteration ${i + 1} failed: ${err.message}`, 'error');
            break; // Non-retryable error or max retries reached
          }
        }
      }

      await this.wait(300);

      // Re-verify element count after navigation (DOM might have changed)
      // This is important after go_back operations
      try {
        const newCount = await this.env.count(block.selector, selectorType, scope);
        if (newCount !== count) {
          this.log(`${indent}⚠️ Element count changed: ${count} → ${newCount}. Adjusting loop.`, 'info');
          count = newCount;
          // If count decreased and we're beyond the new count, stop
          if (i >= newCount - 1) {
            this.log(`${indent}⏹️ Stopping loop: current index ${i} exceeds new count ${newCount}`, 'info');
            break;
          }
        }
      } catch (e: any) {
        this.log(`${indent}⚠️ Failed to re-validate element count: ${e.message}`, 'error');
        // Continue anyway
      }
    }
    this.log(`${indent}🏁 Loop execution finished`, 'system');
    return count;
  }

  private async executeLoopPagination(block: Block, ctx: any, indent: string, scope?: Scope): Promise<void> {
    const maxPages = block.config?.maxPages || 10;
    this.log(`${indent}📄 Starting pagination (Max: ${maxPages})`);

    let currentPage = 1;

    while (currentPage <= maxPages) {
      if (!this.isRunning) break;

      this.log(`${indent}  ▶ Page ${currentPage}`);

      let itemsFoundInPage = 0;
      let hasLoopChild = false;

      // Execute children
      if (block.children) {
        for (const child of block.children) {
          const result = await this.executeBlock(child, { depth: ctx.depth + 1, iteration: currentPage, scope });
          if (child.type === 'loop_elements' && typeof result === 'number') {
            itemsFoundInPage += result;
            hasLoopChild = true;
          }
        }
      }

      // Stop if extracting logic found 0 items
      if (hasLoopChild && itemsFoundInPage === 0) {
        this.log(`${indent}⏹️ Stopping pagination: No items found on page ${currentPage}`, 'info');
        break;
      }

      // Check for next button logic
      const nextSelector = block.config?.nextButtonSelector;
      if (!nextSelector) break;

      const nextSelectorType = block.config?.nextButtonSelectorType || 'css';
      // Note: block.config might not update if we didn't migrate it, but Types say it has it.

      try {
        const nextButtonCount = await this.env.count(nextSelector, nextSelectorType, scope);
        if (nextButtonCount === 0) {
          this.log(`${indent}⏹️ No more pages (next button not found: ${nextSelector})`);
          break;
        }

        // Click next
        this.log(`${indent}  ➡️ Clicking next page button`);
        await this.env.click(nextSelector, nextSelectorType, scope, false);

        await this.wait(1000);
        await this.env.waitForPageLoad();

        currentPage++;

      } catch (e: any) {
        this.log(`${indent}⚠️ Pagination error: ${e.message}`, 'error');
        break;
      }
    }

    if (currentPage > maxPages) {
      this.log(`${indent}⏹️ Reached max pages limit (${maxPages})`);
    }
  }

  private async executeExtract(block: Block, ctx: any, indent: string, scope?: Scope): Promise<void> {
    if (!block.fields || block.fields.length === 0) return;

    try {
      const data = await this.env.extract(block.fields, scope);
      this.emitResult(data);
      this.log(`${indent}✅ Extracted: ${JSON.stringify(data)}`, 'success');
    } catch (error: any) {
      this.log(`${indent}⚠️ Extraction failed: ${error.message}`, 'error');
    }
  }
}
