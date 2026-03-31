/**
 * LangChain tool definitions for the OctoGrab AI Agent.
 * Each tool bridges an LLM tool call to the Chrome extension's content script
 * via the existing messaging layer.
 *
 * All tools include detailed console logging prefixed with [AI Tool].
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { sendToContentScript } from '@/core/messaging';
import { browser } from 'wxt/browser';
import { Blueprint } from '@/entrypoints/models/blueprint';
import { createBlockFromJSON } from '@/entrypoints/models/block-factory';
import { BlueprintValidator } from '@/entrypoints/models/blueprint-validator';
import { db } from '@/core/database';
import {
    clearPendingBlueprintForActiveConversation,
    getPendingBlueprintForActiveConversation,
    setPendingBlueprintForActiveConversation,
    setSavedBlueprintSignal,
} from './pending-blueprint-state';

const log = (tool: string, ...args: any[]) => console.log(`[AI Tool][${tool}]`, ...args);
const logError = (tool: string, ...args: any[]) => console.error(`[AI Tool][${tool}]`, ...args);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Truncate a string to a max length, appending ... if truncated */
function truncate(s: string, max: number): string {
    return s.length > max ? s.substring(0, max) + '…(truncated)' : s;
}

// ─── Page Analysis Tools ─────────────────────────────────────────────────────

export const analyzePageTool = tool(
    async () => {
        log('analyze_page', 'Requesting DOM snapshot from content script');
        const response = await sendToContentScript({ type: 'ENV_DOM_SNAPSHOT' });
        if (!response.success) {
            logError('analyze_page', 'Failed:', response.error);
            return `Error analyzing page: ${response.error}. Make sure you are on a web page (not a Chrome internal page).`;
        }
        const snap = response.data;
        log('analyze_page', `Success — url=${snap.url}, elements=${snap.meta.snapshotElements}, chars=${snap.meta.outputChars}, truncated=${snap.meta.truncated}`);
        // Return clean HTML + metadata header for the LLM
        const header = `Page: ${snap.url}\nTitle: ${snap.title}\nDOM elements: ${snap.meta.totalElements} (snapshot: ${snap.meta.snapshotElements}${snap.meta.truncated ? ', TRUNCATED' : ''})\n\n`;
        return truncate(header + snap.html, 32000);
    },
    {
        name: 'analyze_page',
        description: 'Get a clean HTML snapshot of the current page DOM. Returns simplified HTML with classes, IDs, attributes, and text — stripped of scripts, styles, and invisible elements. Repeated structures (e.g., product cards) are collapsed with "<!-- ...N more items -->" comments. Use this first to understand page structure and derive selectors.',
        schema: z.object({}),
    }
);

export const getPageUrlTool = tool(
    async () => {
        log('get_page_url', 'Getting active tab URL');
        try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            const url = tab?.url || 'unknown';
            log('get_page_url', 'URL:', url);
            return url;
        } catch (e: any) {
            logError('get_page_url', e.message);
            return `Error: ${e.message}`;
        }
    },
    {
        name: 'get_page_url',
        description: 'Get the URL of the current active tab. Lightweight alternative to analyze_page when you only need the URL.',
        schema: z.object({}),
    }
);

// ─── Selector Tools ──────────────────────────────────────────────────────────

export const querySelectorTool = tool(
    async ({ selector, selectorType, maxResults }) => {
        log('query_selector', `selector="${selector}", type=${selectorType || 'css'}, max=${maxResults || 5}`);
        const response = await sendToContentScript({
            type: 'ENV_QUERY_PREVIEW',
            data: { selector, selectorType: selectorType || 'css', maxResults: maxResults || 5 },
        });
        if (!response.success) {
            logError('query_selector', 'Failed:', response.error);
            return `Error querying selector "${selector}": ${response.error}`;
        }
        const data = response.data;
        log('query_selector', `Matched ${data.count} elements`);
        return JSON.stringify(data);
    },
    {
        name: 'query_selector',
        description: 'Test a CSS or XPath selector on the current page. Returns { count, previews[] } where each preview has: tag, id, classes, text, href, src, visible, childCount. Use this to verify selectors BEFORE including them in a blueprint. Call this multiple times to test different selectors.',
        schema: z.object({
            selector: z.string().describe('CSS or XPath selector to test'),
            selectorType: z.enum(['css', 'xpath']).optional().describe('Selector type, defaults to css'),
            maxResults: z.number().optional().describe('Max preview results, defaults to 5'),
        }),
    }
);

