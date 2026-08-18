import { SelectorEngine } from '../core/selector-engine';
// PlanExecutor is now running in Sidepanel, communicating via EnvHandler
import { initEnvHandler } from './content/env-handler';
import { NetworkMonitor } from '../core/network-monitor';
import { hideExecutionPageFrame, showExecutionPageFrame } from './content/execution-page-frame';

// ─── Visual Wizard Helper Functions ────────────────────────────────────

function analyzePageStructure(wrapperSelector: string, sampleSize: number) {
  const wrappers = Array.from(document.querySelectorAll(wrapperSelector)).slice(0, sampleSize);

  if (wrappers.length === 0) {
    return [];
  }

  // Collect all unique selectors from samples
  const selectorMap = new Map<string, { selector: string; type: string; samples: string[] }>();

  wrappers.forEach((wrapper) => {
    // Find all text nodes, images, and links within the wrapper
    const textElements = wrapper.querySelectorAll('*');

    textElements.forEach((el) => {
      const tagName = el.tagName.toLowerCase();
      let selector = '';
      let type = 'text';
      let value = '';

      // Skip script and style tags
      if (tagName === 'script' || tagName === 'style') return;

      // Images
      if (tagName === 'img') {
        selector = generateUniqueSelector(el, wrapper);
        type = 'image';
        value = (el as HTMLImageElement).src || (el as HTMLImageElement).getAttribute('data-src') || '';
      }
      // Links
      else if (tagName === 'a' && (el as HTMLAnchorElement).href) {
        selector = generateUniqueSelector(el, wrapper);
        type = 'link';
        value = (el as HTMLAnchorElement).href;
      }
      // Text content
      else {
        const text = el.textContent?.trim() || '';
        if (text && text.length > 0 && text.length < 500) {
          // Only meaningful text
          const children = Array.from(el.children);
          const hasOnlyTextNodes = children.every(child =>
            child.tagName.toLowerCase() === 'span' ||
            child.tagName.toLowerCase() === 'strong' ||
            child.tagName.toLowerCase() === 'em'
          );

          if (hasOnlyTextNodes || children.length === 0) {
            selector = generateUniqueSelector(el, wrapper);
            value = text;
          }
        }
      }

      if (selector && value) {
        if (!selectorMap.has(selector)) {
          selectorMap.set(selector, { selector, type, samples: [] });
        }
        selectorMap.get(selector)!.samples.push(value);
      }
    });
  });

  // Filter to selectors that appear in most samples (common fields)
  const threshold = Math.ceil(wrappers.length * 0.6); // 60% threshold
  console.log('[Content] Selector map size:', selectorMap.size, 'threshold:', threshold);

  const detectedFields = Array.from(selectorMap.values())
    .filter(field => field.samples.length >= threshold)
    .map((field, index) => ({
      suggestedName: generateFieldName(field.selector, field.type, index),
      selector: field.selector,
      type: field.type,
      sampleValue: field.samples[0] || '',
    }));

  console.log('[Content] Detected', detectedFields.length, 'fields:', detectedFields);
  return detectedFields;
}

function extractPreviewData(wrapperSelector: string, fields: any[], limit: number) {
  const wrappers = Array.from(document.querySelectorAll(wrapperSelector)).slice(0, limit);

  return wrappers.map((wrapper) => {
    const row: Record<string, any> = {};

    fields.forEach((field) => {
      const element = wrapper.querySelector(field.selector);
      if (element) {
        switch (field.type) {
          case 'text':
            row[field.name] = element.textContent?.trim() || '';
            break;
          case 'image':
            row[field.name] = (element as HTMLImageElement).src ||
              element.getAttribute('data-src') || '';
            break;
          case 'link':
            row[field.name] = (element as HTMLAnchorElement).href || '';
            break;
          case 'html':
            row[field.name] = element.innerHTML;
            break;
        }
      } else {
        row[field.name] = null;
      }
    });

    return row;
  });
}

