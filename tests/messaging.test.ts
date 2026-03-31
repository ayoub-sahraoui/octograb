import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMessage } = vi.hoisted(() => ({
    sendMessage: vi.fn(),
}));

vi.mock('wxt/browser', () => ({
    browser: {
        tabs: {
            sendMessage,
        },
    },
}));

import { sendToTab } from '../core/messaging';

describe('sendToTab', () => {
    beforeEach(() => {
        sendMessage.mockReset();
    });

    it('stops retrying when aborted', async () => {
        sendMessage.mockRejectedValue(new Error('Could not establish connection. Receiving end does not exist.'));

        const controller = new AbortController();
        const promise = sendToTab(123, { type: 'PING' } as any, {
            maxRetries: 8,
            retryDelay: 1000,
            signal: controller.signal,
            suppressConnectionLogs: true,
        });

        controller.abort();

        await expect(promise).resolves.toEqual({
            success: false,
            error: 'Aborted',
        });
        expect(sendMessage).toHaveBeenCalledTimes(1);
    });
});
