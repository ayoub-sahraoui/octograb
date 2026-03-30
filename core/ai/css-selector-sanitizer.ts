export interface SelectorSanitizerElementInfo {
    tag: string;
    id?: string;
    classes?: string;
    attributes?: Record<string, string>;
}

export function sanitizeCssSelector(
    css: string,
    fallback: string,
    validate?: (selector: string) => boolean,
): string {
    const candidate = String(css || '').trim();

    if (!candidate) {
        return fallback;
    }

    const invalidPatterns = [
        /^\/\//,
        /contains\s*\(/i,
        /normalize-space\s*\(/i,
        /\btext\s*\(\s*\)/i,
        /\[@/,
        /::?contains\s*\(/i,
        /\bor\b/i,
        /\band\b/i,
    ];

    for (const pattern of invalidPatterns) {
        if (pattern.test(candidate)) {
            return fallback;
        }
    }

    if (validate && !validate(candidate)) {
        return fallback;
    }

    return candidate;
}

export function buildFallbackCssSelector(elementInfo: SelectorSanitizerElementInfo): string {
    const tag = (elementInfo.tag || 'div').toLowerCase();
    const id = (elementInfo.id || '').trim();
    if (id && looksStableId(id)) {
        return `#${escapeCssIdentifier(id)}`;
    }

    const semanticClasses = (elementInfo.classes || '')
        .split(/\s+/)
        .map(cls => cls.trim())
        .filter(Boolean)
        .filter(cls => !isUtilityClass(cls));

    if (semanticClasses.length > 0) {
        return `${tag}.${escapeCssIdentifier(semanticClasses[0])}`;
    }

    const attributes = elementInfo.attributes || {};
    for (const key of ['data-testid', 'data-test', 'aria-label', 'name', 'placeholder', 'type']) {
        const value = attributes[key];
        if (value && value.length < 80) {
            return `${tag}[${key}="${escapeAttributeValue(value)}"]`;
        }
    }

    return tag;
}

export function isValidCssSelector(selector: string): boolean {
    try {
        if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
            document.querySelector(selector);
            return true;
        }
    } catch {
        return false;
    }

    return hasBalancedSelectorSyntax(selector);
}

function looksStableId(id: string): boolean {
    return !/\d{4,}/.test(id) && !/[A-Fa-f0-9]{8,}/.test(id);
}

function escapeCssIdentifier(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function escapeAttributeValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function hasBalancedSelectorSyntax(selector: string): boolean {
    const pairs: Record<string, string> = { '[': ']', '(': ')' };
    const stack: string[] = [];
    let inString = false;
    let quote = '';
    let escaping = false;

    for (const char of selector) {
        if (inString) {
            if (escaping) {
                escaping = false;
                continue;
            }
            if (char === '\\') {
                escaping = true;
                continue;
            }
            if (char === quote) {
                inString = false;
                quote = '';
            }
            continue;
        }

        if (char === '"' || char === '\'') {
            inString = true;
            quote = char;
            continue;
        }

        if (pairs[char]) {
            stack.push(pairs[char]);
            continue;
        }

        if ((char === ']' || char === ')') && stack.pop() !== char) {
            return false;
        }
    }

    return !inString && stack.length === 0;
}

function isUtilityClass(className: string): boolean {
    return /^(p|m|w|h|text|bg|flex|grid|gap|items|justify|top|left|right|bottom|mt|mb|ml|mr|pt|pb|pl|pr)-/.test(className);
}
