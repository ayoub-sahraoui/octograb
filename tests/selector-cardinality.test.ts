import { describe, expect, it } from 'vitest';
import {
    getSelectorCardinalityDescription,
    getSelectorCardinalityLabel,
    getSelectorCardinalityWarning,
} from '../entrypoints/sidepanel/components/selector-cardinality';

describe('selector cardinality helpers', () => {
    it('labels selector expectations clearly', () => {
        expect(getSelectorCardinalityLabel('single')).toBe('Single target');
        expect(getSelectorCardinalityLabel('multiple')).toBe('Multiple targets');
        expect(getSelectorCardinalityLabel('any')).toBe('Any match count');
    });

    it('warns when a single-target selector matches multiple elements', () => {
        expect(getSelectorCardinalityWarning('single', 16)).toBe(
            'Matched 16 elements, but this block is single-target and will use only the first match.',
        );
    });

    it('warns when a multi-target selector only matches one element', () => {
        expect(getSelectorCardinalityWarning('multiple', 1)).toBe(
            'Only 1 element matched. This selector is configured as a multi-target selector.',
        );
    });

    it('describes the single-target runtime behavior', () => {
        expect(getSelectorCardinalityDescription('single')).toContain('uses the first match');
    });
});
