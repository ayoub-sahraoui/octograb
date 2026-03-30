import { describe, it, expect } from 'vitest';
import { dispatchHoverSequence } from '../entrypoints/content/env-handler';
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

describe('dispatchHoverSequence', () => {
    it('should dispatch the hover event sequence modern sites commonly listen for', () => {
        const target = document.createElement('button');
        document.body.appendChild(target);

        const events: string[] = [];
        ['pointerover', 'pointerenter', 'pointermove', 'mouseover', 'mouseenter', 'mousemove'].forEach((eventName) => {
            target.addEventListener(eventName, () => events.push(eventName));
        });

        dispatchHoverSequence(target);

        if (typeof PointerEvent !== 'undefined') {
            expect(events.slice(0, 3)).toEqual(['pointerover', 'pointerenter', 'pointermove']);
        }
        expect(events).toContain('mouseover');
        expect(events).toContain('mouseenter');
        expect(events).toContain('mousemove');
        expect(document.activeElement).toBe(target);
    });
});
