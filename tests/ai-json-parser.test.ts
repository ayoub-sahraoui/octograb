import { describe, expect, it } from 'vitest';
import { parseAiJson } from '../core/ai/parse-ai-json';

describe('parseAiJson', () => {
    it('parses fenced object responses', () => {
        expect(parseAiJson<{ css: string }>('```json\n{"css":".item"}\n```', 'object')).toEqual({
            css: '.item',
        });
    });

    it('extracts the first valid object from noisy text', () => {
        expect(parseAiJson<{ css: string; xpath: string }>(
            'Here is the result:\n{"css":".title","xpath":"//h2"}\nUse it carefully.',
            'object',
        )).toEqual({
            css: '.title',
            xpath: '//h2',
        });
    });

    it('extracts arrays from noisy responses', () => {
        expect(parseAiJson<Array<{ key: string }>>(
            'Suggested fields:\n[{"key":"title"},{"key":"price"}]\nDone.',
            'array',
        )).toEqual([
            { key: 'title' },
            { key: 'price' },
        ]);
    });

    it('throws a friendly error when no valid json is present', () => {
        expect(() => parseAiJson('not valid json at all', 'object')).toThrow('AI returned invalid object JSON.');
    });
});
