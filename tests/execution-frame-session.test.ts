import { beforeEach, describe, expect, it, vi } from 'vitest';

const { storageGet, storageSet, storageRemove } = vi.hoisted(() => ({
    storageGet: vi.fn(),
    storageSet: vi.fn(),
    storageRemove: vi.fn(),
}));

vi.mock('wxt/browser', () => ({
    browser: {
        storage: {
            session: {
                get: storageGet,
                set: storageSet,
                remove: storageRemove,
            },
        },
    },
}));

import {
    clearExecutionFrameSessionState,
    getExecutionFrameSessionState,
    isExecutionFrameActiveForTab,
    setExecutionFrameSessionState,
} from '../entrypoints/content/execution-frame-session';

describe('execution frame session state', () => {
    beforeEach(() => {
        storageGet.mockReset();
        storageSet.mockReset();
        storageRemove.mockReset();
    });

    it('stores the active tab id in session state', async () => {
        await setExecutionFrameSessionState(42);

        expect(storageSet).toHaveBeenCalledWith({
            octograbExecutionFrame: { activeTabId: 42 },
        });
    });

    it('reads active state for the matching tab id', async () => {
        storageGet.mockResolvedValue({
            octograbExecutionFrame: { activeTabId: 42 },
        });

        await expect(isExecutionFrameActiveForTab(42)).resolves.toBe(true);
        await expect(isExecutionFrameActiveForTab(7)).resolves.toBe(false);
    });

    it('clears the stored state', async () => {
        await clearExecutionFrameSessionState();

        expect(storageRemove).toHaveBeenCalledWith('octograbExecutionFrame');
    });

    it('returns null state when nothing is stored', async () => {
        storageGet.mockResolvedValue({});

        await expect(getExecutionFrameSessionState()).resolves.toBeNull();
    });
});
