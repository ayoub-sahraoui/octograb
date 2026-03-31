import { describe, expect, it } from 'vitest';
import { deriveExtractedColumns } from '../entrypoints/models/extracted-data';

describe('deriveExtractedColumns', () => {
    it('collects unique columns in encounter order', () => {
        expect(deriveExtractedColumns([
            { title: 'A', url: '/a' },
            { title: 'B', description: 'Desc' },
            { price: '$10', url: '/b' },
        ])).toEqual(['title', 'url', 'description', 'price']);
    });

    it('returns an empty list for empty rows', () => {
        expect(deriveExtractedColumns([])).toEqual([]);
    });
});