export const getElementTextTool = tool(
    async ({ selector, selectorType }) => {
        log('get_element_text', `selector="${selector}"`);
        const response = await sendToContentScript({
            type: 'ENV_GET_TEXT',
            data: { selector, selectorType: selectorType || 'css' },
        });
        if (!response.success) {
            logError('get_element_text', 'Failed:', response.error);
            return `Error getting text for "${selector}": ${response.error}`;
        }
        const text = (response.data as string).substring(0, 500);
        log('get_element_text', `Got ${text.length} chars`);
        return text;
    },
    {
        name: 'get_element_text',
        description: 'Get the text content of the first element matching a selector. Returns up to 500 characters.',
        schema: z.object({
            selector: z.string().describe('CSS or XPath selector'),
            selectorType: z.enum(['css', 'xpath']).optional().describe('Selector type, defaults to css'),
        }),
    }
);

export const getElementAttributeTool = tool(
    async ({ selector, attribute }) => {
        log('get_element_attribute', `selector="${selector}", attr="${attribute}"`);
        const response = await sendToContentScript({
            type: 'ENV_GET_ATTRIBUTE',
            data: { selector, attribute },
        });
        if (!response.success) {
            logError('get_element_attribute', 'Failed:', response.error);
            return `Error getting attribute "${attribute}" for "${selector}": ${response.error}`;
        }
        const val = String(response.data || '').substring(0, 500);
        log('get_element_attribute', `Got: "${val.substring(0, 80)}"`);
        return val;
    },
    {
        name: 'get_element_attribute',
        description: 'Get a specific attribute (href, src, data-*, etc.) of the first element matching a selector.',
        schema: z.object({
            selector: z.string().describe('CSS selector'),
            attribute: z.string().describe('Attribute name, e.g. "href", "src", "data-id"'),
        }),
    }
);

export const countElementsTool = tool(
    async ({ selector }) => {
        log('count_elements', `selector="${selector}"`);
        const response = await sendToContentScript({
            type: 'ENV_COUNT',
            data: { selector },
        });
        if (!response.success) {
            logError('count_elements', 'Failed:', response.error);
            return `Error counting "${selector}": ${response.error}`;
        }
        const count = response.data;
        log('count_elements', `Count: ${count}`);
        return `${count}`;
    },
    {
        name: 'count_elements',
        description: 'Count how many elements match a CSS selector. Returns just the number. Faster than query_selector when you only need the count.',
        schema: z.object({
            selector: z.string().describe('CSS selector to count'),
        }),
    }
);

// ─── Extraction Test Tool ────────────────────────────────────────────────────

