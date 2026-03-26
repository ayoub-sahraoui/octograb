/**
 * AI Regex Helper — Generates regex patterns from natural language descriptions.
 * Lightweight single-shot LLM call used from the transformer UI.
 */

import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createChatModel, type ProviderId } from './providers';

export interface RegexSuggestion {
    pattern: string;
    flags: string;
    explanation: string;
    replacement?: string;
    extractGroup?: number;
}

export interface RegexHelperResult {
    suggestion?: RegexSuggestion;
    error?: string;
}

const REGEX_PROMPT = `You are a regex expert. Given a description of what the user wants to extract or transform from text, generate a single regex pattern.

Return ONLY a valid JSON object (no markdown, no code fences) with these fields:
{
  "pattern": "the_regex_pattern",
  "flags": "gi",
  "explanation": "Brief explanation of what this regex does",
  "extractGroup": 0,
  "replacement": ""
}

Rules:
- pattern: A valid JavaScript regex pattern string (properly escaped for JSON).
- flags: Appropriate regex flags (g for global, i for case-insensitive, m for multiline).
- extractGroup: Which capture group to extract (0 = full match, 1 = first group, etc). Only set if mode is "extract".
- replacement: Only set if the user wants to replace/transform. Use $1, $2 for back-references.
- Keep it simple and robust. Prefer common patterns.`;

export async function suggestRegex(
    provider: ProviderId,
    apiKey: string,
    model: string,
    description: string,
    mode: 'extract' | 'replace',
    sampleText?: string,
): Promise<RegexHelperResult> {
    try {
        const llm = await createChatModel(provider, apiKey, model);

        let userMsg = `Mode: ${mode}\nDescription: ${description}`;
        if (sampleText) {
            userMsg += `\nSample text: "${sampleText.substring(0, 200)}"`;
        }

        const response = await llm.invoke([
            new SystemMessage(REGEX_PROMPT),
            new HumanMessage(userMsg),
        ]);

        const content = typeof response.content === 'string' ? response.content : '';
        if (!content) return { error: 'Empty response from LLM.' };

        let jsonStr = content.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(jsonStr);
        return {
            suggestion: {
                pattern: String(parsed.pattern || ''),
                flags: String(parsed.flags || ''),
                explanation: String(parsed.explanation || ''),
                replacement: parsed.replacement !== undefined ? String(parsed.replacement) : undefined,
                extractGroup: typeof parsed.extractGroup === 'number' ? parsed.extractGroup : undefined,
            },
        };
    } catch (e: any) {
        return { error: e.message || 'Failed to generate regex.' };
    }
}
