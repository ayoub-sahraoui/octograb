import { registerRpcHandler, MessageResponse, Message } from '@/core/messaging';
import { resolveScope, getElement, getElements } from '@/core/dom-query';
import { ExtractionField } from '@/core/types';

/**
 * Normalize text to fix common encoding issues
 * Fixes double-encoded UTF-8 characters (e.g., smart quotes appearing as ‚Äú)
 */
function normalizeText(text: string): string {
    if (!text) return text;

    // Common encoding corruption mappings (UTF-8 interpreted as Windows-1252/Latin-1)
    const replacements: [string, string][] = [
        ['\u201A\u00C4\u00FA', '"'],  // Left double quote
        ['\u201A\u00C4\u00F9', '"'],  // Right double quote
        ['\u201A\u00C4\u00F4', "'"],  // Right single quote/apostrophe
        ['\u201A\u00C4\u00F2', "'"],  // Left single quote
        ['\u201A\u00C4\u00EE', '\u2014'],  // Em dash
        ['\u201A\u00C4\u00EC', '\u2013'],  // En dash
        ['\u201A\u00C4\u00B6', '\u2026'],  // Ellipsis
        ['\u00C3\u00A1', '\u00E1'],
        ['\u00C3\u00A9', '\u00E9'],
        ['\u00C3\u00AD', '\u00ED'],
        ['\u00C3\u00B3', '\u00F3'],
        ['\u00C3\u00BA', '\u00FA'],
        ['\u00C3\u00B1', '\u00F1'],
        ['\u00C3\u0081', '\u00C1'],
        ['\u00C3\u0089', '\u00C9'],
        ['\u00C3\u008D', '\u00CD'],
        ['\u00C3\u0093', '\u00D3'],
        ['\u00C3\u009A', '\u00DA'],
        ['\u00C3\u0091', '\u00D1'],
        // Additional common corruptions
        ['\u00E2\u0080\u009C', '"'],
        ['\u00E2\u0080\u009D', '"'],
        ['\u00E2\u0080\u0099', "'"],
        ['\u00E2\u0080\u0098', "'"],
        ['\u00E2\u0080\u0094', '\u2014'],
        ['\u00E2\u0080\u0093', '\u2013'],
        ['\u00E2\u0080\u00A6', '\u2026'],
    ];

    let normalized = text;
    for (const [corrupted, correct] of replacements) {
        normalized = normalized.replaceAll(corrupted, correct);
    }

    // Also try to decode if it looks like double-encoded UTF-8
    try {
        // Check if text contains high-byte characters that might be corrupted UTF-8
        if (/[\u0080-\u00FF]{2,}/.test(normalized)) {
            // Attempt to fix by re-encoding and decoding
            const bytes = new TextEncoder().encode(normalized);
            const decoder = new TextDecoder('utf-8', { fatal: false });
            const decoded = decoder.decode(bytes);
            if (decoded !== normalized && !decoded.includes('�')) {
                normalized = decoded;
            }
        }
    } catch (e) {
        // If decoding fails, keep the replaced version
    }

    return normalized;
}

function extractValueFromElement(el: Element, attribute: string): string | null {
    if (attribute === 'text') {
        const val = (el as HTMLElement).innerText?.trim();
        return val ? normalizeText(val) : null;
    } else if (attribute === 'html' || attribute === 'innerHTML') {
        const val = el.innerHTML;
        return val || null;
    } else if (attribute === 'outerHTML') {
        const val = el.outerHTML;
        return val || null;
    } else if (attribute === 'href' || attribute === 'src') {
        const val = (el as any)[attribute] || el.getAttribute(attribute);
        return val || null;
    } else {
        const val = el.getAttribute(attribute);
        return val && typeof val === 'string' ? normalizeText(val) : val;
    }
}