export const testExtractionTool = tool(
    async ({ loopSelector, fields, maxItems }) => {
        log('test_extraction', `loop="${loopSelector}", fields=${fields.length}, maxItems=${maxItems || 5}`);
        const response = await sendToContentScript({
            type: 'ENV_TEST_EXTRACTION',
            data: { loopSelector, fields, maxItems: maxItems || 5 },
        });
        if (!response.success) {
            logError('test_extraction', 'Failed:', response.error);
            return `Error testing extraction: ${response.error}`;
        }
        const result = response.data;
        log('test_extraction', `Matched ${result.count} items, sample size ${result.sample.length}, errors: ${result.errors.length}`);

        // Quality analysis — flag bad fields so the LLM can fix them
        const badFields: string[] = [];
        if (result.sample && result.sample.length > 0) {
            const fieldKeys = fields.map(f => f.key);
            for (const key of fieldKeys) {
                const values = result.sample.map((row: any) => row[key] || '');
                const notFound = values.filter((v: string) => v === '(not found)').length;
                const empty = values.filter((v: string) => v.trim() === '').length;
                const garbage = values.filter((v: string) => /^[\s|,;:]+$/.test(v.trim())).length;
                const total = values.length;
                if (notFound > total / 2) badFields.push(`"${key}": selector not found in ${notFound}/${total} items — FIX THIS SELECTOR`);
                else if (empty > total / 2) badFields.push(`"${key}": empty in ${empty}/${total} items — selector might be wrong`);
                else if (garbage > total / 2) badFields.push(`"${key}": garbage data in ${garbage}/${total} items (e.g., "${values[0]}") — FIX THIS SELECTOR`);
            }
        }

        const output: any = { count: result.count, sample: result.sample, errors: result.errors };
        if (badFields.length > 0) {
            output.quality_issues = badFields;
            output.action_required = 'Fix the flagged selectors and call test_extraction again before creating the blueprint.';
            log('test_extraction', 'Quality issues:', badFields);
        }

        return truncate(JSON.stringify(output), 4000);
    },
    {
        name: 'test_extraction',
        description: `Test extraction BEFORE creating a blueprint. Simulates a loop_elements + extract_scope on the live page and returns sample data.
Provide the loop selector and field definitions. Returns { count, sample[], errors[] }.
Each field needs: key (column name), selector (CSS selector relative to the loop item), attribute ("text", "href", "src", etc.).
Use this to verify your selectors actually extract the right data before calling create_blueprint.`,
        schema: z.object({
            loopSelector: z.string().describe('CSS selector for the repeating items (what loop_elements would iterate over)'),
            fields: z.array(z.object({
                key: z.string().describe('Column name for the extracted data'),
                selector: z.string().describe('CSS selector relative to each loop item'),
                attribute: z.string().describe('What to extract: "text", "href", "src", "innerHTML", or any HTML attribute'),
            })).describe('Field definitions to extract from each item'),
            maxItems: z.number().optional().describe('Max sample items to return, defaults to 5'),
        }),
    }
);

// ─── Blueprint Tools ─────────────────────────────────────────────────────────

/**
 * Auto-fix common block structure mistakes before creating the blueprint.
 * Returns an array of fixes applied (for logging).
 */
function sanitizeBlocks(blocks: any[]): string[] {
    const fixes: string[] = [];

    function walkBlocks(blockList: any[], parentType?: string, parentSelector?: string) {
        for (const block of blockList) {
            // Fix 1: extract_scope inside loop_elements should NOT have scopeSelector matching the loop selector
            if (block.type === 'extract_scope' && parentType === 'loop_elements' && block.config?.scopeSelector) {
                const scopeSel = block.config.scopeSelector?.value || '';
                if (scopeSel && parentSelector && scopeSel === parentSelector) {
                    delete block.config.scopeSelector;
                    fixes.push(`Removed redundant scopeSelector "${scopeSel}" from extract_scope — loop already provides this scope`);
                }
            }

            // Fix 2: extract_scope inside loop_elements should not have resetScope: false (it's the default)
            if (block.type === 'extract_scope' && block.config?.resetScope === false) {
                delete block.config.resetScope;
                fixes.push('Removed unnecessary resetScope: false from extract_scope (it\'s the default)');
            }

            // Fix 3: Strip unnecessary "required: false" and "multiple: false" from fields (they're defaults)
            if (block.type === 'extract_scope' && block.config?.fields) {
                for (const field of block.config.fields) {
                    if (field.required === false) delete field.required;
                    if (field.multiple === false) delete field.multiple;
                }
            }

            // Get this block's selector for passing to children
            const thisSelector = block.config?.selector?.value || '';

            // Recurse into children
            if (block.children && block.children.length > 0) {
                walkBlocks(block.children, block.type, thisSelector);
            }
            if (block.elseChildren && block.elseChildren.length > 0) {
                walkBlocks(block.elseChildren, block.type, thisSelector);
            }
        }
    }

    walkBlocks(blocks);
    return fixes;
}

