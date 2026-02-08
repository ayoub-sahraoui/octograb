/**
 * Element Cache - Reduce redundant DOM queries
 */

export interface CacheEntry {
    selector: string;
    selectorType: 'css' | 'xpath';
    scopeHash: string;
    elements: Element[];
    timestamp: number;
}

export class ElementCache {
    private cache = new Map<string, CacheEntry>();
    private readonly TTL = 5000; // Cache for 5 seconds
    private readonly MAX_ENTRIES = 100;

    getCacheKey(selector: string, selectorType: string, scopeHash: string): string {
        return `${selectorType}:${selector}:${scopeHash}`;
    }

    getScopeHash(scope: any): string {
        if (!scope) return 'global';
        return `${scope.selector}:${scope.selectorType}:${scope.index}`;
    }

    get(selector: string, selectorType: 'css' | 'xpath', scope?: any): Element[] | null {
        const scopeHash = this.getScopeHash(scope);
        const key = this.getCacheKey(selector, selectorType, scopeHash);
        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }

        // Verify elements still in DOM
        const validElements = entry.elements.filter(el => document.contains(el));
        if (validElements.length !== entry.elements.length) {
            // Cache invalidated - elements removed from DOM
            this.cache.delete(key);
            return null;
        }

        return validElements;
    }

    set(selector: string, selectorType: 'css' | 'xpath', scope: any, elements: Element[]) {
        // Enforce max size
        if (this.cache.size >= this.MAX_ENTRIES) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        const scopeHash = this.getScopeHash(scope);
        const key = this.getCacheKey(selector, selectorType, scopeHash);

        this.cache.set(key, {
            selector,
            selectorType,
            scopeHash,
            elements,
            timestamp: Date.now()
        });
    }

    invalidate(selector?: string) {
        if (selector) {
            // Invalidate specific selector
            for (const [key, entry] of this.cache.entries()) {
                if (entry.selector === selector) {
                    this.cache.delete(key);
                }
            }
        } else {
            // Clear all
            this.cache.clear();
        }
    }

    invalidateAll() {
        this.cache.clear();
    }
}