function applyTransformers(value: any, transformers: any[]): any {
    if (!value || !transformers) return value;

    for (const transform of transformers) {
        if (typeof value !== 'string') value = String(value);
        const beforeValue = value;

        try {
            switch (transform.type) {
                case 'trim':
                    value = value.trim();
                    break;
                case 'uppercase':
                    value = value.toUpperCase();
                    break;
                case 'lowercase':
                    value = value.toLowerCase();
                    break;
                case 'capitalize':
                    value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                    break;
                case 'title_case':
                    value = value.split(' ').map((word: string) =>
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                    break;
                case 'replace':
                    if (transform.searchValue) {
                        value = value.replaceAll(transform.searchValue, transform.replaceValue || '');
                    }
                    break;
                case 'regex':
                    if (transform.pattern) {
                        const pattern = transform.pattern;
                        const flags = transform.flags || '';
                        const regex = new RegExp(pattern, flags);

                        // If replacement is provided, use replace mode
                        if (transform.replacement !== undefined) {
                            value = value.replace(regex, transform.replacement);
                        } else if (transform.extractGroup !== undefined) {
                            // Extract specific group
                            const match = value.match(regex);
                            if (match && match[transform.extractGroup]) {
                                value = match[transform.extractGroup];
                            } else {
                                value = '';
                            }
                        } else {
                            // Default: extract first match
                            const match = value.match(regex);
                            value = match ? match[0] : '';
                        }
                    }
                    break;
                case 'split':
                    if (transform.delimiter) {
                        const parts = value.split(transform.delimiter);
                        if (transform.index !== undefined) {
                            value = parts[transform.index] || '';
                        } else {
                            value = parts.join(transform.delimiter);
                        }
                    }
                    break;
                case 'parse_number':
                    // Remove non-numeric characters except decimal point and minus
                    const cleaned = value.replace(/[^0-9.-]/g, '');
                    const num = parseFloat(cleaned);
                    value = isNaN(num) ? '' : String(num);
                    break;
                case 'currency_convert':
                    // Convert currency using fixed rate
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && transform.fixedRate) {
                        const converted = numValue * transform.fixedRate;
                        // Round to 2 decimal places
                        value = converted.toFixed(2);
                    }
                    break;
                case 'parse_json':
                    // Parse JSON string and optionally extract a path
                    try {
                        const parsed = JSON.parse(value);
                        if (transform.path) {
                            // Extract value from path like "user.name" or "items[0].id"
                            const pathParts = transform.path.split('.');
                            let result = parsed;
                            for (const part of pathParts) {
                                const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
                                if (arrayMatch) {
                                    result = result[arrayMatch[1]][parseInt(arrayMatch[2])];
                                } else {
                                    result = result[part];
                                }
                                if (result === undefined) break;
                            }
                            value = result !== undefined ? String(result) : '';
                        } else {
                            value = JSON.stringify(parsed);
                        }
                    } catch (e) {
                        console.warn('JSON parse failed:', e);
                        value = '';
                    }
                    break;
                case 'join':
                    // Join array values with delimiter
                    if (Array.isArray(value)) {
                        value = value.join(transform.delimiter || ', ');
                    }
                    break;
                case 'parse_date':
                    // Parse and format dates
                    try {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                            if (transform.outputFormat) {
                                // Simple format support: YYYY-MM-DD, DD/MM/YYYY, etc.
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const hours = String(date.getHours()).padStart(2, '0');
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                const seconds = String(date.getSeconds()).padStart(2, '0');

                                value = transform.outputFormat
                                    .replace('YYYY', String(year))
                                    .replace('MM', month)
                                    .replace('DD', day)
                                    .replace('HH', hours)
                                    .replace('mm', minutes)
                                    .replace('ss', seconds);
                            } else {
                                value = date.toISOString();
                            }
                        }
                    } catch (e) {
                        console.warn('Date parse failed:', e);
                    }
                    break;
                case 'custom':
                    // Custom JS transformers are not supported in Chrome extensions (CSP blocks new Function())
                    console.warn('[OctoGrab] Custom transformer is not supported in Chrome extensions due to CSP restrictions.');
                    break;
            }
        } catch (e) {
            console.warn(`[OctoGrab] Transformer ${transform.type} failed:`, e);
        }
    }
    return value;
}

/**
 * Walk up from the given element to find the nearest natively clickable ancestor.
 * Checks for: <a>, <button>, <input type="submit/button">, [role="button"],
 * elements with onclick handlers, or cursor:pointer style.
 * Returns the original element if it is already clickable or no better target is found.
 */
