/**
 * DOM Snapshot — Creates a clean, minimal HTML representation of the page
 * for the AI agent to analyze. Outputs actual HTML that the LLM can read
 * and derive CSS selectors from naturally.
 *
 * Runs in the content script context.
 */

// ─── Configuration ───────────────────────────────────────────────────────────

const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'CIRCLE', 'RECT', 'LINE',
    'POLYGON', 'POLYLINE', 'ELLIPSE', 'DEFS', 'CLIPPATH', 'LINEARGRADIENT',
    'RADIALGRADIENT', 'STOP', 'USE', 'SYMBOL', 'G', 'TSPAN',
    'META', 'LINK', 'WBR', 'IFRAME', 'OBJECT', 'EMBED', 'CANVAS',
    'VIDEO', 'AUDIO', 'SOURCE', 'TRACK', 'MAP', 'AREA',
]);

const KEEP_ATTRS = new Set([
    'id', 'class', 'href', 'src', 'alt', 'title', 'type', 'name', 'value',
    'placeholder', 'role', 'aria-label', 'data-testid', 'data-id', 'data-type',
    'action', 'for', 'target',
]);

const MAX_TEXT_LENGTH = 60;
const MAX_ATTR_LENGTH = 100;
const MAX_CLASSES = 4;
const MAX_CHILDREN_PER_NODE = 40;
const MAX_DEPTH = 10;
const MAX_OUTPUT_CHARS = 30000; // ~7500 tokens — cap to avoid blowing context
const MAX_REPEATED_SIBLINGS = 3; // Show first N of repeated structures, then "<!-- +N more -->"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DomSnapshot {
    url: string;
    title: string;
    html: string;
    meta: {
        totalElements: number;
        snapshotElements: number;
        truncated: boolean;
        outputChars: number;
    };
}

// ─── State ───────────────────────────────────────────────────────────────────

let _nodeCount = 0;
let _output = '';
let _truncated = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isVisible(el: Element): boolean {
    try {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (style.opacity === '0') return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return true;
    } catch {
        return true;
    }
}

function cleanClasses(raw: string): string {
    if (!raw || typeof raw !== 'string') return '';
    const parts = raw.trim().split(/\s+/).filter(c => c.length > 0 && c.length < 60);
    if (parts.length === 0) return '';
    return parts.slice(0, MAX_CLASSES).join(' ');
}

function getDirectText(el: Element): string {
    let text = '';
    for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            const t = (child.textContent || '').trim();
            if (t) text += (text ? ' ' : '') + t;
        }
    }
    return text.substring(0, MAX_TEXT_LENGTH).trim();
}

