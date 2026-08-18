import { describe, expect, it } from 'vitest';
import { getSelectorFeedbackSummary } from '../entrypoints/sidepanel/components/selector-feedback';

describe('selector feedback summary', () => {
    it('returns a success summary for valid selectors', () => {
        expect(getSelectorFeedbackSummary({
            validationState: 'valid',
            selectorRole: 'click-target',
        })).toEqual({
            title: 'Looks good',
            tone: 'success',
            nextStep: 'You can keep this selector.',
        });
    });

    it('returns a focused warning summary for multi-match single selectors', () => {
        expect(getSelectorFeedbackSummary({
            validationState: 'warning',
            selectorRole: 'click-target',
            matchCount: 4,
        })).toEqual({
            title: 'Needs one exact match',
            tone: 'warning',
            nextStep: 'Pick the exact item you want or refine the selector.',
        });
    });

    it('returns a safer-selector message for specificity warnings', () => {
        expect(getSelectorFeedbackSummary({
            validationState: 'warning',
            hasSpecificityWarning: true,
        })).toEqual({
            title: 'Needs a safer selector',
            tone: 'warning',
            nextStep: 'Refine the selector manually or pick a more general element.',
        });
    });

    it('returns pagination-friendly guidance for next-page selectors', () => {
        expect(getSelectorFeedbackSummary({
            validationState: 'warning',
            selectorRole: 'pagination-next',
            matchCount: 2,
        })).toEqual({
            title: 'Needs one exact match',
            tone: 'warning',
            nextStep: 'Pick one next-page control or refine the selector.',
        });
    });
});
