import { describe, expect, it } from 'vitest';
import {
    getSelectorCardinalityDescription,
    getSelectorCardinalityLabel,
    getSelectorCardinalityWarning,
} from '../entrypoints/sidepanel/components/selector-cardinality';

describe('selector cardinality helpers', () => {
    it('labels selector expectations clearly', () => {
        expect(getSelectorCardinalityLabel('single')).toBe('Choose one item');
        expect(getSelectorCardinalityLabel('multiple')).toBe('Choose repeating items');
        expect(getSelectorCardinalityLabel('any')).toBe('Flexible match');
    });

    it('warns when a single-target selector matches multiple elements', () => {
        expect(getSelectorCardinalityWarning('single', 16)).toBe(
            'Choose one exact item. This selector matches 16 elements.',
        );
    });

    it('warns when a multi-target selector only matches one element', () => {
        expect(getSelectorCardinalityWarning('multiple', 1)).toBe(
            'This looks too narrow right now. A repeating-item selector should usually match more than one item.',
        );
    });

    it('describes the single-target runtime behavior', () => {
        expect(getSelectorCardinalityDescription('single')).toContain('target one exact element');
    });
});
