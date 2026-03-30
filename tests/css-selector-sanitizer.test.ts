import { describe, expect, it } from 'vitest';
import { buildFallbackCssSelector, sanitizeCssSelector } from '../core/ai/css-selector-sanitizer';

describe('css selector sanitizer', () => {
    it('falls back when xpath-like syntax is returned as css', () => {
        expect(sanitizeCssSelector('//button[contains(text(), "Next")]', 'button.next')).toBe('button.next');
    });

    it('falls back when validator rejects the css', () => {
        expect(sanitizeCssSelector('div[attr="value"', '.item', () => false)).toBe('.item');
    });

    it('builds fallback css from semantic classes first', () => {
        expect(buildFallbackCssSelector({
            tag: 'a',
            classes: 'product-title text-sm',
            attributes: {},
        })).toBe('a.product-title');
    });

    it('builds fallback css from stable attributes when no class exists', () => {
        expect(buildFallbackCssSelector({
            tag: 'input',
            attributes: {
                name: 'search',
            },
        })).toBe('input[name="search"]');
    });
});
