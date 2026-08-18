/**
 * Enhanced Error Handling - Provide actionable error messages
 */

export class ScraperError extends Error {
    constructor(
        message: string,
        public code: string,
        public recoverable: boolean = false,
        public context?: Record<string, any>
    ) {
        super(message);
        this.name = 'ScraperError';
    }

    getUserMessage(): string {
        const suggestions: Record<string, string> = {
            'CONTENT_SCRIPT_NOT_READY': '💡 Try refreshing the web page and running again.',
            'ELEMENT_NOT_FOUND': '💡 The page structure may have changed. Update your selector or wait longer for the page to load.',
            'NAVIGATION_TIMEOUT': '💡 The page is taking too long to load. Check your internet connection or increase timeout.',
            'SELECTOR_INVALID': '💡 Check your CSS or XPath selector syntax.',
            'EXTRACTION_FAILED': '💡 Verify the element exists and contains the expected data.',
            'CLICK_FAILED': '💡 Element may be hidden, disabled, or covered by another element.',
            'LOOP_ELEMENT_CHANGED': '💡 The page changed during iteration. Consider adding wait blocks or checking for dynamic content.'
        };

        const suggestion = suggestions[this.code] || '';
        return `${this.message}\n${suggestion}`;
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            recoverable: this.recoverable,
            context: this.context,
            userMessage: this.getUserMessage()
        };
    }
}

// Error factory functions
export const ScraperErrors = {
    contentScriptNotReady: () =>
        new ScraperError(
            'Content script not ready',
            'CONTENT_SCRIPT_NOT_READY',
            true
        ),

    elementNotFound: (selector: string, selectorType: string) =>
        new ScraperError(
            `Element not found: ${selector}`,
            'ELEMENT_NOT_FOUND',
            false,
            { selector, selectorType }
        ),

    navigationTimeout: (url: string, timeoutMs: number) =>
        new ScraperError(
            `Navigation timeout after ${timeoutMs}ms: ${url}`,
            'NAVIGATION_TIMEOUT',
            true,
            { url, timeoutMs }
        ),

    selectorInvalid: (selector: string, reason: string) =>
        new ScraperError(
            `Invalid selector: ${reason}`,
            'SELECTOR_INVALID',
            false,
            { selector, reason }
        ),

    extractionFailed: (field: string, reason: string) =>
        new ScraperError(
            `Failed to extract field "${field}": ${reason}`,
            'EXTRACTION_FAILED',
            false,
            { field, reason }
        ),

    clickFailed: (selector: string, reason: string) =>
        new ScraperError(
            `Failed to click element: ${reason}`,
            'CLICK_FAILED',
            true,
            { selector, reason }
        ),

    loopElementChanged: (expected: number, found: number) =>
        new ScraperError(
            `Element count changed during loop: expected ${expected}, found ${found}`,
            'LOOP_ELEMENT_CHANGED',
            true,
            { expected, found }
        )
};
