import type { SelectorRole } from '@/entrypoints/models/selector-semantics';

export type SelectorFeedbackState = 'idle' | 'testing' | 'valid' | 'warning' | 'error';

export interface SelectorFeedbackSummary {
    title: string;
    tone: 'neutral' | 'success' | 'warning' | 'danger';
    nextStep?: string;
}

function getWarningNextStep(selectorRole?: SelectorRole, matchCount?: number): string {
    if (typeof matchCount === 'number' && matchCount > 1) {
        if (selectorRole === 'pagination-next') {
            return 'Pick one next-page control or refine the selector.';
        }
        return 'Pick the exact item you want or refine the selector.';
    }

    switch (selectorRole) {
        case 'loop-root':
            return 'Try picking the repeating card or row.';
        case 'pagination-next':
            return 'Pick the next-page control or refine the selector.';
        case 'scroll-target':
            return 'Pick the scrollable container or refine the selector.';
        case 'condition-target':
            return 'Pick the exact element you want to evaluate.';
        case 'assert-target':
            return 'Pick one stable element to assert against.';
        default:
            return 'Pick again or adjust the selector manually.';
    }
}

export function getSelectorFeedbackSummary(args: {
    validationState: SelectorFeedbackState;
    selectorRole?: SelectorRole;
    hasSpecificityWarning?: boolean;
    matchCount?: number;
}): SelectorFeedbackSummary {
    const { validationState, selectorRole, hasSpecificityWarning, matchCount } = args;

    if (validationState === 'testing') {
        return {
            title: 'Checking this selector',
            tone: 'neutral',
        };
    }

    if (validationState === 'valid') {
        return {
            title: 'Looks good',
            tone: 'success',
            nextStep: selectorRole === 'loop-root'
                ? 'You can keep this repeating-item selector.'
                : 'You can keep this selector.',
        };
    }

    if (validationState === 'error') {
        return {
            title: 'Not right yet',
            tone: 'danger',
            nextStep: 'Pick again or edit the selector path manually.',
        };
    }

    if (validationState === 'warning') {
        if (hasSpecificityWarning) {
            return {
                title: 'Needs a safer selector',
                tone: 'warning',
                nextStep: 'Refine the selector manually or pick a more general element.',
            };
        }

        if (typeof matchCount === 'number' && matchCount > 1) {
            return {
                title: 'Needs one exact match',
                tone: 'warning',
                nextStep: getWarningNextStep(selectorRole, matchCount),
            };
        }

        return {
            title: 'Needs attention',
            tone: 'warning',
            nextStep: getWarningNextStep(selectorRole, matchCount),
        };
    }

    return {
        title: 'Ready to test',
        tone: 'neutral',
        nextStep: 'Pick an element, adjust options, or paste a selector.',
    };
}