function generateUniqueSelector(element: Element, context: Element): string {
  // Try class-based selector first
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c && !c.match(/^(active|selected|hover|focus)/));
    if (classes.length > 0) {
      const classSelector = '.' + classes.join('.');
      // Check if unique within context
      if (context.querySelectorAll(classSelector).length === 1) {
        return classSelector;
      }
      // Try with tag name
      const tagClassSelector = element.tagName.toLowerCase() + classSelector;
      if (context.querySelectorAll(tagClassSelector).length === 1) {
        return tagClassSelector;
      }
    }
  }

  // Try attribute-based selectors
  const attrs = ['data-testid', 'data-id', 'id', 'name', 'role'];
  for (const attr of attrs) {
    const value = element.getAttribute(attr);
    if (value) {
      const attrSelector = `[${attr}="${value}"]`;
      if (context.querySelectorAll(attrSelector).length === 1) {
        return attrSelector;
      }
    }
  }

  // Fall back to nth-child
  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
    const index = siblings.indexOf(element);
    if (index !== -1) {
      return `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
    }
  }

  return element.tagName.toLowerCase();
}

function generateFieldName(selector: string, type: string, index: number): string {
  // Try to extract meaningful name from selector
  const classMatch = selector.match(/\.([a-z0-9_-]+)/i);
  if (classMatch) {
    const className = classMatch[1]
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toLowerCase())
      .replace(/\s+/g, '_');

    // Clean up common prefixes
    const cleaned = className
      .replace(/^(item|product|card|post|article)_/, '')
      .replace(/_?(text|content|info|data|value)$/, '');

    if (cleaned) return cleaned;
  }

  // Fallback to type-based naming
  switch (type) {
    case 'image': return `image_${index}`;
    case 'link': return `link_${index}`;
    default: return `field_${index}`;
  }
}

// ────────────────────────────────────────────────────────────────────────

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',

  async main() {
    console.log('[OctoGrab] Content script loaded');

    try {
      const frameState = await browser.runtime.sendMessage({
        type: 'GET_EXECUTION_FRAME_STATE',
      });
      if (frameState?.success && frameState.data?.active) {
        showExecutionPageFrame();
      }
    } catch {
      /* non-critical startup restore */
    }

    // Initialize Network Monitor
    new NetworkMonitor();

    const selectorEngine = new SelectorEngine();

    // Initialize Environment Handler for RPC calls from Sidepanel
    initEnvHandler();

    // Listen for messages from sidepanel (Picking logic)
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // console.log('[OctoGrab] Received message:', message);

      switch (message.type) {
        case 'START_PICKING':
          // Done handler callback
          const doneHandler = (success: boolean) => {
            console.log('[OctoGrab] doneHandler callback triggered, success:', success);
            browser.runtime.sendMessage({
              type: 'PICKING_DONE',
              data: { success }
            }).then(() => console.log('[OctoGrab] Sent PICKING_DONE to sidepanel'))
              .catch(err => console.error('[OctoGrab] Error sending PICKING_DONE:', err));
          };

          const scopeEl = message.data?.scopeElement || message.scopeElement || null;
          const parentSel = message.data?.parentSelector || message.parentSelector || null;
          const mode = message.data?.mode || message.mode || 'single';

          const started = selectorEngine.start((selector: string, xpath: string, elementInfo?: unknown) => {
            // Send selected element info back to sidepanel
            browser.runtime.sendMessage({
              type: 'ELEMENT_SELECTED',
              data: { selector, xpath, elementInfo }
            });
          }, scopeEl, doneHandler, parentSel, mode);
          sendResponse(started
            ? { success: true }
            : { success: false, error: 'Picker session is already active' });
          break;

        case 'STOP_PICKING':
          selectorEngine.finish(false);
          sendResponse({ success: true });
          break;

        case 'SHOW_EXECUTION_FRAME':
          showExecutionPageFrame();
          sendResponse({ success: true });
          break;

        case 'HIDE_EXECUTION_FRAME':
          hideExecutionPageFrame();
          sendResponse({ success: true });
          break;

        case 'ANALYZE_PAGE_STRUCTURE': {
          console.log('[Content] Received ANALYZE_PAGE_STRUCTURE message:', message.data);
          const { wrapperSelector, sampleSize = 5 } = message.data || {};
          try {
            const fields = analyzePageStructure(wrapperSelector, sampleSize);
            console.log('[Content] Sending back', fields.length, 'fields');
            sendResponse({ success: true, data: { fields } });
          } catch (error: any) {
            console.error('[Content] Error analyzing page:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        }

        case 'EXTRACT_PREVIEW': {
          const { wrapperSelector, fields, limit = 100 } = message.data || {};
          try {
            const items = extractPreviewData(wrapperSelector, fields, limit);
            sendResponse({ success: true, data: { items } });
          } catch (error: any) {
            sendResponse({ success: false, error: error.message });
          }
          break;
        }
      }

      // Ideally, we explicitly handle or not.
      if (
        message.type === 'START_PICKING' ||
        message.type === 'STOP_PICKING' ||
        message.type === 'SHOW_EXECUTION_FRAME' ||
        message.type === 'HIDE_EXECUTION_FRAME' ||
        message.type === 'ANALYZE_PAGE_STRUCTURE' ||
        message.type === 'EXTRACT_PREVIEW'
      ) {
        return; // synchronous response already sent
      }

      return;
    });
  },
});
