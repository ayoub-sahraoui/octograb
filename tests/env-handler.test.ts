import { describe, it, expect } from 'vitest';
import { buildSwitchFrameResult } from '../entrypoints/content/switch-frame-result';

describe('env-handler switch frame downgrade', () => {
    it('should report frame existence without claiming execution context switched', () => {
        const result = buildSwitchFrameResult('sidebar-frame');

        expect(result.success).toBe(true);
        expect(result.message).toContain('frame exists');
        expect(result.message).toContain('execution context did not switch');
        expect(result.data).toEqual({
            frameFound: true,
            switched: false,
            warning: 'Frame exists, but Chrome extension execution context did not switch. Use frame-aware selectors or a future frame routing implementation.'
        });
    });
});
