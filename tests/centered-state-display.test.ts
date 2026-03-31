import { describe, expect, it } from 'vitest';
import { getCenteredStateToneClasses } from '../entrypoints/sidepanel/components/centered-state-display';

describe('centered state display', () => {
    it('returns emerald empty-state styling by default', () => {
        expect(getCenteredStateToneClasses()).toEqual({
            iconRing: 'border-emerald-200 bg-white text-slate-500',
            title: 'text-slate-900',
            description: 'text-slate-600',
        });
    });

    it('returns red styling for error states', () => {
        expect(getCenteredStateToneClasses('error').iconRing).toContain('border-red-200');
    });

    it('returns amber styling for warning states', () => {
        expect(getCenteredStateToneClasses('warning').iconRing).toContain('border-amber-200');
    });
});
