import { describe, expect, it, vi } from 'vitest';
import { runWithTimeout } from '../entrypoints/models/execution-timeout';

describe('execution timeout helper', () => {
    it('calls timeout cleanup before rejecting', async () => {
        vi.useFakeTimers();
        const onTimeout = vi.fn(async () => {});

        const promise = runWithTimeout(
            () => new Promise<void>(() => { }),
            1000,
            'Loop Pagination',
            onTimeout,
        );
        const expectation = expect(promise).rejects.toThrow('Block "Loop Pagination" exceeded 1000ms timeout');

        await vi.advanceTimersByTimeAsync(1000);

        await expectation;
        expect(onTimeout).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });

    it('resolves normally before timeout', async () => {
        await expect(runWithTimeout(
            async () => 'ok',
            1000,
            'Navigate',
        )).resolves.toBe('ok');
    });
});
