export type SelectorCardinality = 'single' | 'multiple' | 'any';

export function getSelectorCardinalityLabel(cardinality: SelectorCardinality): string {
    switch (cardinality) {
        case 'single':
            return 'Single target';
        case 'multiple':
            return 'Multiple targets';
        default:
            return 'Any match count';
    }
}

export function getSelectorCardinalityDescription(cardinality: SelectorCardinality): string {
    switch (cardinality) {
        case 'single':
            return 'This block acts on one element. If multiple match, runtime uses the first match.';
        case 'multiple':
            return 'This block is meant to work over a collection of matching elements.';
        default:
            return 'This block can work with either a single match or multiple matches.';
    }
}

export function getSelectorCardinalityWarning(
    cardinality: SelectorCardinality,
    count: number,
): string | null {
    if (cardinality === 'single' && count > 1) {
        return `Matched ${count} elements, but this block is single-target and will use only the first match.`;
    }

    if (cardinality === 'multiple' && count === 1) {
        return 'Only 1 element matched. This selector is configured as a multi-target selector.';
    }

    return null;
}
