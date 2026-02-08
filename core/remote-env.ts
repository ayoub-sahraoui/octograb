import { ExecutionEnvironment, Scope } from './env';
import { ExtractionField } from './types';
import { sendToContentScript } from './messaging';

export class RemoteExecutionEnvironment implements ExecutionEnvironment {

  async navigate(url: string): Promise<void> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await browser.tabs.update(tabs[0].id, { url });
      // Wait for navigation to start
      await new Promise(r => setTimeout(r, 200));
      await this.waitForPageLoad();
    }
  }

  async waitForPageLoad(timeoutMs: number = 30000): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;

      if (!tabId) {
        resolve();
        return;
      }

      // Check if already complete
      const tab = await browser.tabs.get(tabId);
      if (tab.status === 'complete') {
        resolve();
        return;
      }

      // Timeout protection
      const timeoutId = setTimeout(() => {
        browser.tabs.onUpdated.removeListener(listener);
        console.warn('[OctoGrab] Page load timeout after', timeoutMs, 'ms');
        resolve(); // Resolve anyway to continue execution
      }, timeoutMs);

      const listener = (id: number, changeInfo: any) => {
        if (id === tabId && changeInfo.status === 'complete') {
          clearTimeout(timeoutId);
          browser.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };

      browser.tabs.onUpdated.addListener(listener);
    });
  }

  async goBack(): Promise<void> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      // Use executeScript to go back in history (more reliable than tabs.goBack)
      await browser.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => { window.history.back(); }
      });

      // Wait for navigation to start and content script to reinitialize
      await new Promise(r => setTimeout(r, 500));
      await this.waitForPageLoad();

      // Additional wait for content script re-injection
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  async click(selector: string, type: 'css' | 'xpath', scope?: Scope, openInNewTab?: boolean): Promise<void> {
    const response = await sendToContentScript({
      type: 'ENV_CLICK',
      data: { selector, selectorType: type, scope, openInNewTab }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to click element');
    }
  }

  async type(selector: string, type: 'css' | 'xpath', value: string, scope?: Scope): Promise<void> {
    const response = await sendToContentScript({
      type: 'ENV_INPUT',
      data: { selector, selectorType: type, value, scope }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to type input');
    }
  }

  async scroll(target: 'window' | 'element', behavior: 'bottom' | 'top' | 'pixels', amount?: number, selector?: string, selectorType?: 'css' | 'xpath', scope?: Scope): Promise<void> {
    const response = await sendToContentScript({
      type: 'ENV_SCROLL',
      data: { target, behavior, amount, selector, selectorType, scope }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to scroll');
    }
  }

  async count(selector: string, type: 'css' | 'xpath', scope?: Scope): Promise<number> {
    const response = await sendToContentScript({
      type: 'ENV_COUNT',
      data: { selector, selectorType: type, scope }
    });

    if (!response.success) {
      // If element not found, often we return 0 instead of throwing, 
      // but let's stick to what the content script tells us.
      // If it's a "not found" error, maybe return 0?
      // For now, assume content script handles empty list by returning 0.
      throw new Error(response.error || 'Failed to count elements');
    }

    return response.data as number;
  }

  async isVisible(selector: string, type: 'css' | 'xpath', scope?: Scope): Promise<boolean> {
    // For now, simpler implementation: check if count > 0.
    // Better implementation: ask content script if element is displayed (offsetParent !== null)
    // Let's rely on Enviroment Handler to handle 'ENV_COUNT' effectively finding elements.
    // But wait! We need to know if it's VISIBLE. Count might find hidden elements.
    // Let's add ENV_CHECK_VISIBILITY to messaging if needed, or just reuse count for now?
    // Let's try to add a specific check as user requested quality.

    // We need to add Type definition first? No, we used 'any' for data sent.
    // But we need to handle it in Content Script.
    // Let's just implement logic here sending a generic 'ENV_IS_VISIBLE' message.
    const response = await sendToContentScript({
      type: 'ENV_IS_VISIBLE',
      data: { selector, selectorType: type, scope }
    });

    if (!response.success) return false;
    return !!response.data;
  }

  async extract(fields: ExtractionField[], scope?: Scope): Promise<Record<string, any>> {
    // Send all fields to content script to extract in one go
    // Note: The content script needs to handle the logic of "for each field, find text/attr".
    // We send the fields definitions.
    const response = await sendToContentScript({
      type: 'ENV_EXTRACT_RECORD',
      data: { fields, scope }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to extract data');
    }

    return response.data;
  }

  async getUrl(): Promise<string> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.url || '';
  }
}
