/**
 * AI Selector Generator — Generates a CSS/XPath selector from a natural language description
 * of an element on the current page.
 *
 * Used from the blueprint builder UI when the user clicks "AI Extract" in selector inputs.
 */

import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createChatModel, type ProviderId } from './providers';
import { sendToContentScript } from '../messaging';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeneratedSelector {
    css: string;
    xpath: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface SelectorGeneratorResult {
    selector?: GeneratedSelector;
    error?: string;
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SELECTOR_GENERATOR_PROMPT = `You are a web scraping expert specializing in CSS and XPath selectors.
Given an HTML snapshot of a web page and a natural language description of an element, generate a selector that matches that element.

## Rules
- Return ONLY a valid JSON object. No explanation, no markdown, no code fences.
- Output format: { "css": "css-selector", "xpath": "xpath-expression", "description": "brief explanation", "confidence": "high|medium|low" }
- CSS selector must be valid CSS syntax (dots for classes, hashes for IDs, brackets for attributes)
- XPath must be valid XPath syntax (//, contains(), @attr, etc.)
- Prefer robust selectors: classes > structural > IDs (IDs can be dynamic)
- Avoid overly specific selectors with many nested levels
- If multiple elements match, the selector should find the intended one based on the description
- Confidence "high" = clear match, "medium" = multiple possibilities, "low" = uncertain

## CSS Selector Best Practices
- Use .class-name for classes (e.g., .btn-primary)
- Use #id only if stable/predictable (e.g., #submit-button)
- Use [attribute="value"] for attributes (e.g., [data-testid="cart-btn"])
- NEVER use :contains() in CSS — it's not valid CSS, only use it in XPath
- NEVER mix XPath syntax into CSS (no //, no @attr, no text())
- CSS examples: .add-to-cart, button.primary, #addCartBtn, [aria-label="Add to Cart"]

## XPath Best Practices  
- Use //tag[contains(text(),'partial') or contains(.,'partial')] for text matching
- Use //*[@attr="value"] for attribute matching (note the @ for attributes)
- Use .// prefix for relative selectors (scoped to parent)
- XPath examples: //button[contains(text(),'Add')], //*[@data-testid="cart"]`;

// ─── Main Function ───────────────────────────────────────────────────────────

export async function generateSelectorFromElement(
    provider: ProviderId,
    apiKey: string,
    model: string,
    elementInfo: {
        tag: string;
        id?: string;
        classes?: string;
        text?: string;
        attributes: Record<string, string>;
    },
    expectedElement?: 'clickable' | 'input' | 'any',
    abortSignal?: AbortSignal,
): Promise<SelectorGeneratorResult> {
    // Step 1: Get DOM snapshot from the content script
    const snapshotResponse = await sendToContentScript({
        type: 'ENV_DOM_SNAPSHOT',
    });

    if (!snapshotResponse.success || !snapshotResponse.data) {
        return { error: 'Failed to get page snapshot. Make sure you have a web page open.' };
    }

    const snapshot = snapshotResponse.data;
    const html = snapshot.html as string;

    if (!html || html.length < 50) {
        return { error: 'Page appears empty or content script not ready.' };
    }

    // Step 2: Build the user message
    let elementContext = '';
    if (expectedElement === 'clickable') {
        elementContext = 'The element should be clickable (button, link, or interactive element).\n';
    } else if (expectedElement === 'input') {
        elementContext = 'The element should be an input field (input, textarea, or select).\n';
    }

    // Build element attributes string
    const attrStr = Object.entries(elementInfo.attributes)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');

    // Truncate HTML if too large (keep ~15k chars for the LLM)
    const maxHtml = 15000;
    const trimmedHtml = html.length > maxHtml
        ? html.substring(0, maxHtml) + '\n<!-- TRUNCATED -->'
        : html;

    const userMessage = `Page: ${snapshot.url}
Title: ${snapshot.title}

Target Element:
Tag: <${elementInfo.tag}>
ID: ${elementInfo.id || '(none)'}
Classes: ${elementInfo.classes || '(none)'}
Text: ${elementInfo.text ? `"${elementInfo.text.substring(0, 100)}"` : '(none)'}
Attributes: ${attrStr || '(none)'}
${elementContext}
## HTML Snapshot
\`\`\`html
${trimmedHtml}
\`\`\`

Generate a robust selector for this element as JSON:
\`\`\``
    // Step 3: Call the LLM
    try {
        const llm = await createChatModel(provider, apiKey, model);

        const response = await llm.invoke([
            new SystemMessage(SELECTOR_GENERATOR_PROMPT),
            new HumanMessage(userMessage),
        ], { signal: abortSignal });

        const content = typeof response.content === 'string' ? response.content : '';

        if (!content) {
            return { error: 'LLM returned empty response.' };
        }

        // Parse the JSON response — strip code fences if present
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(jsonStr);

        if (!parsed.css || !parsed.xpath) {
            return { error: 'LLM returned invalid format (missing css or xpath).' };
        }

        return {
            selector: {
                css: String(parsed.css),
                xpath: String(parsed.xpath),
                description: String(parsed.description || ''),
                confidence: (parsed.confidence as 'high' | 'medium' | 'low') || 'medium',
            },
        };

    } catch (e: any) {
        if (e.message?.includes('429') || e.message?.includes('rate')) {
            return { error: 'Rate limited. Please wait a moment and try again.' };
        }
        if (e.message?.includes('401') || e.message?.includes('auth')) {
            return { error: 'Authentication failed. Check your API key in Settings.' };
        }
        return { error: e.message || 'Failed to generate selector.' };
    }
}