function findClickableElement(el: Element): Element {
    const clickableTags = new Set(['A', 'BUTTON', 'SUMMARY', 'DETAILS']);
    const clickableInputTypes = new Set(['submit', 'button', 'reset']);
    const maxDepth = 5; // Don't walk too far up

    // Check if element itself is clickable
    if (isClickable(el)) return el;

    // Walk up to find a clickable ancestor
    let current: Element | null = el.parentElement;
    let depth = 0;
    while (current && depth < maxDepth && current !== document.body) {
        if (isClickable(current)) return current;
        current = current.parentElement;
        depth++;
    }

    // No clickable ancestor found — return original element (it might still work via event bubbling)
    return el;

    function isClickable(target: Element): boolean {
        // Native clickable tags
        if (clickableTags.has(target.tagName)) return true;

        // Input types that are clickable
        if (target.tagName === 'INPUT') {
            const type = (target as HTMLInputElement).type?.toLowerCase();
            if (clickableInputTypes.has(type)) return true;
        }

        // ARIA role
        if (target.getAttribute('role') === 'button' || target.getAttribute('role') === 'link') return true;

        // Has onclick attribute
        if (target.hasAttribute('onclick')) return true;

        // Has tabindex (intentionally interactive)
        if (target.hasAttribute('tabindex') && target.getAttribute('tabindex') !== '-1') return true;

        // Check computed style for cursor:pointer
        try {
            const style = window.getComputedStyle(target);
            if (style.cursor === 'pointer') return true;
        } catch (e) { /* ignore */ }

        return false;
    }
}

