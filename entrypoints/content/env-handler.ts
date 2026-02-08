import { registerRpcHandler, MessageResponse, Message } from '@/core/messaging';
import { resolveScope, getElement, getElements } from '@/core/dom-query';
import { ExtractionField } from '@/core/types';

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
                    const scopeEl = resolveScope(scope);
                    let target = scopeEl;
                    
                    if (selector) {
                        const el = getElement(selector, selectorType, scopeEl);
                        if (!el) throw new Error(`Element not found: ${selector}`);
                        target = el;
                    }
                    
                    // Scroll into view
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Click logic
                    if (openInNewTab) {
                        // Attempt to open in new tab
                        if (target.tagName === 'A') {
                            // Programmatic window.open
                            window.open((target as HTMLAnchorElement).href, '_blank');
                        } else {
                            // Try simulating click with modifier
                             const mouseEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                                ctrlKey: true,
                                metaKey: true
                            });
                            target.dispatchEvent(mouseEvent);
                        }
                    } else {
                        if (target instanceof HTMLElement) {
                            target.click();
                        } else {
                            // fallback for SVG etc
                            (target as any).click?.() || target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                        }
                    }
                    return { success: true };
                }

                case 'ENV_INPUT': {
                    const { selector, selectorType, value, scope } = msg.data;
                    const scopeEl = resolveScope(scope);
                    let target = scopeEl;
                    
                    if (selector) {
                         const el = getElement(selector, selectorType, scopeEl);
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
                        // Content editable?
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
                    if (selector) {
                         const el = getElement(selector, selectorType, scopeEl);
                         target = el || scopeEl; // If not found, fallback to scope or error?
                         if (!el && selector) throw new Error(`Element not found: ${selector}`);
                    }
                    
                    return { success: true, data: (target as HTMLElement).innerText?.trim() || '' };
                }

                case 'ENV_SCROLL': {
                    const { target, behavior, amount, selector, selectorType, scope } = msg.data;
                    
                    let scrollTarget: Element | Window = window;
                    
                    if (target === 'element') {
                        const scopeEl = resolveScope(scope);
                        if (selector) {
                             const el = getElement(selector, selectorType, scopeEl);
                             if (!el) throw new Error(`Scroll target element not found: ${selector}`);
                             scrollTarget = el;
                        } else {
                            // If scope is the element to scroll (e.g. a list container)
                            scrollTarget = scopeEl;
                        }
                    }

                    if (behavior === 'bottom') {
                        if (scrollTarget === window) {
                            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        } else {
                            const el = scrollTarget as Element;
                            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                        }
                    } else if (behavior === 'top') {
                         if (scrollTarget === window) {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                            const el = scrollTarget as Element;
                            el.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    } else if (behavior === 'pixels') {
                        if (scrollTarget === window) {
                            window.scrollBy({ top: amount || 0, behavior: 'smooth' });
                        } else {
                            (scrollTarget as Element).scrollBy({ top: amount || 0, behavior: 'smooth' });
                        }
                    }
                    
                    // Wait for scroll to likely complete? 
                    // Smooth scroll takes time. We return immediately and let Executor wait.
                    return { success: true };
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
                            // Use stored selector type or default to css for backward compatibility if needed, 
                            // but types say selectorType is optional (defaults to css logic usually).
                            // Wait, ExtractionField has selectorType? Yes, I added it.
                            const fieldType = field.selectorType || 'css'; 
                            
                            let el: Element | null = scopeEl;
                            if (fieldSelector) {
                                el = getElement(fieldSelector, fieldType, scopeEl);
                            }
                            
                            if (el) {
                                if (field.attribute === 'text') {
                                    value = (el as HTMLElement).innerText?.trim();
                                } else if (field.attribute === 'html') {
                                    value = el.innerHTML;
                                } else if (field.attribute === 'href' || field.attribute === 'src') {
                                    // Get absolute URL if possible
                                    value = (el as any)[field.attribute];
                                    if (!value) value = el.getAttribute(field.attribute);
                                } else {
                                    value = el.getAttribute(field.attribute);
                                }
                            }

                            // Apply Transformers
                            if (value && field.transformers) {
                                for (const transform of field.transformers) {
                                    if (typeof value !== 'string') value = String(value);
                                    
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
                                        case 'replace':
                                            if (transform.config?.searchValue) {
                                                value = value.replaceAll(transform.config.searchValue, transform.config.replaceValue || '');
                                            }
                                            break;
                                        case 'regex':
                                            if (transform.config?.regexPattern) {
                                                try {
                                                    const regex = new RegExp(transform.config.regexPattern, transform.config.regexFlags || 'g');
                                                    const match = value.match(regex);
                                                    if (match) {
                                                        value = match[0]; // Return first match or match group? Logic varies. 
                                                        // For simple extraction, returning the match is usually desired.
                                                        // Or should we support 'matchIndex'?
                                                    } else {
                                                        value = ''; // No match?
                                                    }
                                                } catch (e) {
                                                     console.warn('Invalid Regex', e);
                                                }
                                            }
                                            break;
                                    }
                                }
                            }

                        } catch (err) {
                            console.warn(`Failed to extract field ${key}`, err);
                        }
                        
                        // Default to null or empty string?
                        result[key] = value;
                    }
                    return { success: true, data: result };
                }

                case 'ENV_IS_VISIBLE': {
                    const { selector, selectorType, scope } = msg.data;
                    const scopeEl = resolveScope(scope);
                    
                    let target: Element | null = scopeEl;
                    if (selector) {
                         target = getElement(selector, selectorType, scopeEl);
                    }
                    
                    if (!target) return { success: true, data: false };
                    
                    // Visibility check
                    const isVisible = !!((target as HTMLElement).offsetParent !== null && 
                                       (target as HTMLElement).offsetWidth > 0 && 
                                       (target as HTMLElement).offsetHeight > 0 &&
                                       window.getComputedStyle(target).visibility !== 'hidden' &&
                                       window.getComputedStyle(target).display !== 'none');
                                       
                    return { success: true, data: isVisible };
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