export const createBlueprintTool = tool(
    async ({ name, description, blocks }) => {
        log('create_blueprint', `name="${name}", blocks=${blocks.length}`);
        log('create_blueprint', 'Block JSON:', JSON.stringify(blocks).substring(0, 500));
        try {
            // Auto-fix common mistakes
            const fixes = sanitizeBlocks(blocks);
            if (fixes.length > 0) {
                log('create_blueprint', `Auto-fixed ${fixes.length} issues:`, fixes);
            }

            // Execution-aware validation checks (before creating)
            const structureWarnings: string[] = [];

            // Check: first block should be navigate
            if (blocks.length > 0 && blocks[0].type !== 'navigate') {
                structureWarnings.push('Blueprint should start with a "navigate" block so it can run independently.');
            }

            // Check: extract_scope should be inside a loop_elements or loop_pagination
            function checkExtractPlacement(blockList: any[], insideLoop: boolean) {
                for (const b of blockList) {
                    if (b.type === 'extract_scope' && !insideLoop) {
                        structureWarnings.push('extract_scope is at top level — it will only extract ONE row. Place it inside loop_elements for multiple rows.');
                    }
                    const isLoop = b.type === 'loop_elements' || b.type === 'loop_pagination';
                    if (b.children) checkExtractPlacement(b.children, insideLoop || isLoop);
                }
            }
            checkExtractPlacement(blocks, false);

            const blueprint = new Blueprint(name, description);
            for (const blockJson of blocks) {
                const block = createBlockFromJSON(blockJson);
                blueprint.addBlock(block);
            }

            const validator = new BlueprintValidator();
            const result = validator.validate(blueprint);

            // Merge structure warnings into validation warnings
            const allWarnings = [...result.warnings.map(w => w.message), ...structureWarnings];

            log('create_blueprint', `Created blueprint "${name}" (${blueprint.id}) — ${blueprint.blocks.length} blocks, valid=${result.valid}`);
            if (result.errors.length > 0) log('create_blueprint', 'Validation errors:', result.errors.map(e => e.message));
            if (allWarnings.length > 0) log('create_blueprint', 'Warnings:', allWarnings);
            if (fixes.length > 0) log('create_blueprint', 'Auto-fixes applied:', fixes);

            // Store the blueprint temporarily so save_blueprint can find it
            setPendingBlueprintForActiveConversation(blueprint);

            const resp: any = {
                blueprintId: blueprint.id,
                name: blueprint.name,
                blockCount: blueprint.blocks.length,
                validation: {
                    valid: result.valid,
                    errors: result.errors.map(e => e.message),
                    warnings: allWarnings,
                },
            };

            if (fixes.length > 0) {
                resp.autoFixes = fixes;
            }

            if (!result.valid) {
                resp.hint = 'Blueprint has validation errors. Fix the issues and try create_blueprint again with corrected blocks.';
            }

            return JSON.stringify(resp);
        } catch (e: any) {
            logError('create_blueprint', 'Error:', e.message, e.stack);
            return `Error creating blueprint: ${e.message}. Check your block JSON structure matches the schema.`;
        }
    },
    {
        name: 'create_blueprint',
        description: `Create a new blueprint from block JSON. Validates automatically and auto-fixes common mistakes.

IMPORTANT RULES:
1. ALWAYS start with a "navigate" block (first in the array)
2. extract_scope MUST be a child of loop_elements (never at top level)
3. extract_scope config should ONLY have "fields" — do NOT add "scopeSelector" or "resetScope" (the loop provides the scope automatically)
4. Field selectors inside extract_scope are RELATIVE to the loop item — use "h2", ".price", "a", NOT ".product-card h2"

EXAMPLE — simple list extraction with navigate:
[
  { "type": "navigate", "label": "Go to page", "config": { "url": "https://example.com", "behavior": "same_tab", "timeout": 30000 } },
  { "type": "loop_elements", "label": "Each product", "config": { "selector": { "type": "css", "value": ".product-card" }, "maxIterations": 50 }, "children": [
    { "type": "extract_scope", "label": "Extract data", "config": { "fields": [
      { "key": "title", "selector": { "type": "css", "value": ".name" }, "attribute": "text" },
      { "key": "price", "selector": { "type": "css", "value": ".price" }, "attribute": "text" }
    ] } }
  ] }
]`,
        schema: z.object({
            name: z.string().describe('Blueprint name'),
            description: z.string().describe('What this blueprint does'),
            blocks: z.array(z.any()).describe('Array of block JSON objects'),
        }),
    }
);

