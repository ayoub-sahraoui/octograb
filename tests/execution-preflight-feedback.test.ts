import { describe, expect, it } from 'vitest';
import { buildSelectorPreflightFeedback } from '../entrypoints/models/execution-preflight-feedback';

describe('execution preflight feedback', () => {
    it('formats a multi-match selector issue into a friendlier action-oriented message', () => {
        const feedback = buildSelectorPreflightFeedback([
            'Loop > Open detail: selector ".buy-now" should match one element but matched 3.',
        ]);

        expect(feedback.title).toBe('Pick one exact element');
        expect(feedback.affectedPath).toBe('Loop > Open detail');
        expect(feedback.summary).toContain('matches more than one element');
        expect(feedback.suggestedAction).toContain('choose one exact clickable element');
    });

    it('formats a detail-page missing selector issue with detail-specific guidance', () => {
        const feedback = buildSelectorPreflightFeedback([
            'Loop > Open detail > Extract detail > Title: selector ".title" matched no elements on the detail page.',
        ], ['Loop > Open detail: could not restore the original page after detail preflight.']);

        expect(feedback.title).toBe('Detail page element not found');
        expect(feedback.affectedPath).toBe('Loop > Open detail > Extract detail > Title');
        expect(feedback.details).toHaveLength(2);
        expect(feedback.suggestedAction).toContain('detail block');
    });

    it('explains sequential same-tab detail flow failures without leading with raw selector text', () => {
        const feedback = buildSelectorPreflightFeedback([
            'Loop Elements > Click title > Extract detail > URL image 1: selector ".detail-image" matched no elements on the detail page after opening the detail page from a same-tab click/detail/go-back flow.',
        ]);

        expect(feedback.title).toBe('Detail page field not found');
        expect(feedback.problem).toContain('URL image 1');
        expect(feedback.whyItHappened).toContain('detail page');
        expect(feedback.fixSteps).toEqual(expect.arrayContaining([
            expect.stringContaining('Open the affected field'),
            expect.stringContaining('Repick the element on the detail page'),
        ]));
        expect(feedback.selector).toBe('.detail-image');
        expect(feedback.details[0]).toContain('selector ".detail-image"');
    });
});
