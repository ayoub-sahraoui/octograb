import type { SelectorCardinality } from '@/entrypoints/models/selector-semantics';

export function getSelectorCardinalityLabel(cardinality: SelectorCardinality): string {
    switch (cardinality) {
        case 'single':
            return 'Choose one item';
        case 'multiple':
            return 'Choose repeating items';
        default:
            return 'Flexible match';
    }
}

export function getSelectorCardinalityDescription(cardinality: SelectorCardinality): string {
    switch (cardinality) {
        case 'single':
            return 'This step works best when you target one exact element.';
        case 'multiple':
            return 'This step should match the repeated items you want to loop over.';
        default:
            return 'This step can work with either one match or several matches.';
    }
}

export function getSelectorCardinalityWarning(
    cardinality: SelectorCardinality,
    count: number,
): string | null {
    if (cardinality === 'single' && count > 1) {
        return `Choose one exact item. This selector matches ${count} elements.`;
    }

    if (cardinality === 'multiple' && count === 1) {
        return 'This looks too narrow right now. A repeating-item selector should usually match more than one item.';
    }

    return null;
}
