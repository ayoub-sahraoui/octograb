import { describe, expect, it } from 'vitest';
import { getBlockExecutionTimeout } from '../entrypoints/models/execution-timeout';

describe('block execution timeout policy', () => {
    it('does not apply the hidden 30s default to loop pagination blocks', () => {
        expect(getBlockExecutionTimeout({
            type: 'loop_pagination',
            label: 'Loop Pagination',
            config: {},
        } as any)).toBeNull();
    });

    it('still respects explicit maxExecutionTime on loop pagination blocks', () => {
        expect(getBlockExecutionTimeout({
            type: 'loop_pagination',
            label: 'Loop Pagination',
            config: {},
            maxExecutionTime: 45000,
        } as any)).toBe(45000);
    });

    it('keeps the 30s default for normal action blocks', () => {
        expect(getBlockExecutionTimeout({
            type: 'click',
            label: 'Click',
            config: {},
        } as any)).toBe(30000);
    });
});
