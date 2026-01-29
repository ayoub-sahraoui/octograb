/**
 * Plan Executor - Executes scraping plans in the content script
 */

import { Block, Plan } from "./types";


export interface ExecutorOptions {
  onLog?: (message: string, type: 'info' | 'success' | 'error' | 'system') => void;
  onResult?: (data: any) => void;
  onComplete?: () => void;
}

export class PlanExecutor {
  private plan: Plan;
  private options: ExecutorOptions;
  private results: any[] = [];
  private isRunning: boolean = false;

  constructor(plan: Plan, options: ExecutorOptions = {}) {
    this.plan = plan;
    this.options = options;
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'system' = 'info') {
    try {
      if (this.options.onLog) {
        this.options.onLog(message, type);
      }
    } catch (e) { console.error('Logging callback failed', e); }
    console.log(`[Executor] ${message}`);
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

  private async executeBlock(block: Block, ctx: { depth: number; iteration: number | null; scope?: Element | Document }): Promise<void> {
    const indent = '  '.repeat(ctx.depth);
    const scope = ctx.scope || document;
    
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
        await this.executeLoopElements(block, ctx, indent, scope);
        break;
        
      case 'loop_pagination':
        await this.executeLoopPagination(block, ctx, indent);
        break;
        
      case 'extract_scope':
        await this.executeExtract(block, ctx, indent, scope);
        break;
        
      default:
        this.log(`${indent}❓ Unknown block type: ${block.type}`, 'error');
    }
  }

  private async executeNavigate(block: any, indent: string): Promise<void> {
    this.log(`${indent}🌐 Navigating to: ${block.url}`);
    
    // Navigate to URL
    window.location.href = block.url;
    
    // Wait for page load
    await this.waitForPageLoad();
    this.log(`${indent}✅ Page loaded`, 'success');
  }

  private async executeClick(block: any, indent: string, scope: Element | Document): Promise<void> {
    this.log(`${indent}🖱️ Clicking element: ${block.selector}`);
    
    const element = scope.querySelector(block.selector) as HTMLElement;
    if (!element) {
      throw new Error(`Element not found: ${block.selector}`);
    }
    
    element.click();
    await this.wait(500);
    
    if (block.navigationBehavior === 'new_tab') {
      this.log(`${indent}📑 New tab opened`, 'info');
    }
  }

  private async executeInput(block: any, indent: string, scope: Element | Document): Promise<void> {
    this.log(`${indent}⌨️ Typing "${block.value}" into ${block.selector}`);
    
    const element = scope.querySelector(block.selector) as HTMLInputElement;
    if (!element) {
      throw new Error(`Input element not found: ${block.selector}`);
    }
    
    element.value = block.value || '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await this.wait(300);
  }

  private async executeLoopElements(block: any, ctx: any, indent: string, scope: Element | Document): Promise<void> {
    const elements = scope.querySelectorAll(block.selector);
    this.log(`${indent}🔄 Found ${elements.length} elements matching "${block.selector}"`);
    
    for (let i = 0; i < elements.length; i++) {
      if (!this.isRunning) {
        this.log(`${indent}⏹️ Execution stopped at iteration ${i + 1}`, 'system');
        break;
      }
      
      this.log(`${indent}  ▶ Iteration ${i + 1}/${elements.length} start`);
      
      try {
        if (block.children) {
          for (const child of block.children) {
            this.log(`${indent}    ⚡ Executing child block: ${child.type}`, 'system');
            await this.executeBlock(child, { 
              depth: ctx.depth + 1, 
              iteration: i + 1,
              scope: elements[i] 
            });
            this.log(`${indent}    ✅ Child block ${child.type} finished`, 'system');
          }
        } else {
            this.log(`${indent}    ⚠️ No children blocks to execute in loop`);
        }
      } catch (err: any) {
        this.log(`${indent}⚠️ Iteration ${i + 1} failed: ${err.message}`, 'error');
      }
      
      this.log(`${indent}  ▶ Iteration ${i + 1} complete`);
      // console.log(`[Executor] Waiting after iteration ${i + 1}`);
      await this.wait(50);
      // console.log(`[Executor] Wait complete for iteration ${i + 1}`);
    }
    this.log(`${indent}🏁 Loop execution finished`, 'system');
  }

  private async executeLoopPagination(block: any, ctx: any, indent: string): Promise<void> {
    const maxPages = block.config?.maxPages || 10;
    this.log(`${indent}📄 Starting pagination (Max: ${maxPages})`);
    
    let currentPage = 1;
    
    while (currentPage <= maxPages) {
      if (!this.isRunning) break;
      
      this.log(`${indent}  ▶ Page ${currentPage}`);
      
      // Execute children
      if (block.children) {
        for (const child of block.children) {
          await this.executeBlock(child, { depth: ctx.depth + 1, iteration: currentPage });
        }
      }
      
      // Check for next button
      const nextButton = document.querySelector(block.config?.nextButtonSelector) as HTMLElement;
      if (!nextButton || nextButton.hasAttribute('disabled')) {
        this.log(`${indent}⏹️ No more pages (next button not found or disabled)`);
        break;
      }
      
      // Click next
      this.log(`${indent}  ➡️ Clicking next page button`);
      nextButton.click();
      await this.wait(1000);
      await this.waitForPageLoad();
      
      currentPage++;
    }
    
    if (currentPage > maxPages) {
      this.log(`${indent}⏹️ Reached max pages limit (${maxPages})`);
    }
  }


  private async executeExtract(block: any, ctx: any, indent: string, scope: Element | Document): Promise<void> {
    this.log(`${indent}📥 Extracting data... (Scope: ${scope.nodeName})`);
    
    const data: any = {};
    
    for (const field of block.fields || []) {
      try {
        const element = scope.querySelector(field.selector);
        if (!element) {
          this.log(`${indent}⚠️ Field "${field.key}": element not found (${field.selector})`, 'error');
          data[field.key] = null;
          continue;
        }
        
        let value: string | null = null;
        
        switch (field.attribute) {
            // ... (rest same)
          case 'text':
            value = element.textContent?.trim() || null;
            break;
          case 'html':
            value = element.innerHTML;
            break;
          default:
            value = element.getAttribute(field.attribute) || null;
        }
        
        data[field.key] = value;
      } catch (error: any) {
        this.log(`${indent}⚠️ Field "${field.key}": ${error.message}`, 'error');
        data[field.key] = null;
      }
    }
    
    this.emitResult(data);
    this.log(`${indent}✅ Extracted: ${JSON.stringify(data)}`, 'success');
  }

  private waitForPageLoad(): Promise<void> {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve(), { once: true });
      }
    });
  }

  stop() {
    this.isRunning = false;
    this.log('Execution stopped by user', 'system');
  }
}
