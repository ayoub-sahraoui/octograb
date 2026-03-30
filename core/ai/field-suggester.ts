/**
 * AI Field Suggester — Analyzes a page DOM snapshot and suggests
 * extraction fields for an extract_scope block.
 *
 * This is a lightweight, single-shot LLM call (not a full agent loop).
 * Used from the blueprint builder UI when the user clicks "Suggest Fields".
 */

import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createChatModel, type ProviderId } from './providers';
import { sendToContentScript } from '../messaging';
import { parseAiJson } from './parse-ai-json';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SuggestedField {
    key: string;
    label: string;
    selector: string;
    attribute: 'text' | 'href' | 'src' | 'value' | string;
    description: string;
}

export interface FieldSuggestionResult {
    fields: SuggestedField[];
    error?: string;
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

const FIELD_SUGGEST_PROMPT = `You are a web scraping expert. Given an HTML snapshot of a web page, analyze the structure and suggest extraction fields.

## Rules
- Return ONLY a valid JSON array of field objects. No explanation, no markdown, no code fences.
- Each field: { "key": "snake_case_name", "label": "Human Label", "selector": "css_selector", "attribute": "text|href|src|value", "description": "what this extracts" }
- Selectors must be RELATIVE to the scope element (do NOT repeat the scope/loop selector).
- Prefer short, robust selectors: classes > nth-child > tag combos.
- Only suggest fields that are clearly present in the HTML.
- Suggest 3-10 fields, covering the most useful data points.
- Common fields to look for: title/name, price, description, URL/link, image, rating, date, category, status.
- For links use attribute "href", for images use attribute "src", for most text use "text".
- Keys should be lowercase snake_case (e.g. "product_name", "price", "image_url").`;

// ─── Main Function ───────────────────────────────────────────────────────────

export async function suggestFields(
    provider: ProviderId,
    apiKey: string,
    model: string,
    scopeContext?: { loopSelector?: string; scopeSelector?: string },
    abortSignal?: AbortSignal,
): Promise<FieldSuggestionResult> {
    // Step 1: Get DOM snapshot from the content script
    const snapshotResponse = await sendToContentScript({
        type: 'ENV_DOM_SNAPSHOT',
    });

    if (!snapshotResponse.success || !snapshotResponse.data) {
        return { fields: [], error: 'Failed to get page snapshot. Make sure you have a web page open.' };
    }

    const snapshot = snapshotResponse.data;
    const html = snapshot.html as string;

    if (!html || html.length < 50) {
        return { fields: [], error: 'Page appears empty or content script not ready.' };
    }

    // Step 2: Build the context message
    let contextInfo = `Page: ${snapshot.url}\nTitle: ${snapshot.title}\n`;
    if (scopeContext?.loopSelector) {
        contextInfo += `\nThe fields will be extracted inside a loop over elements matching: \`${scopeContext.loopSelector}\`\n`;
        contextInfo += `Selectors should be RELATIVE to each loop item element.\n`;
    }
    if (scopeContext?.scopeSelector) {
        contextInfo += `Additional scope selector (within loop item): \`${scopeContext.scopeSelector}\`\n`;
    }

    // Truncate HTML if too large (keep ~15k chars for the LLM)
    const maxHtml = 15000;
    const trimmedHtml = html.length > maxHtml
        ? html.substring(0, maxHtml) + '\n<!-- TRUNCATED -->'
        : html;

    const userMessage = `${contextInfo}\n## HTML Snapshot\n\`\`\`html\n${trimmedHtml}\n\`\`\`\n\nSuggest extraction fields as a JSON array:`;

    // Step 3: Call the LLM
    try {
        const llm = await createChatModel(provider, apiKey, model);

        const response = await llm.invoke([
            new SystemMessage(FIELD_SUGGEST_PROMPT),
            new HumanMessage(userMessage),
        ], { signal: abortSignal });

        const content = typeof response.content === 'string' ? response.content : '';

        if (!content) {
            return { fields: [], error: 'LLM returned empty response.' };
        }

        // Parse the JSON response — strip code fences if present
        const parsed = parseAiJson<any[]>(content, 'array');

        if (!Array.isArray(parsed)) {
            return { fields: [], error: 'LLM returned invalid format (expected array).' };
        }

        // Validate and clean each field
        const fields: SuggestedField[] = parsed
            .filter((f: any) => f.key && f.selector)
            .map((f: any) => ({
                key: String(f.key).toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                label: String(f.label || f.key),
                selector: String(f.selector),
                attribute: String(f.attribute || 'text'),
                description: String(f.description || ''),
            }));

        return { fields };

    } catch (e: any) {
        if (e.message?.includes('429') || e.message?.includes('rate')) {
            return { fields: [], error: 'Rate limited. Please wait a moment and try again.' };
        }
        if (e.message?.includes('401') || e.message?.includes('auth')) {
            return { fields: [], error: 'Authentication failed. Check your API key in Settings.' };
        }
        return { fields: [], error: e.message || 'Failed to get AI suggestions.' };
    }
}