export function initEnvHandler() {
    registerRpcHandler(async (msg: Message): Promise<MessageResponse | null> => {
        try {
            switch (msg.type) {
                // ... cases ...
                case 'PING':
                    return { success: true, message: 'Pong' };

                case 'ENV_ABORT':
                    // Signal long-running operations to cancel
                    (window as any).__octoGrabAborted__ = true;
                    return { success: true };

                case 'ENV_CLICK': {
                    const { selector, selectorType, scope, openInNewTab } = msg.data;
                    const scopeEl = resolveScope(scope);
                    let target = scopeEl;

                    if (selector && selector.trim()) {
                        const el = getElement(selector, selectorType || 'css', scopeEl);
                        if (!el) throw new Error(`Element not found: ${selector}`);
                        target = el;
                    }

                    // Find the best clickable element — if target isn't natively clickable,
                    // walk up to find the nearest <a>, <button>, or element with cursor:pointer/onclick
                    const clickableTarget = findClickableElement(target);

                    // Scroll into view and wait for it to settle
                    clickableTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(r => setTimeout(r, 150));

                    // Click logic
                    if (openInNewTab) {
                        // Attempt to open in new tab — check target and clickable ancestor for href
                        const anchor = clickableTarget.tagName === 'A' ? clickableTarget
                            : clickableTarget.closest('a') || (target.tagName === 'A' ? target : target.closest('a'));
                        if (anchor) {
                            const href = (anchor as HTMLAnchorElement).href;
                            window.open(href, '_blank');
                        } else {
                            const mouseEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                                ctrlKey: true,
                                metaKey: true
                            });
                            clickableTarget.dispatchEvent(mouseEvent);
                        }
                    } else {
                        if (clickableTarget instanceof HTMLElement) {
                            clickableTarget.click();
                        } else {
                            (clickableTarget as any).click?.() || clickableTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                        }
                    }
                    return { success: true };
                }

                case 'ENV_INPUT': {
                    const { selector, selectorType, value, scope } = msg.data;
                    const scopeEl = resolveScope(scope);
                    let target = scopeEl;

                    if (selector && selector.trim()) {
                        const el = getElement(selector, selectorType || 'css', scopeEl);
                        if (!el) throw new Error(`Element not found: ${selector}`);
                        target = el;
                    }

                    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                        target.focus();
                        target.value = value;
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                        target.blur();
                    } else {
                        (target as HTMLElement).innerText = value;
                    }
                    return { success: true };
                }

                case 'ENV_COUNT': {
                    const { selector, selectorType, scope } = msg.data;
                    const scopeEl = resolveScope(scope);
                    const elements = getElements(selector, selectorType, scopeEl);
                    return { success: true, data: elements.length };
                }

                case 'ENV_GET_TEXT': { // Fallback single item getter
                    const { selector, selectorType, scope } = msg.data;
                    const scopeEl = resolveScope(scope);
                    let target = scopeEl;
                    if (selector && selector.trim()) {
                        const el = getElement(selector, selectorType || 'css', scopeEl);
                        if (!el) throw new Error(`Element not found: ${selector}`);
                        target = el;
                    }

                    const text = (target as HTMLElement).innerText?.trim() || '';
                    return { success: true, data: normalizeText(text) };
                }

                case 'ENV_GET_ATTRIBUTE': {
                    const { selector, selectorType, scope, attribute } = msg.data;
                    const scopeEl = resolveScope(scope);
                    let target = scopeEl;

                    if (selector && selector.trim()) {
                        const el = getElement(selector, selectorType || 'css', scopeEl);
                        if (!el) throw new Error(`Element not found: ${selector}`);
                        target = el;
                    }

                    const value = target.getAttribute(attribute) || '';
                    return { success: true, data: value };
                }

                case 'ENV_SCROLL': {
                    const { target, behavior, amount, selector, selectorType, scope, elementIndex } = msg.data;

                    let scrollTarget: Element | Window = window;

                    if (target === 'element') {
                        const scopeEl = resolveScope(scope);
                        if (selector && selector.trim()) {
                            // If elementIndex is provided, get all elements and select by index
                            if (elementIndex !== undefined && elementIndex !== null) {
                                const elements = getElements(selector, selectorType || 'css', scopeEl);
                                if (elementIndex >= elements.length || elementIndex < 0) {
                                    throw new Error(`Element index ${elementIndex} out of range (0-${elements.length - 1})`);
                                }
                                scrollTarget = elements[elementIndex];
                            } else {
                                const el = getElement(selector, selectorType || 'css', scopeEl);
                                if (!el) throw new Error(`Scroll target element not found: ${selector}`);
                                scrollTarget = el;
                            }
                        } else {
                            scrollTarget = scopeEl;
                        }
                    }

                    // Get current scroll position before scrolling
                    let beforeScrollTop = 0;
                    let beforeScrollHeight = 0;
                    if (scrollTarget === window) {
                        beforeScrollTop = window.scrollY || document.documentElement.scrollTop;
                        beforeScrollHeight = document.documentElement.scrollHeight;
                    } else {
                        const el = scrollTarget as Element;
                        beforeScrollTop = el.scrollTop;
                        beforeScrollHeight = el.scrollHeight;
                    }

                    if (behavior === 'bottom') {
                        if (scrollTarget === window) {
                            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        } else {
                            const el = scrollTarget as Element;
                            el.scrollTop = el.scrollHeight;
                        }
                    } else if (behavior === 'top') {
                        if (scrollTarget === window) {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                            const el = scrollTarget as Element;
                            el.scrollTop = 0;
                        }
                    } else if (behavior === 'pixels') {
                        if (scrollTarget === window) {
                            // Use instant scroll for accurate measurement
                            window.scrollBy({ top: amount || 0, behavior: 'auto' });
                        } else {
                            const el = scrollTarget as Element;
                            // Use scrollTop instead of scrollBy for better compatibility
                            el.scrollTop = el.scrollTop + (amount || 0);
                        }
                    } else if (behavior === 'element_into_view') {
                        if (scrollTarget !== window && scrollTarget instanceof Element) {
                            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }

                    // Get scroll position after scrolling (immediately for instant scroll)
                    let afterScrollTop = 0;
                    if (scrollTarget === window) {
                        afterScrollTop = window.scrollY || document.documentElement.scrollTop;
                    } else {
                        afterScrollTop = (scrollTarget as Element).scrollTop;
                    }

                    const scrollInfo = {
                        beforeScrollTop,
                        afterScrollTop,
                        scrollHeight: beforeScrollHeight,
                        scrolled: afterScrollTop - beforeScrollTop,
                        remainingScroll: beforeScrollHeight - afterScrollTop
                    };

                    return { success: true, data: scrollInfo };
                }

                case 'ENV_EXTRACT_RECORD': {
                    const { fields, scope } = msg.data;
                    const scopeEl = resolveScope(scope);
                    const result: Record<string, any> = {};

                    for (const field of (fields as ExtractionField[])) {
                        const key = field.key;
                        let value: any = null;

                        try {
                            const fieldSelector = field.selector || '';
                            const fieldType = field.selectorType || 'css';

                            // Handle multiple: true - extract from all matching elements
                            if (field.multiple && fieldSelector && fieldSelector.trim()) {
                                const elements = getElements(fieldSelector, fieldType, scopeEl);
                                const values: string[] = [];
                                for (const el of elements) {
                                    let v = extractValueFromElement(el, field.attribute);
                                    if (v && field.transformers) {
                                        v = applyTransformers(v, field.transformers);
                                    }
                                    if (v !== null && v !== undefined) values.push(String(v));
                                }
                                value = values.join(', ');
                            } else {
                                // Single element extraction
                                let el: Element | null = scopeEl;
                                if (fieldSelector && fieldSelector.trim()) {
                                    el = getElement(fieldSelector, fieldType, scopeEl);
                                }

                                if (el) {
                                    value = extractValueFromElement(el, field.attribute);
                                }

                                // Apply Transformers
                                if (value && field.transformers && field.transformers.length > 0) {
                                    value = applyTransformers(value, field.transformers);
                                }
                            }

                        } catch (err) {
                            console.warn(`[OctoGrab] Failed to extract field ${key}:`, err);
                        }

                        result[key] = value;
                    }
                    return { success: true, data: result };
                }

                case 'ENV_GET_SCOPE': {
                    const { selector, selectorType, scope } = msg.data;
                    const scopeEl = resolveScope(scope);
                    const el = selector && selector.trim()
                        ? getElement(selector, selectorType || 'css', scopeEl)
                        : scopeEl;
                    if (!el) {
                        return { success: false, error: `Scope element not found: ${selector}` };
                    }
                    // Return a Scope object that the executor can pass back in future messages
                    // We use a unique attribute to re-locate this element later
                    const scopeId = `__octo_scope_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    el.setAttribute('data-octo-scope', scopeId);
                    return {
                        success: true,
                        data: {
                            selector: `[data-octo-scope="${scopeId}"]`,
                            selectorType: 'css',
                            index: 0,
                        }
                    };
                }

                case 'ENV_IS_VISIBLE': {
                    const { selector, selectorType, scope } = msg.data;
                    const scopeEl = resolveScope(scope);

                    let target: Element | null = scopeEl;
                    if (selector && selector.trim()) {
                        target = getElement(selector, selectorType || 'css', scopeEl);
                    }

                    if (!target) {
                        return { success: true, data: false };
                    }

                    // Visibility check
                    const style = window.getComputedStyle(target);
                    const isFixed = style.position === 'fixed' || style.position === 'sticky';

                    const isVisible = !!((isFixed || (target as HTMLElement).offsetParent !== null) &&
                        (target as HTMLElement).offsetWidth > 0 &&
                        (target as HTMLElement).offsetHeight > 0 &&
                        style.visibility !== 'hidden' &&
                        style.display !== 'none');

                    return { success: true, data: isVisible };
                }

                case 'TEST_SELECTOR': {
                    const { selector, selectorType } = msg.data;
                    if (!selector || !selector.trim()) {
                        return { success: true, data: { count: 0, elements: [] } };
                    }

                    try {
                        const elements = getElements(selector, selectorType || 'css');
                        const count = elements.length;
                        // Return info about first few matched elements (max 5)
                        const elementInfo = elements.slice(0, 5).map(el => {
                            const tag = el.tagName.toLowerCase();
                            const isClickable = tag === 'a' || tag === 'button' || tag === 'input' || tag === 'select' ||
                                tag === 'textarea' || tag === 'summary' || tag === 'details' ||
                                el.hasAttribute('onclick') || el.hasAttribute('role') && ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio'].includes(el.getAttribute('role') || '') ||
                                el.getAttribute('tabindex') !== null ||
                                window.getComputedStyle(el).cursor === 'pointer';
                            const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' ||
                                (el as HTMLElement).isContentEditable;
                            const isVisible = (() => {
                                const style = window.getComputedStyle(el);
                                const isFixed = style.position === 'fixed' || style.position === 'sticky';
                                return !!((isFixed || (el as HTMLElement).offsetParent !== null) &&
                                    (el as HTMLElement).offsetWidth > 0 &&
                                    (el as HTMLElement).offsetHeight > 0 &&
                                    style.visibility !== 'hidden' &&
                                    style.display !== 'none');
                            })();
                            return { tag, isClickable, isInput, isVisible };
                        });
                        return { success: true, data: { count, elements: elementInfo } };
                    } catch (e: any) {
                        // Selector syntax error
                        return { success: true, data: { count: 0, elements: [], error: e.message } };
                    }
                }

                case 'ENV_WAIT_NETWORK_IDLE': {
                    const { timeout } = msg.data;
                    const monitor = (window as any).__octoGrabNetworkMonitor__;

                    if (!monitor) {
                        // Fallback if monitor not initialized (should not happen if content script loaded)
                        console.warn('[OctoGrab] NetworkMonitor not found, falling back to simple delay');
                        await new Promise(r => setTimeout(r, 1000));
                        return { success: true, message: 'Fallback delay' };
                    }

                    await monitor.waitForIdle(timeout || 10000);
                    return { success: true };
                }
            }

            // Not handled by this handler
            return null;

        } catch (e: any) {
            console.error('[OctoGrab] Env Handler Error:', e);
            return { success: false, error: e.message };
        }
    });
}
