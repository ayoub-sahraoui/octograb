import { registerRpcHandler, MessageResponse, Message } from '../../core/messaging';
import { resolveScope, getElement, getElements } from '../../core/dom-query';
import { buildSwitchFrameResult } from './switch-frame-result';
import { DomExtractionField } from '../../core/extraction-contract';

// ─── Utility: Scope Marker Cleanup ─────────────────────────────────────────

const scopeMarkers = new Set<string>();

function cleanupAllScopeMarkers(): void {
    for (const marker of scopeMarkers) {
        const el = document.querySelector(`[data-octo-scope="${marker}"]`);
        if (el) el.removeAttribute('data-octo-scope');
    }
    scopeMarkers.clear();
}

function cleanupScopeMarker(markerId: string): void {
    const el = document.querySelector(`[data-octo-scope="${markerId}"]`);
    if (el) el.removeAttribute('data-octo-scope');
    scopeMarkers.delete(markerId);
}

// ─── Utility: Selector Test Highlights ─────────────────────────────────────

let testHighlightOverlays: { element: HTMLElement; target: HTMLElement }[] = [];

function clearTestHighlights(): void {
    for (const item of testHighlightOverlays) {
        item.element.remove();
    }
    testHighlightOverlays = [];
    window.removeEventListener('scroll', repositionTestHighlights, true);
    window.removeEventListener('resize', repositionTestHighlights, true);
}

