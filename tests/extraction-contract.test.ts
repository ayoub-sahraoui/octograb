import { describe, it, expect } from 'vitest';
import { SelectorType } from '../entrypoints/models/selector';
import type { ExtractionField as ModelExtractionField } from '../entrypoints/models/extract-scope-block';
import { TransformerType } from '../entrypoints/models/transformer';
import { toDomExtractionField } from '../core/extraction-contract';

describe('extraction contract adapter', () => {
    it('should adapt an extracted model field into the DOM extraction payload', () => {
        const modelField: ModelExtractionField = {
            id: 'field-1',
            key: 'price',
            label: 'Price',
            selector: { type: SelectorType.CSS, value: '.price' },
            attribute: 'text',
            transformers: [{ type: TransformerType.Trim }, { type: TransformerType.ParseNumber }],
            required: true,
            multiple: false,
            mode: 'extracted'
        };

        expect(toDomExtractionField(modelField)).toEqual({
            key: 'price',
            selector: '.price',
            selectorType: 'css',
            attribute: 'text',
            transformers: [{ type: 'trim' }, { type: 'parse_number' }],
            required: true,
            multiple: false
        });
    });

    it('should omit editor-only extraction properties from the DOM payload', () => {
        const modelField: ModelExtractionField = {
            id: 'field-2',
            key: 'normalizedPrice',
            label: 'Normalized Price',
            selector: { type: SelectorType.CSS, value: '.price' },
            attribute: 'text',
            transformers: [{ type: TransformerType.Trim }],
            required: false,
            defaultValue: '0',
            multiple: true,
            mode: 'static',
            formula: '{{price}} * 1.2',
            staticType: 'constant',
            staticValue: 'fallback',
            staticMin: 1,
            staticMax: 10,
            staticDateFormat: 'YYYY-MM-DD',
            staticStartFrom: 5
        };

        expect(toDomExtractionField(modelField)).toEqual({
            key: 'normalizedPrice',
            selector: '.price',
            selectorType: 'css',
            attribute: 'text',
            transformers: [{ type: 'trim' }],
            required: false,
            multiple: true
        });
    });
});
