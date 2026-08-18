import type { ExpectedElementType, SelectorCardinality, SelectorRole, SelectorContext } from '@/entrypoints/models/selector-semantics';

export interface SelectorPolicyElement {
    tag: string;
    isClickable: boolean;
    isInput: boolean;
    isVisible: boolean;
}

export interface SelectorPolicyResult {
    state: 'valid' | 'warning';
    message: string;
}

function getSingleTargetCopy(role?: SelectorRole): string {
    switch (role) {
        case 'click-target':
            return 'Choose one clickable item.';
        case 'pagination-next':
            return 'Choose one next-page button or link.';
        case 'input-target':
            return 'Choose one field to type into.';
        case 'scroll-target':
            return 'Choose one scroll container.';
        case 'condition-target':
            return 'Choose one element to evaluate.';
        case 'assert-target':
            return 'Choose one element to assert against.';
        case 'wait-target':
            return 'Choose one element to wait for.';
        case 'extract-scope':
            return 'Choose one container for this extraction scope.';
        default:
            return 'Choose one exact element.';
    }
}

function getMultipleTargetCopy(role?: SelectorRole, context?: SelectorContext): string {
    switch (role) {
        case 'loop-root':
            return 'Choose the repeating item container.';
        case 'condition-target':
            return 'Choose the set of elements you want to evaluate.';
        case 'extract-field':
            if (context === 'list-field') {
                return 'This field will be extracted once for each item. Pick an element inside the current card.';
            }
            if (context === 'scope-field') {
                return 'This field is extracted inside the selected scope.';
            }
            return 'This field selector usually works best inside the current item scope.';
        default:
            return 'Choose the set of repeated items.';
    }
}

export function evaluateSelectorPolicy(args: {
    count: number;
    elements: SelectorPolicyElement[];
    selectorCardinality: SelectorCardinality;
    selectorRole?: SelectorRole;
    expectedElement?: ExpectedElementType;
    selectorContext?: SelectorContext;
}): SelectorPolicyResult {
    const { count, elements, selectorCardinality, selectorRole, expectedElement = 'any', selectorContext } = args;

    if (count === 0) {
        return {
            state: 'warning',
            message: 'Nothing matched on this page.',
        };
    }

    if (selectorCardinality === 'single' && count > 1) {
        return {
            state: 'warning',
            message: `${getSingleTargetCopy(selectorRole)} This selector matches ${count} elements.`,
        };
    }

    if (selectorCardinality === 'multiple' && count === 1) {
        if (selectorContext === 'detail-field' || selectorContext === 'global-field') {
            // One match is perfectly fine for detail page fields and global fields, do not warn!
        } else {
            return {
                state: 'warning',
                message: `${getMultipleTargetCopy(selectorRole, selectorContext)} This selector only matches 1 item right now.`,
            };
        }
    }

    if ((selectorRole === 'click-target' || expectedElement === 'clickable') && elements.length > 0) {
        const nonClickable = elements.find(el => !el.isClickable);
        if (nonClickable) {
            return {
                state: 'warning',
                message: `This match is not clickable. Pick a link, button, or interactive element instead of <${nonClickable.tag}>.`,
            };
        }
    }

    if ((selectorRole === 'input-target' || expectedElement === 'input') && elements.length > 0) {
        const nonInput = elements.find(el => !el.isInput);
        if (nonInput) {
            return {
                state: 'warning',
                message: `This match is not a text field. Pick an input, textarea, or select instead of <${nonInput.tag}>.`,
            };
        }
    }

    if (elements.length > 0 && elements.every(el => !el.isVisible)) {
        return {
            state: 'warning',
            message: 'We found the element, but it is hidden right now.',
        };
    }

    if (selectorRole === 'extract-field') {
        switch (selectorContext) {
            case 'list-field':
                return {
                    state: 'valid',
                    message: 'Looks good. This field will be extracted once for each item. Pick an element inside the current card.',
                };
            case 'detail-field':
                return {
                    state: 'valid',
                    message: 'Looks good. This field is checked after OctoGrab opens the detail page. One match is usually correct.',
                };
            case 'global-field':
                return {
                    state: 'valid',
                    message: 'Looks good. This field is extracted from the whole current page.',
                };
            case 'scope-field':
                return {
                    state: 'valid',
                    message: 'Looks good. This field is extracted inside the selected scope.',
                };
        }
    }

    if (selectorCardinality === 'single') {
        if (selectorRole === 'click-target' || expectedElement === 'clickable') {
            return { state: 'valid', message: 'Looks good. One clickable element matched.' };
        }
        if (selectorRole === 'input-target' || expectedElement === 'input') {
            return { state: 'valid', message: 'Looks good. One input field matched.' };
        }
        if (selectorRole === 'pagination-next') {
            return { state: 'valid', message: 'Looks good. One next-page control matched.' };
        }
        if (selectorRole === 'scroll-target') {
            return { state: 'valid', message: 'Looks good. One scroll container matched.' };
        }
        if (selectorRole === 'assert-target') {
            return { state: 'valid', message: 'Looks good. One assertion target matched.' };
        }
        if (selectorRole === 'condition-target') {
            return { state: 'valid', message: 'Looks good. One condition target matched.' };
        }
        return { state: 'valid', message: 'Looks good. One exact element matched.' };
    }

    if (selectorCardinality === 'multiple') {
        if (selectorRole === 'condition-target') {
            return {
                state: 'valid',
                message: `Looks good. ${count} condition target${count === 1 ? '' : 's'} matched.`,
            };
        }
        return {
            state: 'valid',
            message: `Looks good. ${count} repeating item${count === 1 ? '' : 's'} matched.`,
        };
    }

    return {
        state: 'valid',
        message: count === 1 ? 'Looks good. One element matched.' : `Looks good. ${count} elements matched.`,
    };
}