function repositionTestHighlights(): void {
    for (const item of testHighlightOverlays) {
        const rect = item.target.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            item.element.style.display = 'none';
            continue;
        }
        Object.assign(item.element.style, {
            display: 'block',
            top: `${rect.top + window.scrollY}px`,
            left: `${rect.left + window.scrollX}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
        });
    }
}

// ─── Utility: Abort Checking ─────────────────────────────────────────────

function isAborted(): boolean {
    return !!(window as any).__octoGrabAborted__;
}

function throwIfAborted(): void {
    if (isAborted()) throw new Error('Operation aborted');
}

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

export function applyTransformers(value: any, transformers: any[]): any {
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
                        try {
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
                                    // Group not found - log warning and return null
                                    console.warn(`[OctoGrab] Regex group ${transform.extractGroup} not found in match for "${transform.pattern}" on: "${value.substring(0, 50)}"`);
                                    value = null;
                                }
                            } else {
                                // Default: extract first match
                                const match = value.match(regex);
                                if (match) {
                                    value = match[0];
                                } else {
                                    // No match - log warning but preserve original
                                    console.warn(`[OctoGrab] Regex "${transform.pattern}" had no match for: "${value.substring(0, 50)}"`);
                                    // Keep original value - don't overwrite with ''
                                }
                            }
                        } catch (e) {
                            // Invalid regex pattern - throw to fail visibly
                            console.error(`[OctoGrab] Invalid regex pattern "${transform.pattern}":`, e);
                            throw new Error(`Invalid regex pattern: ${transform.pattern}`);
                        }
                    }
                    break;
                case 'split':
                    if (transform.delimiter) {
                        const parts = value.split(transform.delimiter);
                        if (transform.index !== undefined) {
                            if (transform.index >= 0 && transform.index < parts.length) {
                                value = parts[transform.index];
                            } else {
                                console.warn(`[OctoGrab] Split index ${transform.index} out of range (0-${parts.length - 1}) for delimiter "${transform.delimiter}" - preserving original`);
                                // Keep original value - don't overwrite with ''
                            }
                        } else {
                            value = parts.join(transform.delimiter);
                        }
                    }
                    break;
                case 'parse_number':
                    // Remove non-numeric characters except decimal point and minus
                    const cleaned = value.replace(/[^0-9.-]/g, '');
                    const num = parseFloat(cleaned);
                    if (isNaN(num)) {
                        console.warn(`[OctoGrab] parse_number: no valid number found in "${value.substring(0, 50)}"`);
                        // Keep original value - don't overwrite with ''
                    } else {
                        value = String(num);
                    }
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
                            if (result !== undefined) {
                                value = String(result);
                            } else {
                                console.warn(`[OctoGrab] JSON path "${transform.path}" not found in: "${value.substring(0, 50)}"`);
                                // Keep original value - don't overwrite with ''
                            }
                        } else {
                            value = JSON.stringify(parsed);
                        }
                    } catch (e) {
                        console.warn('[OctoGrab] JSON parse failed:', e, '- preserving original value');
                        // Keep original value - don't overwrite with ''
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
                        // Pre-validation: reject empty or whitespace-only input
                        if (!value || value.trim() === '') {
                            console.warn('[OctoGrab] Date parse: empty value - preserving original');
                            break; // Keep original empty value
                        }

                        // Reject relative time strings
                        const relativePatterns = [
                            /\b(yesterday|today|tomorrow|now|ago|from now)\b/i,
                            /\b\d+\s+(minute|hour|day|week|month|year)s?\s+(ago|from now)\b/i,
                        ];
                        if (relativePatterns.some(p => p.test(value))) {
                            console.warn(`[OctoGrab] Date parse: rejecting relative time "${value}" - preserving original`);
                            break; // Keep original value
                        }

                        const date = new Date(value);

                        // Validate it's a real date
                        if (isNaN(date.getTime())) {
                            console.warn(`[OctoGrab] Date parse: invalid date "${value}" - preserving original`);
                            break; // Keep original value
                        }

                        // Sanity check: year should be reasonable (not 1970 epoch from malformed input)
                        const year = date.getFullYear();
                        if (year < 1900 || year > 2100) {
                            console.warn(`[OctoGrab] Date parse: suspicious year ${year} from "${value}" - proceeding but may be incorrect`);
                        }

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
                    } catch (e) {
                        console.warn('[OctoGrab] Date parse failed:', e, '- preserving original value');
                        // Keep original value on any error
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

function getHoverEventPosition(target: Element): { clientX: number; clientY: number } {
    if (!(target instanceof Element) || typeof target.getBoundingClientRect !== 'function') {
        return { clientX: 0, clientY: 0 };
    }

    const rect = target.getBoundingClientRect();
    return {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
    };
}

function focusHoverTarget(target: Element): void {
    if (!(target instanceof HTMLElement)) return;

    const isNaturallyFocusable = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'].includes(target.tagName);
    const hasTabIndex = target.hasAttribute('tabindex') && target.getAttribute('tabindex') !== '-1';
    if (!isNaturallyFocusable && !hasTabIndex) return;

    try {
        target.focus({ preventScroll: true });
    } catch {
        target.focus();
    }
}

export function dispatchHoverSequence(target: Element): void {
    const { clientX, clientY } = getHoverEventPosition(target);
    const mouseEventInit: MouseEventInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
    };

    focusHoverTarget(target);

    if (typeof PointerEvent !== 'undefined') {
        const pointerEventInit: PointerEventInit = {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            pointerType: 'mouse',
            isPrimary: true,
        };

        target.dispatchEvent(new PointerEvent('pointerover', pointerEventInit));
        target.dispatchEvent(new PointerEvent('pointerenter', pointerEventInit));
        target.dispatchEvent(new PointerEvent('pointermove', pointerEventInit));
    }

    target.dispatchEvent(new MouseEvent('mouseover', mouseEventInit));
    target.dispatchEvent(new MouseEvent('mouseenter', mouseEventInit));
    target.dispatchEvent(new MouseEvent('mousemove', mouseEventInit));
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

                case 'ENV_RESET_ABORT':
                    (window as any).__octoGrabAborted__ = false;
                    return { success: true };

                case 'ENV_CLICK': {
                    throwIfAborted();
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
                    throwIfAborted(); // Check after async operation

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

                case 'ENV_GET_CLICK_TARGET_INFO': {
                    const { selector, selectorType, scope } = msg.data;
                    const scopeEl = resolveScope(scope);
                    let target = scopeEl;

                    if (selector && selector.trim()) {
                        const el = getElement(selector, selectorType || 'css', scopeEl);
                        if (!el) {
                            return { success: false, error: `Element not found: ${selector}` };
                        }
                        target = el;
                    }

                    const clickableTarget = findClickableElement(target);
                    const anchor = clickableTarget.tagName === 'A'
                        ? clickableTarget
                        : clickableTarget.closest('a') || (target.tagName === 'A' ? target : target.closest('a'));
                    const href = anchor ? (anchor as HTMLAnchorElement).href || anchor.getAttribute('href') : null;

                    return {
                        success: true,
                        data: {
                            href,
                            tagName: clickableTarget.tagName,
                            navigable: Boolean(href),
                        },
                    };
                }

                case 'ENV_HOVER': {
                    throwIfAborted();
                    const { selector, selectorType, scope } = msg.data;
                    const scopeEl = resolveScope(scope);
                    let target = scopeEl;

                    if (selector && selector.trim()) {
                        const el = getElement(selector, selectorType || 'css', scopeEl);
                        if (!el) throw new Error(`Element not found: ${selector}`);
                        target = el;
                    }

                    // Scroll into view first
                    (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(r => setTimeout(r, 150));
                    throwIfAborted(); // Check after async delay

                    // Modern sites often listen to pointer events or move events, not just mouseenter.
                    dispatchHoverSequence(target);

                    return { success: true };
                }

                case 'ENV_SWITCH_FRAME': {
                    const { target, timeout } = msg.data;
                    const startMs = Date.now();

                    // Wait for frame to be available
                    while (Date.now() - startMs < (timeout || 5000)) {
                        throwIfAborted();
                        const frames = window.frames;
                        let targetFrame: Window | null = null;

                        if (target === 'main' || target === 0) {
                            targetFrame = window; // Main window
                        } else if (typeof target === 'number') {
                            targetFrame = frames[target] || null;
                        } else if (typeof target === 'string') {
                            // Try to find by name or id
                            const frameElement = document.querySelector(`iframe[name="${target}"], iframe#${target}`);
                            if (frameElement) {
                                targetFrame = (frameElement as HTMLIFrameElement).contentWindow;
                            }
                        }

                        if (targetFrame) {
                            // SECURITY LIMITATION: Chrome extensions cannot switch execution context
                            // into iframes due to same-origin policy and security restrictions.
                            // We can only validate the frame exists. The caller must track frame
                            // context separately and route messages appropriately.
                            return buildSwitchFrameResult(target);
                        }

                        await new Promise(r => setTimeout(r, 100));
                    }

                    return { success: false, error: `Frame '${target}' not found within ${timeout || 5000}ms` };
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
                    throwIfAborted();
                    const { fields, scope } = msg.data;
                    const scopeEl = resolveScope(scope);
                    const result: Record<string, any> = {};

                    for (const field of (fields as DomExtractionField[])) {
                        throwIfAborted(); // Check before each field extraction
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
                                    throwIfAborted(); // Check in tight loop
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
                    const { selector, selectorType, scope, cleanupExisting = true } = msg.data;

                    // Clean up existing markers if requested
                    if (cleanupExisting) {
                        cleanupAllScopeMarkers();
                    }

                    const scopeEl = resolveScope(scope);
                    const el = selector && selector.trim()
                        ? getElement(selector, selectorType || 'css', scopeEl)
                        : scopeEl;
                    if (!el) {
                        return { success: false, error: `Scope element not found: ${selector}` };
                    }
                    // Generate unique scope ID and track it for cleanup
                    const scopeId = `__octo_scope_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    el.setAttribute('data-octo-scope', scopeId);
                    scopeMarkers.add(scopeId);
                    return {
                        success: true,
                        data: {
                            selector: `[data-octo-scope="${scopeId}"]`,
                            selectorType: 'css',
                            index: 0,
                            scopeId, // Return ID for potential targeted cleanup
                        }
                    };
                }

                case 'ENV_CLEANUP_SCOPES': {
                    const { scopeId } = msg.data;
                    if (scopeId) {
                        cleanupScopeMarker(scopeId);
                    } else {
                        cleanupAllScopeMarkers();
                    }
                    return { success: true };
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
                    const { selector, selectorType, scope, highlight = false } = msg.data;
                    if (!selector || !selector.trim()) {
                        clearTestHighlights();
                        return { success: true, data: { count: 0, elements: [] } };
                    }

                    try {
                        const scopeEl = resolveScope(scope);
                        const elements = getElements(selector, selectorType || 'css', scopeEl);

                        clearTestHighlights();

                        // Visually highlight matched elements on the page with a premium glowing outline overlay
                        if (highlight && elements.length > 0) {
                            if (!document.getElementById('octo-highlight-styles')) {
                                const style = document.createElement('style');
                                style.id = 'octo-highlight-styles';
                                style.textContent = `
                                    @keyframes octoPulseGlow {
                                        0% { box-shadow: 0 0 6px rgba(139, 92, 246, 0.45); border-color: rgba(139, 92, 246, 0.8); }
                                        50% { box-shadow: 0 0 16px rgba(139, 92, 246, 0.85); border-color: rgba(139, 92, 246, 1); }
                                        100% { box-shadow: 0 0 6px rgba(139, 92, 246, 0.45); border-color: rgba(139, 92, 246, 0.8); }
                                    }
                                    .octo-test-highlight {
                                        position: absolute;
                                        pointer-events: none;
                                        z-index: 2147483640;
                                        background-color: rgba(139, 92, 246, 0.08);
                                        border: 2px dashed #8b5cf6;
                                        border-radius: 4px;
                                        box-sizing: border-box;
                                        animation: octoPulseGlow 2s infinite ease-in-out;
                                        transition: top 0.1s ease, left 0.1s ease, width 0.1s ease, height 0.1s ease;
                                    }
                                `;
                                document.head.appendChild(style);
                            }

                            elements.forEach((el, index) => {
                                const htmlEl = el as HTMLElement;
                                const rect = htmlEl.getBoundingClientRect();
                                if (rect.width === 0 && rect.height === 0) return;

                                const overlay = document.createElement('div');
                                overlay.className = 'octo-test-highlight';
                                Object.assign(overlay.style, {
                                    top: `${rect.top + window.scrollY}px`,
                                    left: `${rect.left + window.scrollX}px`,
                                    width: `${rect.width}px`,
                                    height: `${rect.height}px`
                                });
                                document.body.appendChild(overlay);
                                testHighlightOverlays.push({ element: overlay, target: htmlEl });

                                if (index === 0) {
                                    htmlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            });

                            window.addEventListener('scroll', repositionTestHighlights, true);
                            window.addEventListener('resize', repositionTestHighlights, true);
                        }

                        const count = elements.length;
                        // Return info about first few matched elements (max 5)
                        const elementInfo = elements.slice(0, 5).map(el => {
                            const tag = el.tagName.toLowerCase();
                            const elId = el.id || '';
                            const classes = Array.from(el.classList).slice(0, 3).join(' ');
                            const textPreview = (el.textContent || '').trim().slice(0, 30);
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
                            return { tag, elId, classes, textPreview, isClickable, isInput, isVisible };
                        });
                        return { success: true, data: { count, elements: elementInfo } };
                    } catch (e: any) {
                        // Selector syntax error
                        return { success: true, data: { count: 0, elements: [], error: e.message } };
                    }
                }

                case 'ENV_CHECK_CLICKABLE': {
                    const { selector, selectorType, scope } = msg.data;
                    const scopeEl = resolveScope(scope);

                    let target: Element | null = null;
                    if (selector && selector.trim()) {
                        target = getElement(selector, selectorType || 'css', scopeEl);
                    }

                    if (!target) {
                        return { success: true, data: { exists: false, visible: false, enabled: false, clickable: false } };
                    }

                    // Visibility check
                    const cStyle = window.getComputedStyle(target);
                    const isFixedPos = cStyle.position === 'fixed' || cStyle.position === 'sticky';
                    const isVis = !!((isFixedPos || (target as HTMLElement).offsetParent !== null) &&
                        (target as HTMLElement).offsetWidth > 0 &&
                        (target as HTMLElement).offsetHeight > 0 &&
                        cStyle.visibility !== 'hidden' &&
                        cStyle.display !== 'none' &&
                        cStyle.opacity !== '0');

                    // Disabled check — covers <button disabled>, aria-disabled, and common CSS classes
                    const htmlEl = target as HTMLElement;
                    const isDisabled = !!(
                        htmlEl.hasAttribute('disabled') ||
                        htmlEl.getAttribute('aria-disabled') === 'true' ||
                        htmlEl.classList.contains('disabled') ||
                        htmlEl.classList.contains('is-disabled') ||
                        cStyle.pointerEvents === 'none'
                    );

                    const isClickable = isVis && !isDisabled;

                    return {
                        success: true,
                        data: { exists: true, visible: isVis, enabled: !isDisabled, clickable: isClickable }
                    };
                }

                case 'ENV_WAIT_NETWORK_IDLE': {
                    const { timeout, strict = false } = msg.data;
                    const monitor = (window as any).__octoGrabNetworkMonitor__;

                    if (!monitor) {
                        const fallbackMs = 1000;
                        console.warn(`[OctoGrab] NetworkMonitor not found. ${strict ? 'Failing' : 'Falling back'} to ${fallbackMs}ms delay`);

                        if (strict) {
                            return {
                                success: false,
                                error: 'NetworkMonitor not initialized. Cannot verify network idle state.',
                                data: { code: 'MONITOR_NOT_FOUND' }
                            };
                        }

                        await new Promise(r => setTimeout(r, fallbackMs));
                        return {
                            success: true,
                            message: 'Fallback delay used - network state unknown',
                            data: { fallbackDelayMs: fallbackMs, warning: 'Network state unknown' }
                        };
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
