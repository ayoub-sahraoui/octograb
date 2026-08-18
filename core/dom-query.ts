import { Scope } from './env';
import { SelectorType } from './types';

// Safe XPath constants for environments without global XPathResult (e.g. Node/Vitest tests)
const ORDERED_NODE_SNAPSHOT_TYPE = typeof XPathResult !== 'undefined' ? XPathResult.ORDERED_NODE_SNAPSHOT_TYPE : 7;
const FIRST_ORDERED_NODE_TYPE = typeof XPathResult !== 'undefined' ? XPathResult.FIRST_ORDERED_NODE_TYPE : 9;

/**
 * Resolve a Scope object to a specific DOM Element.
 * This is used to re-locate elements inside the content script based on the scope chain.
 */
export function resolveScope(scope?: Scope, doc: Document = typeof document !== 'undefined' ? document : (null as any)): Element {
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
    if (selector.startsWith('[data-octo-scope="')) {
      console.warn(`[OctoGrab] Scope marker ${selector} not found. DOM may have been reconstructed or navigated.`);
      throw new Error(`Detached scope marker not found: ${selector}`);
    }
    console.warn(`[OctoGrab] Element not found at index ${scope.index} for ${selector} in scope`, parentEl);
    throw new Error(`Element not found: ${selector} [${scope.index}]`);
  }

  return el;
}

function findElement(parent: Element, selector: string, type: SelectorType = 'css', index: number = 0): Element | null {
  const elements = getElements(selector, type, parent);
  if (index >= elements.length) return null;
  return elements[index];
}

/**
 * Get elements matching a text string inside a scope.
 * Matches leaf nodes containing the text.
 */
function getElementsByText(scope: Element | Document, text: string): Element[] {
  const elements: Element[] = [];
  const cleanText = text.trim();
  if (!cleanText) return [];

  // Handle quote escaping for XPath expression construction
  let xpathTextExpr: string;
  if (!cleanText.includes('"')) {
    xpathTextExpr = `"${cleanText}"`;
  } else if (!cleanText.includes("'")) {
    xpathTextExpr = `'${cleanText}'`;
  } else {
    const parts = cleanText.split('"');
    xpathTextExpr = 'concat(' + parts.map(p => `"${p}"`).join(', \'"\', ') + ')';
  }

  const isDocument = scope.nodeType === 9;

  const xpathExact = !isDocument
    ? `.//*[normalize-space() = ${xpathTextExpr}]`
    : `//*[normalize-space() = ${xpathTextExpr}]`;

  const xpathContains = !isDocument
    ? `.//*[contains(normalize-space(), ${xpathTextExpr})]`
    : `//*[contains(normalize-space(), ${xpathTextExpr})]`;

  // Try exact match first
  try {
    const doc = scope.nodeType === 9 ? (scope as Document) : (scope.ownerDocument || (typeof document !== 'undefined' ? document : null as any));
    const result = doc.evaluate(
      xpathExact,
      scope,
      null,
      ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let i = 0; i < result.snapshotLength; i++) {
      const item = result.snapshotItem(i);
      if (item) elements.push(item as Element);
    }
  } catch (e) {}

  // Try contains match if exact yields nothing
  if (elements.length === 0) {
    try {
      const doc = scope.nodeType === 9 ? (scope as Document) : (scope.ownerDocument || (typeof document !== 'undefined' ? document : null as any));
      const result = doc.evaluate(
        xpathContains,
        scope,
        null,
        ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      for (let i = 0; i < result.snapshotLength; i++) {
        const item = result.snapshotItem(i);
        if (item) elements.push(item as Element);
      }
    } catch (e) {}
  }

  // Filter to return only most specific elements (leaf elements)
  return elements.filter(el => {
    return !elements.some(otherEl => otherEl !== el && el.contains(otherEl));
  });
}

/**
 * Get element using specific type (helper for non-scoped queries or simple queries)
 */
export function getElement(selector: string, type: SelectorType, scope: Element | Document = typeof document !== 'undefined' ? document : (null as any)): Element | null {
  const elements = getElements(selector, type, scope);
  return elements.length > 0 ? elements[0] : null;
}

/**
 * Get all elements using specific type
 */
export function getElements(selector: string, type: SelectorType, scope: Element | Document = typeof document !== 'undefined' ? document : (null as any)): Element[] {
  let resolvedType: 'css' | 'xpath' | 'text' = 'css';

  if (type === 'auto') {
    const trimmed = selector.trim();
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('(')) {
      resolvedType = 'xpath';
    } else {
      try {
        // Parse check using document fragment
        const doc = scope.nodeType === 9 ? (scope as Document) : (scope.ownerDocument || (typeof document !== 'undefined' ? document : null as any));
        doc.createDocumentFragment().querySelectorAll(trimmed);

        // Valid CSS syntax, run query
        let css = trimmed;
        if (css.startsWith('>') || css.startsWith('+') || css.startsWith('~')) {
          css = ':scope ' + css;
        }

        const elements: Element[] = [];
        if (scope && (scope as any).nodeType === 1) {
          const scopeEl = scope as Element;
          if (css === ':scope') {
            elements.push(scopeEl);
          } else {
            try {
              if (scopeEl.matches && scopeEl.matches(css)) {
                elements.push(scopeEl);
              }
            } catch (e) {}
            elements.push(...Array.from(scopeEl.querySelectorAll(css)));
          }
        } else {
          elements.push(...Array.from(scope.querySelectorAll(css)));
        }

        if (elements.length > 0) {
          return elements;
        }

        // 0 CSS matches - fall back to text content match
        const textElements = getElementsByText(scope, selector);
        if (textElements.length > 0) {
          return textElements;
        }

        return [];
      } catch (e) {
        // Invalid CSS syntax -> treat as Text selector
        resolvedType = 'text';
      }
    }
  } else if (type === 'text') {
    resolvedType = 'text';
  } else if (type === 'xpath') {
    resolvedType = 'xpath';
  }

  if (resolvedType === 'xpath') {
    // Fix absolute XPath to be relative when scoped to an element
    let xpath = selector;
    const isDocument = scope.nodeType === 9;
    if (!isDocument && xpath.startsWith('/')) {
      xpath = '.' + (xpath.startsWith('//') ? xpath : xpath);
    }
    const doc = isDocument ? (scope as Document) : (scope.ownerDocument || (typeof document !== 'undefined' ? document : null as any));
    const result = doc.evaluate(
      xpath,
      scope,
      null,
      ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    const elements: Element[] = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      const item = result.snapshotItem(i);
      if (item) elements.push(item as Element);
    }
    return elements;
  } else if (resolvedType === 'text') {
    return getElementsByText(scope, selector);
  } else {
    // CSS
    let css = selector;
    if (css.trim().startsWith('>') || css.trim().startsWith('+') || css.trim().startsWith('~')) {
      css = ':scope ' + css.trim();
    }
    const elements: Element[] = [];
    if (scope && (scope as any).nodeType === 1) {
      const scopeEl = scope as Element;
      if (css === ':scope') {
        return [scopeEl];
      }
      try {
        if (scopeEl.matches && scopeEl.matches(css)) {
          elements.push(scopeEl);
        }
      } catch (e) {}
    }
    try {
      elements.push(...Array.from(scope.querySelectorAll(css)));
    } catch (e) {}
    return elements;
  }
}
