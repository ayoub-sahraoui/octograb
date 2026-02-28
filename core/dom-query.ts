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

  let el: Element | null = null;

  // Try primary selector
  try {
    el = findElement(parentEl, selector, scope.selectorType, scope.index);
  } catch (e) {
    console.warn(`[OctoGrab] Primary selector failed: ${selector}`, e);
  }

  // Try fallbacks if not found
  if (!el && (scope as any).detected) {
    const detected = (scope as any).detected;
    if (detected.css && detected.css !== selector) {
      try {
        el = findElement(parentEl, detected.css, 'css', scope.index);
        console.log(`[OctoGrab] Recovered using detected CSS: ${detected.css}`);
      } catch (e) { }
    }
    if (!el && detected.xpath && detected.xpath !== selector) {
      try {
        el = findElement(parentEl, detected.xpath, 'xpath', scope.index);
        console.log(`[OctoGrab] Recovered using detected XPath: ${detected.xpath}`);
      } catch (e) { }
    }
  }

  if (!el) {
    console.warn(`[OctoGrab] Element not found at index ${scope.index} for ${selector} in scope`, parentEl);
    throw new Error(`Element not found: ${selector} [${scope.index}]`);
  }

  return el;
}

function findElement(parent: Element, selector: string, type: 'css' | 'xpath' = 'css', index: number = 0): Element | null {
  if (type === 'xpath') {
    // Handle XPath
    // IMPORTANT: To query relative to parentEl, XPath must be relative (start with ./)
    let xpath = selector;
    if (xpath.startsWith('/')) {
      if (xpath.startsWith('//')) {
        xpath = '.' + xpath;
      } else {
        xpath = '.' + xpath;
      }
    }

    const result = document.evaluate(
      xpath,
      parent,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    if (index >= result.snapshotLength) return null;
    return result.snapshotItem(index) as Element;
  } else {
    const elements = parent.querySelectorAll(selector);
    if (index >= elements.length) return null;
    return elements[index];
  }
}

/**
 * Get element using specific type (helper for non-scoped queries or simple queries)
 */
export function getElement(selector: string, type: 'css' | 'xpath', scope: Element | Document = document): Element | null {
  if (type === 'xpath') {
    // Fix absolute XPath to be relative when scoped to an element
    let xpath = selector;
    if (scope !== document && xpath.startsWith('/')) {
      xpath = '.' + (xpath.startsWith('//') ? xpath : xpath);
    }
    const result = document.evaluate(
      xpath,
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
    // Fix absolute XPath to be relative when scoped to an element
    let xpath = selector;
    if (scope !== document && xpath.startsWith('/')) {
      xpath = '.' + (xpath.startsWith('//') ? xpath : xpath);
    }
    const result = document.evaluate(
      xpath,
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