function buildAttrs(el: Element): string {
    const parts: string[] = [];
    for (const attr of Array.from(el.attributes)) {
        if (!KEEP_ATTRS.has(attr.name) && !attr.name.startsWith('data-')) continue;
        let val = attr.value.trim();
        if (!val) continue;
        if (attr.name === 'class') {
            val = cleanClasses(val);
            if (!val) continue;
        }
        if (val.length > MAX_ATTR_LENGTH) val = val.substring(0, MAX_ATTR_LENGTH) + '…';
        parts.push(`${attr.name}="${val}"`);
    }
    return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

// ─── Serializer ──────────────────────────────────────────────────────────────

function serializeNode(el: Element, depth: number, indent: string): void {
    if (_truncated) return;
    if (_output.length >= MAX_OUTPUT_CHARS) { _truncated = true; return; }
    if (depth > MAX_DEPTH) return;
    if (SKIP_TAGS.has(el.tagName)) return;
    if (!isVisible(el)) return;

    _nodeCount++;

    const tag = el.tagName.toLowerCase();
    const attrs = buildAttrs(el);
    const directText = getDirectText(el);
    const childElements = Array.from(el.children);

    // Self-closing tags
    if (['img', 'input', 'br', 'hr'].includes(tag)) {
        _output += `${indent}<${tag}${attrs} />\n`;
        return;
    }

    // Leaf node (no element children) — inline
    if (childElements.length === 0) {
        const text = directText || (el as HTMLElement).innerText?.trim().substring(0, MAX_TEXT_LENGTH) || '';
        if (!text && !attrs) return; // Skip completely empty invisible nodes
        _output += `${indent}<${tag}${attrs}>${text}</${tag}>\n`;
        return;
    }

    // Node with children — detect repeated siblings and collapse
    _output += `${indent}<${tag}${attrs}>`;
    if (directText) _output += directText;
    _output += '\n';

    const childIndent = indent + '  ';
    const signatureCounts = new Map<string, number>();
    const signatureElements = new Map<string, Element[]>();

    // Group children by structural signature (tag + first few class names)
    for (const child of childElements.slice(0, MAX_CHILDREN_PER_NODE)) {
        const childTag = child.tagName.toLowerCase();
        const childCls = cleanClasses(child.className || '').split(' ').slice(0, 2).join(' ');
        const sig = `${childTag}.${childCls}`;
        signatureCounts.set(sig, (signatureCounts.get(sig) || 0) + 1);
        if (!signatureElements.has(sig)) signatureElements.set(sig, []);
        signatureElements.get(sig)!.push(child);
    }

    // Serialize children, collapsing repeated structures
    const renderedSigs = new Map<string, number>();
    for (const child of childElements.slice(0, MAX_CHILDREN_PER_NODE)) {
        if (_truncated) break;

        const childTag = child.tagName.toLowerCase();
        const childCls = cleanClasses(child.className || '').split(' ').slice(0, 2).join(' ');
        const sig = `${childTag}.${childCls}`;
        const total = signatureCounts.get(sig) || 1;
        const rendered = renderedSigs.get(sig) || 0;

        if (total > MAX_REPEATED_SIBLINGS && rendered >= MAX_REPEATED_SIBLINGS) {
            if (rendered === MAX_REPEATED_SIBLINGS) {
                _output += `${childIndent}<!-- ...${total - MAX_REPEATED_SIBLINGS} more ${childTag} items -->\n`;
                renderedSigs.set(sig, rendered + 1);
            }
            continue;
        }

        renderedSigs.set(sig, rendered + 1);
        serializeNode(child, depth + 1, childIndent);
    }

    _output += `${indent}</${tag}>\n`;
}

/**
 * Create a clean minimal HTML snapshot of the current page DOM.
 * Outputs real HTML that the LLM can read to understand selectors.
 * Collapses repeated structures (e.g., product cards) to save tokens.
 */
export function createDomSnapshot(): DomSnapshot {
    _nodeCount = 0;
    _output = '';
    _truncated = false;
    const totalElements = document.querySelectorAll('*').length;

    const bodyChildren = Array.from(document.body.children);
    for (const child of bodyChildren) {
        if (_truncated) break;
        serializeNode(child, 0, '');
    }

    // Final truncation guard
    if (_output.length > MAX_OUTPUT_CHARS) {
        _output = _output.substring(0, MAX_OUTPUT_CHARS) + '\n<!-- TRUNCATED -->\n';
        _truncated = true;
    }

    return {
        url: window.location.href,
        title: document.title,
        html: _output,
        meta: {
            totalElements,
            snapshotElements: _nodeCount,
            truncated: _truncated,
            outputChars: _output.length,
        },
    };
}

/**
 * Test extraction — runs a mini extract_scope simulation on the page.
 * Given a loop selector and field definitions, returns a sample of extracted data.
 * This lets the AI agent verify its blueprint will work before saving.
 */
export function testExtraction(
    loopSelector: string,
    fields: { key: string; selector: string; attribute: string }[],
    maxItems: number = 5
): { count: number; sample: Record<string, string>[]; errors: string[] } {
    const errors: string[] = [];
    let scopeElements: Element[];

    try {
        scopeElements = Array.from(document.querySelectorAll(loopSelector));
    } catch (e: any) {
        return { count: 0, sample: [], errors: [`Invalid loop selector "${loopSelector}": ${e.message}`] };
    }

    if (scopeElements.length === 0) {
        return { count: 0, sample: [], errors: [`Loop selector "${loopSelector}" matched 0 elements`] };
    }

    const sample: Record<string, string>[] = [];
    for (const scopeEl of scopeElements.slice(0, maxItems)) {
        const row: Record<string, string> = {};
        for (const field of fields) {
            try {
                const target = scopeEl.querySelector(field.selector);
                if (!target) {
                    row[field.key] = '(not found)';
                    continue;
                }
                const attr = field.attribute || 'text';
                if (attr === 'text') {
                    row[field.key] = ((target as HTMLElement).innerText || '').trim().substring(0, 200);
                } else if (attr === 'innerHTML') {
                    row[field.key] = target.innerHTML.substring(0, 200);
                } else {
                    row[field.key] = (target.getAttribute(attr) || '').substring(0, 200);
                }
            } catch (e: any) {
                row[field.key] = `(error: ${e.message})`;
                errors.push(`Field "${field.key}" with selector "${field.selector}": ${e.message}`);
            }
        }
        sample.push(row);
    }

    return { count: scopeElements.length, sample, errors };
}

/**
 * Query elements matching a selector and return preview info for the AI agent.
 */
export function queryElementPreview(
    selector: string,
    selectorType: 'css' | 'xpath' = 'css',
    maxResults: number = 5
): { count: number; previews: any[]; error?: string } {
    try {
        let elements: Element[];

        if (selectorType === 'xpath') {
            elements = [];
            const result = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for (let i = 0; i < result.snapshotLength; i++) {
                const node = result.snapshotItem(i);
                if (node instanceof Element) elements.push(node);
            }
        } else {
            elements = Array.from(document.querySelectorAll(selector));
        }

        const previews = elements.slice(0, maxResults).map((el, i) => ({
            index: i,
            tag: el.tagName.toLowerCase(),
            id: el.getAttribute('id') || undefined,
            classes: el.className && typeof el.className === 'string'
                ? el.className.trim().split(/\s+/).slice(0, 5).join(' ')
                : undefined,
            text: ((el as HTMLElement).innerText || '').trim().substring(0, 100),
            href: el.getAttribute('href') || undefined,
            src: el.getAttribute('src') || undefined,
            visible: isVisible(el),
            childCount: el.children.length,
        }));

        return { count: elements.length, previews };
    } catch (e: any) {
        return { count: 0, previews: [], error: e.message };
    }
}
