/**
 * AI Selector Optimizer — Analyzes selectors and suggests generic alternatives
 * for use in loop contexts. Detects overly specific selectors like:
 * - Text-based XPath: //a[normalize-space()='Specific Text']
 * - Unique IDs: #specific-id
 * - Exact attributes: [data-testid="unique-123"]
 * And suggests class-based, structural, or tag-based alternatives.
 */

import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createChatModel, type ProviderId } from './providers';

export interface SelectorOptimization {
  originalSelector: string;
  selectorType: 'css' | 'xpath';
  suggestedSelector: string;
  suggestedXPath: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface SelectorOptimizerResult {
  optimization?: SelectorOptimization;
  error?: string;
}

const SELECTOR_OPTIMIZER_PROMPT = `You are a web scraping expert specializing in CSS selectors.
Analyze the provided selector and suggest a more generic version suitable for use in a LOOP CONTEXT.

## Problem
When extracting data from multiple items (like product listings), selectors should:
1. Work for ALL items, not just one specific item
2. Avoid unique identifiers (IDs, specific text content, unique data attributes)
3. Prefer class-based, structural, or semantic selectors

## Selector Types to Detect and Fix

1. **Text-based XPath (BAD for loops)** → Convert to CSS
   - Bad: //a[normalize-space()='Specific Text']
   - Good CSS: a.product-title

2. **Unique IDs (BAD for loops)**
   - Bad: #product-12345
   - Good: .product-card

3. **Exact unique attributes (BAD for loops)**
   - Bad: [data-testid='specific-item-uuid']
   - Good: [data-testid] or .item-class

4. **Position-based nth-child (fragile)**
   - Bad: div:nth-child(3)
   - Good: div.item-class

## Output Format
Return ONLY valid JSON (no markdown, no code fences):
{
  "suggestedSelector": "improved-css-selector",
  "suggestedXPath": "improved-xpath-expression",
  "explanation": "Brief explanation of what was changed and why",
  "confidence": "high|medium|low"
}

## CRITICAL RULES FOR suggestedSelector (CSS)
- MUST be a valid CSS selector. CSS syntax uses: dots (.class), hashes (#id), brackets ([attr="val"]), colons (:pseudo), combinators (>, +, ~, space).
- NEVER use XPath syntax in suggestedSelector. XPath uses: //, contains(), @attr, or, and, normalize-space(). These are INVALID in CSS.
- NEVER use "or" keyword in CSS. CSS does not have "or". To match multiple conditions, use comma-separated selectors or :is() pseudo-class.
  - Bad: button[class*='next' or aria-label='Next']
  - Good: button.next, button[aria-label="Next"]  (two separate selectors)
  - Good: :is(button.next, button[aria-label="Next"])
- For "contains class" in CSS, use [class*="partial"] or .exact-class — NOT contains(@class, ...) which is XPath.
- suggestedSelector must be relative-friendly, no unique IDs.

## CRITICAL RULES FOR suggestedXPath
- suggestedXPath MUST be valid XPath syntax.
- XPath uses: //, contains(), @attr, and, or, normalize-space(), text(), etc.
- suggestedXPath is separate from suggestedSelector — never mix the two syntaxes.

Other rules:
- explanation: 1-2 sentences explaining the improvement
- confidence: "high" if clear improvement, "medium" if uncertain, "low" if no good alternative found`;

export async function optimizeSelector(
  provider: ProviderId,
  apiKey: string,
  model: string,
  selector: string,
  selectorType: 'css' | 'xpath',
): Promise<SelectorOptimizerResult> {
  try {
    const llm = await createChatModel(provider, apiKey, model);

    const userMsg = `Selector Type: ${selectorType.toUpperCase()}\nCurrent Selector: \`${selector}\`\n\nSuggest a more generic version suitable for looping through multiple items:`;

    const response = await llm.invoke([
      new SystemMessage(SELECTOR_OPTIMIZER_PROMPT),
      new HumanMessage(userMsg),
    ]);

    const content = typeof response.content === 'string' ? response.content : '';
    if (!content) return { error: 'Empty response from LLM.' };

    // Parse JSON response
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    let suggestedCSS = String(parsed.suggestedSelector || selector);
    const suggestedXP = String(parsed.suggestedXPath || selector);

    // Post-processing: sanitize CSS suggestion — catch XPath contamination
    suggestedCSS = sanitizeCssSelector(suggestedCSS, selector);

    return {
      optimization: {
        originalSelector: selector,
        selectorType,
        suggestedSelector: suggestedCSS,
        suggestedXPath: suggestedXP,
        explanation: String(parsed.explanation || 'No explanation provided'),
        confidence: (parsed.confidence as 'high' | 'medium' | 'low') || 'medium',
      },
    };
  } catch (e: any) {
    return { error: e.message || 'Failed to optimize selector.' };
  }
}

/**
 * Validate a CSS selector suggestion and fix common LLM mistakes.
 * If the suggestion contains XPath syntax, fall back to the original selector.
 */
function sanitizeCssSelector(css: string, fallback: string): string {
  // Detect XPath patterns that are invalid in CSS
  const xpathPatterns = [
    /^\/\//,                         // starts with //
    /contains\s*\(/,                 // contains() function
    /normalize-space\s*\(/,          // normalize-space()
    /\btext\s*\(\s*\)/,             // text()
    /\[@/,                           // [@attr] XPath attribute syntax
    /\bor\b/i,                       // "or" keyword (not valid in CSS)
    /\band\b/i,                      // "and" keyword (not valid in CSS)
  ];

  for (const pattern of xpathPatterns) {
    if (pattern.test(css)) {
      // XPath contamination detected — return original selector
      return fallback;
    }
  }

  return css;
}

/**
 * Quick client-side check if a selector looks overly specific.
 * This is used to show a warning in the UI before calling AI.
 */
export function isOverlySpecificSelector(selector: string, selectorType: 'css' | 'xpath'): boolean {
  const s = selector.toLowerCase();

  if (selectorType === 'xpath') {
    // Text-based XPath is overly specific
    if (s.includes('normalize-space()=') || s.includes('text()=')) return true;
    // Unique ID patterns
    if (s.includes('@id=') && /\d{3,}/.test(s)) return true;
    // Very specific paths with many levels
    if ((s.match(/\//g) || []).length > 6) return true;
  } else {
    // CSS unique ID
    if (s.includes('#') && /#\w*\d{3,}/.test(selector)) return true;
    // Unique data-testid patterns
    if (/data-testid=["']?[\w-]*\d{3,}/.test(s)) return true;
    // Very long complex selector
    if (s.length > 100 && s.split('>').length > 4) return true;
    // nth-child is fragile
    if (s.includes(':nth-child') || s.includes(':nth-of-type')) return true;
  }

  return false;
}