export const validateBlueprintTool = tool(
    async () => {
        log('validate_blueprint', 'Validating pending blueprint');
        const blueprint = getPendingBlueprintForActiveConversation();
        if (!blueprint) {
            log('validate_blueprint', 'No pending blueprint found');
            return 'No pending blueprint to validate. Create one first with create_blueprint.';
        }
        const validator = new BlueprintValidator();
        const result = validator.validate(blueprint);
        log('validate_blueprint', `valid=${result.valid}, errors=${result.errors.length}, warnings=${result.warnings.length}`);
        return JSON.stringify({
            valid: result.valid,
            errors: result.errors.map(e => e.message),
            warnings: result.warnings.map(w => w.message),
        });
    },
    {
        name: 'validate_blueprint',
        description: 'Validate the most recently created blueprint. Returns { valid, errors[], warnings[] }.',
        schema: z.object({}),
    }
);

export const saveBlueprintTool = tool(
    async () => {
        log('save_blueprint', 'Saving pending blueprint to database');
        const blueprint = getPendingBlueprintForActiveConversation();
        if (!blueprint) {
            logError('save_blueprint', 'No pending blueprint found!');
            return 'Error: No pending blueprint to save. Create one first with create_blueprint.';
        }

        try {
            // Actually persist to IndexedDB via the database layer
            const json = blueprint.toJSON();
            const plan: any = {
                meta: {
                    name: blueprint.name,
                    version: '1.0.0',
                    userAgent: navigator.userAgent,
                },
                variables: { baseUrl: '' },
                pipeline: json.blocks,
            };

            await db.savePlan({
                id: blueprint.id,
                name: blueprint.name,
                plan,
                updatedAt: new Date().toISOString(),
            });

            log('save_blueprint', `Saved blueprint "${blueprint.name}" (${blueprint.id}) to database`);

            // Signal the UI store to refresh
            setSavedBlueprintSignal({
                id: blueprint.id,
                name: blueprint.name,
                blockCount: blueprint.blocks.length,
            });

            // Clean up pending
            clearPendingBlueprintForActiveConversation();

            return JSON.stringify({
                success: true,
                message: `Blueprint "${blueprint.name}" saved successfully.`,
                blueprintId: blueprint.id,
                name: blueprint.name,
            });
        } catch (e: any) {
            logError('save_blueprint', 'Failed to save:', e.message, e.stack);
            return `Error saving blueprint: ${e.message}`;
        }
    },
    {
        name: 'save_blueprint',
        description: 'Save the pending blueprint to the user\'s database. Call this ONLY after the user confirms they want to save. The blueprint will appear in their blueprint list immediately.',
        schema: z.object({}),
    }
);

// ─── Export all tools ────────────────────────────────────────────────────────

export const ALL_TOOLS = [
    analyzePageTool,
    getPageUrlTool,
    querySelectorTool,
    getElementTextTool,
    getElementAttributeTool,
    countElementsTool,
    testExtractionTool,
    createBlueprintTool,
    validateBlueprintTool,
    saveBlueprintTool,
];
