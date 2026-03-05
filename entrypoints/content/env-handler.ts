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
    } else if (attribute === 'html') {
        const val = el.innerHTML;
        return val ? normalizeText(val) : null;
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
    console.log('[applyTransformers] Starting with value:', String(value).substring(0, 100));
    console.log('[applyTransformers] Transformers:', transformers);

    for (const transform of transformers) {
        if (typeof value !== 'string') value = String(value);
        const beforeValue = value;

        try {
            console.log(`[applyTransformers] Applying transformer type: ${transform.type}`);
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
                    console.log('[applyTransformers] Regex transformer:', { pattern: transform.pattern, flags: transform.flags, replacement: transform.replacement });
                    if (transform.pattern) {
                        const pattern = transform.pattern;
                        const flags = transform.flags || '';
                        const regex = new RegExp(pattern, flags);
                        console.log('[applyTransformers] Created regex:', regex);

                        // If replacement is provided, use replace mode
                        if (transform.replacement !== undefined) {
                            console.log('[applyTransformers] Using replace mode with replacement:', transform.replacement);
                            value = value.replace(regex, transform.replacement);
                            console.log('[applyTransformers] After replace:', String(value).substring(0, 100));
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
                    // Execute custom JavaScript function
                    try {
                        if (transform.functionBody) {
                            // Create function from string and execute
                            const customFn = new Function('value', transform.functionBody);
                            value = customFn(value);
                        }
                    } catch (e) {
                        console.warn('Custom transformer failed:', e);
                    }
                    break;
            }
            console.log(`[applyTransformers] ${transform.type} result:`, { before: String(beforeValue).substring(0, 50), after: String(value).substring(0, 50) });
        } catch (e) {
            console.warn(`Transformer ${transform.type} failed:`, e);
            if (!transform.skipOnError) {
                // Continue with original value if skipOnError is not set
            }
        }
    }
    console.log('[applyTransformers] Final value:', String(value).substring(0, 100));
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
    console.log('[OctoGrab] Initializing Environment Handler');

    registerRpcHandler(async (msg: Message): Promise<MessageResponse | null> => {
        try {
            switch (msg.type) {
                // ... cases ...
                case 'PING':
                    return { success: true, message: 'Pong' };

                case 'ENV_CLICK': {
                    const { selector, selectorType, scope, openInNewTab } = msg.data;
                    console.log('[ENV_CLICK] Starting click operation', { selector, selectorType, hasScope: !!scope, openInNewTab });

                    const scopeEl = resolveScope(scope);
                    console.log('[ENV_CLICK] Scope resolved:', scopeEl.tagName, scopeEl.className);
                    let target = scopeEl;

                    if (selector && selector.trim()) {
                        console.log('[ENV_CLICK] Finding element with selector:', selector);
                        const el = getElement(selector, selectorType || 'css', scopeEl);
                        if (!el) {
                            console.error('[ENV_CLICK] Element not found:', selector);
                            throw new Error(`Element not found: ${selector}`);
                        }
                        console.log('[ENV_CLICK] Element found:', el.tagName, el.className);
                        target = el;
                    } else {
                        console.log('[ENV_CLICK] Using scope element as target');
                    }

                    // Find the best clickable element — if target isn't natively clickable,
                    // walk up to find the nearest <a>, <button>, or element with cursor:pointer/onclick
                    const clickableTarget = findClickableElement(target);
                    if (clickableTarget !== target) {
                        console.log('[ENV_CLICK] Found clickable ancestor:', clickableTarget.tagName, clickableTarget.className);
                    }

                    // Scroll into view and wait for it to settle
                    console.log('[ENV_CLICK] Scrolling element into view');
                    clickableTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(r => setTimeout(r, 150));

                    // Click logic
                    if (openInNewTab) {
                        console.log('[ENV_CLICK] Opening in new tab');
                        // Attempt to open in new tab — check target and clickable ancestor for href
                        const anchor = clickableTarget.tagName === 'A' ? clickableTarget
                            : clickableTarget.closest('a') || (target.tagName === 'A' ? target : target.closest('a'));
                        if (anchor) {
                            const href = (anchor as HTMLAnchorElement).href;
                            console.log('[ENV_CLICK] Link element, opening URL:', href);
                            window.open(href, '_blank');
                        } else {
                            console.log('[ENV_CLICK] Non-link element, simulating Ctrl+Click');
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
                        console.log('[ENV_CLICK] Normal click');
                        if (clickableTarget instanceof HTMLElement) {
                            clickableTarget.click();
                        } else {
                            console.log('[ENV_CLICK] Non-HTMLElement, using fallback click');
                            (clickableTarget as any).click?.() || clickableTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                        }
                    }
                    console.log('[ENV_CLICK] Click completed successfully');
                    return { success: true };
                }

                case 'ENV_INPUT': {
                    const { selector, selectorType, value, scope } = msg.data;
                    console.log('[ENV_INPUT] Starting input operation', { selector, selectorType, value, hasScope: !!scope });

                    const scopeEl = resolveScope(scope);
                    let target = scopeEl;

                    if (selector && selector.trim()) {
                        console.log('[ENV_INPUT] Finding element with selector:', selector);
                        const el = getElement(selector, selectorType || 'css', scopeEl);
                        if (!el) {
                            console.error('[ENV_INPUT] Element not found:', selector);
                            throw new Error(`Element not found: ${selector}`);
                        }
                        console.log('[ENV_INPUT] Element found:', el.tagName, el.className);
                        target = el;
                    } else {
                        console.log('[ENV_INPUT] Using scope element as target');
                    }

                    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                        console.log('[ENV_INPUT] Input/Textarea element, setting value:', value);
                        target.focus();
                        target.value = value;
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                        target.blur();
                    } else {
                        console.log('[ENV_INPUT] Content editable element, setting innerText');
                        // Content editable?
                        (target as HTMLElement).innerText = value;
                    }
                    console.log('[ENV_INPUT] Input completed successfully');
                    return { success: true };
                }

                case 'ENV_COUNT': {
                    const { selector, selectorType, scope } = msg.data;
                    console.log('[ENV_COUNT] Counting elements', { selector, selectorType, hasScope: !!scope });
                    const scopeEl = resolveScope(scope);
                    const elements = getElements(selector, selectorType, scopeEl);
                    console.log('[ENV_COUNT] Found', elements.length, 'elements');
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
                    console.log('[ENV_SCROLL] Starting scroll', { target, behavior, amount, selector, elementIndex });

                    let scrollTarget: Element | Window = window;

                    if (target === 'element') {
                        const scopeEl = resolveScope(scope);
                        if (selector && selector.trim()) {
                            console.log('[ENV_SCROLL] Finding scroll target element:', selector);

                            // If elementIndex is provided, get all elements and select by index
                            if (elementIndex !== undefined && elementIndex !== null) {
                                const elements = getElements(selector, selectorType || 'css', scopeEl);

                                console.log(`[ENV_SCROLL] Found ${elements.length} elements, selecting index ${elementIndex}`);

                                if (elementIndex >= elements.length || elementIndex < 0) {
                                    throw new Error(`Element index ${elementIndex} out of range (0-${elements.length - 1})`);
                                }

                                scrollTarget = elements[elementIndex];
                                const tagName = (scrollTarget as Element).tagName || 'Element';
                                console.log('[ENV_SCROLL] Scroll target found at index:', elementIndex, tagName);
                            } else {
                                const el = getElement(selector, selectorType || 'css', scopeEl);
                                if (!el) throw new Error(`Scroll target element not found: ${selector}`);
                                const tagName = (el as Element).tagName || 'Element';
                                console.log('[ENV_SCROLL] Scroll target found:', tagName);
                                scrollTarget = el;
                            }
                        } else {
                            console.log('[ENV_SCROLL] Using scope as scroll target');
                            // If scope is the element to scroll (e.g. a list container)
                            scrollTarget = scopeEl;
                        }
                    } else {
                        console.log('[ENV_SCROLL] Scrolling window');
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
                        console.log('[ENV_SCROLL] Scrolling to bottom');
                        if (scrollTarget === window) {
                            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        } else {
                            const el = scrollTarget as Element;
                            el.scrollTop = el.scrollHeight;
                        }
                    } else if (behavior === 'top') {
                        console.log('[ENV_SCROLL] Scrolling to top');
                        if (scrollTarget === window) {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                            const el = scrollTarget as Element;
                            el.scrollTop = 0;
                        }
                    } else if (behavior === 'pixels') {
                        console.log('[ENV_SCROLL] Scrolling by pixels:', amount);
                        if (scrollTarget === window) {
                            // Use instant scroll for accurate measurement
                            window.scrollBy({ top: amount || 0, behavior: 'auto' });
                        } else {
                            const el = scrollTarget as Element;
                            // Use scrollTop instead of scrollBy for better compatibility
                            el.scrollTop = el.scrollTop + (amount || 0);
                        }
                    } else if (behavior === 'element_into_view') {
                        console.log('[ENV_SCROLL] Scrolling element into view');
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

                    console.log('[ENV_SCROLL] Scroll completed', scrollInfo);
                    console.log(`[ENV_SCROLL] 📊 Position: ${afterScrollTop}px / ${beforeScrollHeight}px (${Math.round((afterScrollTop / beforeScrollHeight) * 100)}%)`);
                    console.log(`[ENV_SCROLL] 📏 Scrolled: ${scrollInfo.scrolled}px | Remaining: ${scrollInfo.remainingScroll}px`);

                    return { success: true, data: scrollInfo };
                }

                case 'ENV_EXTRACT_RECORD': {
                    const { fields, scope } = msg.data;
                    console.log('[ENV_EXTRACT_RECORD] Starting extraction', { fieldCount: fields.length, hasScope: !!scope });
                    const scopeEl = resolveScope(scope);
                    const result: Record<string, any> = {};

                    for (const field of (fields as ExtractionField[])) {
                        const key = field.key;
                        let value: any = null;

                        try {
                            const fieldSelector = field.selector || '';
                            const fieldType = field.selectorType || 'css';
                            console.log(`[ENV_EXTRACT_RECORD] Extracting field "${key}"`, { selector: fieldSelector, attribute: field.attribute, multiple: field.multiple });

                            // Handle multiple: true - extract from all matching elements
                            if (field.multiple && fieldSelector && fieldSelector.trim()) {
                                const elements = getElements(fieldSelector, fieldType, scopeEl);
                                console.log(`[ENV_EXTRACT_RECORD] Multiple mode: found ${elements.length} elements for "${key}"`);
                                const values: string[] = [];
                                for (const el of elements) {
                                    let v = extractValueFromElement(el, field.attribute);
                                    if (v && field.transformers) {
                                        v = applyTransformers(v, field.transformers);
                                    }
                                    if (v !== null && v !== undefined) values.push(String(v));
                                }
                                value = values.join(', ');
                                console.log(`[ENV_EXTRACT_RECORD] Extracted "${key}" (multiple):`, String(value).substring(0, 50));
                            } else {
                                // Single element extraction
                                let el: Element | null = scopeEl;
                                if (fieldSelector && fieldSelector.trim()) {
                                    el = getElement(fieldSelector, fieldType, scopeEl);
                                    if (!el) {
                                        console.warn(`[ENV_EXTRACT_RECORD] Element not found for field "${key}":`, fieldSelector);
                                    }
                                } else {
                                    console.log(`[ENV_EXTRACT_RECORD] Using scope element for field "${key}"`);
                                }

                                if (el) {
                                    value = extractValueFromElement(el, field.attribute);
                                    console.log(`[ENV_EXTRACT_RECORD] Extracted "${key}":`, String(value).substring(0, 50));
                                }

                                // Apply Transformers
                                console.log(`[ENV_EXTRACT_RECORD] Field "${key}" - value exists: ${!!value}, transformers exists: ${!!field.transformers}, transformers type: ${typeof field.transformers}, transformers length: ${field.transformers?.length}`);
                                if (value && field.transformers && field.transformers.length > 0) {
                                    console.log(`[ENV_EXTRACT_RECORD] ✅ Applying ${field.transformers.length} transformers to "${key}"`, field.transformers);
                                    const beforeTransform = value;
                                    value = applyTransformers(value, field.transformers);
                                    console.log(`[ENV_EXTRACT_RECORD] Transform result for "${key}":`, { before: String(beforeTransform).substring(0, 100), after: String(value).substring(0, 100) });
                                } else {
                                    console.log(`[ENV_EXTRACT_RECORD] ❌ NOT applying transformers to "${key}" - condition failed`);
                                }
                            }

                        } catch (err) {
                            console.error(`[ENV_EXTRACT_RECORD] Failed to extract field ${key}`, err);
                        }

                        result[key] = value;
                    }
                    console.log('[ENV_EXTRACT_RECORD] Extraction complete:', Object.keys(result).length, 'fields');
                    return { success: true, data: result };
                }

                case 'ENV_IS_VISIBLE': {
                    const { selector, selectorType, scope } = msg.data;
                    console.log('[ENV_IS_VISIBLE] Checking visibility', { selector, hasScope: !!scope });
                    const scopeEl = resolveScope(scope);

                    let target: Element | null = scopeEl;
                    if (selector && selector.trim()) {
                        target = getElement(selector, selectorType || 'css', scopeEl);
                    }

                    if (!target) {
                        console.log('[ENV_IS_VISIBLE] Element not found, returning false');
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
