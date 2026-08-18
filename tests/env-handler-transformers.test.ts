import { describe, expect, it } from 'vitest';
import { applyTransformers } from '../entrypoints/content/env-handler';

describe('content env transformer handling', () => {
    it('returns null when a regex extractGroup has no match', () => {
        const result = applyTransformers('<ul><li>Publisher: Barnes</li></ul>', [
            {
                type: 'regex',
                pattern: 'ISBN-13[\\s\\S]*?<span>(97[89][\\d-]+)<\\/span>',
                flags: 'i',
                extractGroup: 1,
            },
        ]);

        expect(result).toBeNull();
    });

    it('keeps replacement mode behavior when a regex does not match', () => {
        const value = 'No ISBN on this page';
        const result = applyTransformers(value, [
            {
                type: 'regex',
                pattern: 'ISBN-13',
                replacement: 'GTIN',
            },
        ]);

        expect(result).toBe(value);
    });
});
