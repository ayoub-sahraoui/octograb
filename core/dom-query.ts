import { Scope } from './env';

/**
 * Resolve a Scope object to a specific DOM Element.
 * This is used to re-locate elements inside the content script based on the scope chain.
 */
export function resolveScope(scope?: Scope, doc: Document = document): Element {
  if (!scope) return doc.documentElement;

  // 1. Resolve parent first (recursive)
  let parentEl: Element = doc.documentElement;
  if (scope.parent) {
    parentEl = resolveScope(scope.parent, doc);
  }

  const selector = scope.selector;
  if (!selector) return parentEl;

  // 2. Find the element within the parent using the index and selector
  if (scope.selectorType === 'xpath') {
    // Handle XPath
    // IMPORTANT: To query relative to parentEl, XPath must be relative (start with ./)
    // If we have a global XPath like //div, document.evaluate on a node will still search globally unless we fix it.
    let xpath = selector;
    if (xpath.startsWith('/')) {
        // If it looks absolute, try to make it relative to context.
        // E.g. //div -> .//div
        // /html/body... -> .//html/body (weird) or just ./... 
        // Best effort: if it starts with //, prepend .
        if (xpath.startsWith('//')) {
            xpath = '.' + xpath;
        } else {
            // Begins with / but not //. E.g. /html/body/div...
            // This is strictly absolute. But if we are in a scope, strictly absolute might be wrong 
            // if the user intended it to be essentially "at this level".
            // But let's assume absolute paths are absolute.
            // However, usually we want relative search.
            xpath = '.' + xpath;
        }
    }

    const result = doc.evaluate(
      xpath, 
      parentEl, 
      null, 
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
      null
    );

    if (scope.index >= result.snapshotLength) {
        // Fallback: If index 0 not found, maybe just warn? 
        // But for scraping, strictness is usually good.
        // We throw, and let the executor handle errors.
        console.warn(`[OctoGrab] Element not found at index ${scope.index} for xpath ${xpath} in scope`, parentEl);
        throw new Error(`Element not found: ${selector} [${scope.index}]`);
    }
    
    const el = result.snapshotItem(scope.index) as Element;
    return el;

  } else {
    // Handle CSS
    // parentEl.querySelectorAll finds all descendants matching the selector.
    // Use :scope pseudo-class if needed? 
    // Usually querySelectorAll is fine for descendants.
    
    // Note: If selector is compound like "div > span", it works.
    const elements = parentEl.querySelectorAll(selector);
    
    if (scope.index >= elements.length) {
         console.warn(`[OctoGrab] Element not found at index ${scope.index} for css ${selector} in scope`, parentEl);
         throw new Error(`Element not found: ${selector} [${scope.index}]`);
    }
    
    return elements[scope.index];
  }
}

/**
 * Get element using specific type (helper for non-scoped queries or simple queries)
 */
export function getElement(selector: string, type: 'css' | 'xpath', scope: Element | Document = document): Element | null {
  if (type === 'xpath') {
    const result = document.evaluate(
      selector, 
      scope, 
      null, 
      XPathResult.FIRST_ORDERED_NODE_TYPE, 
      null
    );
    return result.singleNodeValue as Element;
  } else {
    return scope.querySelector(selector);
  }
}

/**
 * Get all elements using specific type
 */
export function getElements(selector: string, type: 'css' | 'xpath', scope: Element | Document = document): Element[] {
  if (type === 'xpath') {
    const result = document.evaluate(
      selector, 
      scope, 
      null, 
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
      null
    );
    const elements: Element[] = [];
    for (let i = 0; i < result.snapshotLength; i++) {
        const item = result.snapshotItem(i);
        if (item) elements.push(item as Element);
    }
    return elements;
  } else {
    return Array.from(scope.querySelectorAll(selector));
  }
}
