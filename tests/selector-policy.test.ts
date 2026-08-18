import { describe, expect, it } from 'vitest';
import { evaluateSelectorPolicy } from '../entrypoints/sidepanel/components/selector-policy';

describe('selector policy', () => {
    it('asks for one clickable item when a click selector matches too many elements', () => {
        expect(evaluateSelectorPolicy({
            count: 6,
            elements: Array.from({ length: 6 }, () => ({
                tag: 'a',
                isClickable: true,
                isInput: false,
                isVisible: true,
            })),
            selectorCardinality: 'single',
            selectorRole: 'click-target',
            expectedElement: 'clickable',
        })).toEqual({
            state: 'warning',
            message: 'Choose one clickable item. This selector matches 6 elements.',
        });
    });

    it('rejects non-clickable matches for click selectors with simple copy', () => {
        expect(evaluateSelectorPolicy({
            count: 1,
            elements: [{
                tag: 'div',
                isClickable: false,
                isInput: false,
                isVisible: true,
            }],
            selectorCardinality: 'single',
            selectorRole: 'click-target',
            expectedElement: 'clickable',
        })).toEqual({
            state: 'warning',
            message: 'This match is not clickable. Pick a link, button, or interactive element instead of <div>.',
        });
    });

    it('explains loop selectors in user-friendly language when only one item matches', () => {
        expect(evaluateSelectorPolicy({
            count: 1,
            elements: [{
                tag: 'article',
                isClickable: false,
                isInput: false,
                isVisible: true,
            }],
            selectorCardinality: 'multiple',
            selectorRole: 'loop-root',
            expectedElement: 'any',
        })).toEqual({
            state: 'warning',
            message: 'Choose the repeating item container. This selector only matches 1 item right now.',
        });
    });

    it('returns positive block-aware success copy for good click selectors', () => {
        expect(evaluateSelectorPolicy({
            count: 1,
            elements: [{
                tag: 'button',
                isClickable: true,
                isInput: false,
                isVisible: true,
            }],
            selectorCardinality: 'single',
            selectorRole: 'click-target',
            expectedElement: 'clickable',
        })).toEqual({
            state: 'valid',
            message: 'Looks good. One clickable element matched.',
        });
    });

    it('uses pagination-specific guidance for next-page selectors', () => {
        expect(evaluateSelectorPolicy({
            count: 3,
            elements: Array.from({ length: 3 }, () => ({
                tag: 'a',
                isClickable: true,
                isInput: false,
                isVisible: true,
            })),
            selectorCardinality: 'single',
            selectorRole: 'pagination-next',
            expectedElement: 'clickable',
        })).toEqual({
            state: 'warning',
            message: 'Choose one next-page button or link. This selector matches 3 elements.',
        });
    });

    it('uses condition-specific guidance for count checks', () => {
        expect(evaluateSelectorPolicy({
            count: 1,
            elements: [{
                tag: 'div',
                isClickable: false,
                isInput: false,
                isVisible: true,
            }],
            selectorCardinality: 'multiple',
            selectorRole: 'condition-target',
            expectedElement: 'any',
        })).toEqual({
            state: 'warning',
            message: 'Choose the set of elements you want to evaluate. This selector only matches 1 item right now.',
        });
    });

    it('uses scroll-target success copy for a single visible scroll container', () => {
        expect(evaluateSelectorPolicy({
            count: 1,
            elements: [{
                tag: 'div',
                isClickable: false,
                isInput: false,
                isVisible: true,
            }],
            selectorCardinality: 'single',
            selectorRole: 'scroll-target',
            expectedElement: 'any',
        })).toEqual({
            state: 'valid',
            message: 'Looks good. One scroll container matched.',
        });
    });

    it('does not warn for single match with multiple cardinality in detail-field and global-field contexts', () => {
        expect(evaluateSelectorPolicy({
            count: 1,
            elements: [{
                tag: 'img',
                isClickable: false,
                isInput: false,
                isVisible: true,
            }],
            selectorCardinality: 'multiple',
            selectorRole: 'extract-field',
            selectorContext: 'detail-field',
        })).toEqual({
            state: 'valid',
            message: 'Looks good. This field is checked after OctoGrab opens the detail page. One match is usually correct.',
        });

        expect(evaluateSelectorPolicy({
            count: 1,
            elements: [{
                tag: 'h1',
                isClickable: false,
                isInput: false,
                isVisible: true,
            }],
            selectorCardinality: 'multiple',
            selectorRole: 'extract-field',
            selectorContext: 'global-field',
        })).toEqual({
            state: 'valid',
            message: 'Looks good. This field is extracted from the whole current page.',
        });
    });

    it('gives loop-scoped warning copy for list-field when matching 1 item', () => {
        expect(evaluateSelectorPolicy({
            count: 1,
            elements: [{
                tag: 'span',
                isClickable: false,
                isInput: false,
                isVisible: true,
            }],
            selectorCardinality: 'multiple',
            selectorRole: 'extract-field',
            selectorContext: 'list-field',
        })).toEqual({
            state: 'warning',
            message: 'This field will be extracted once for each item. Pick an element inside the current card. This selector only matches 1 item right now.',
        });
    });
});
