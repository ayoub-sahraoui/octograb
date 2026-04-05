import { beforeEach, describe, expect, it, vi } from 'vitest';

const openTabMocks = vi.hoisted(() => {
    const listeners = new Set<(tab: any) => void>();

    return {
        listeners,
        sendToTab: vi.fn(async (_tabId: number, message: any) => {
            if (message?.type === 'ENV_CLICK' && message?.data?.openInNewTab) {
                for (const listener of listeners) {
                    listener({ id: 999 });
                }
                return { success: true, data: {} };
            }

            if (message?.type === 'PING') {
                return { success: true, data: true };
            }

            if (message?.type === 'SHOW_EXECUTION_FRAME') {
                return { success: true, data: true };
            }

            return { success: true, data: {} };
        }),
        addListener: vi.fn((listener: (tab: any) => void) => {
            listeners.add(listener);
        }),
        removeListener: vi.fn((listener: (tab: any) => void) => {
            listeners.delete(listener);
        }),
        removeTab: vi.fn(async () => {}),
        localGet: vi.fn(async () => ({})),
        localSet: vi.fn(async () => {}),
        settingsFirst: vi.fn(async () => undefined),
    };
});

vi.mock('@/core/messaging', () => ({
    sendToTab: openTabMocks.sendToTab,
    isContentScriptReady: vi.fn(async () => true),
}));

vi.mock('wxt/browser', () => ({
    browser: {
        tabs: {
            onCreated: {
                addListener: openTabMocks.addListener,
                removeListener: openTabMocks.removeListener,
            },
            remove: openTabMocks.removeTab,
            get: vi.fn(async (tabId: number) => ({ id: tabId, status: 'complete', url: 'https://example.com' })),
            update: vi.fn(async () => ({})),
            goBack: vi.fn(async () => {}),
        },
        storage: {
            local: {
                get: openTabMocks.localGet,
                set: openTabMocks.localSet,
            },
        },
    },
}));

vi.mock('@/core/database', () => ({
    db: {
        settings: {
            where: vi.fn(() => ({
                equals: vi.fn(() => ({
                    first: openTabMocks.settingsFirst,
                })),
            })),
        },
        getAllExecutions: vi.fn(async () => []),
    },
}));

vi.mock('@/core/license', () => ({
    preRunCheck: vi.fn(async () => true),
    getLicenseState: vi.fn(() => ({ valid: true })),
}));

vi.mock('@/core/dev-mode', () => ({
    isDevMode: vi.fn(() => true),
}));

vi.mock('../entrypoints/stores/notification-store', () => ({
    useNotificationStore: () => ({
        notify: vi.fn(),
        addNotification: vi.fn(),
    }),
}));

vi.mock('../entrypoints/stores/macro-registry-store', () => ({
    macroRegistryStore: {
        getMacroById: vi.fn(),
    },
}));

vi.mock('../entrypoints/content/execution-frame-session', () => ({
    clearExecutionFrameSessionState: vi.fn(async () => {}),
    setExecutionFrameSessionState: vi.fn(async () => {}),
}));

vi.mock('uuid', () => ({
    v4: () => 'test-uuid',
}));

vi.mock('xlsx', () => ({}));

describe('blueprint executor openInNewTab', () => {
    beforeEach(() => {
        openTabMocks.listeners.clear();
        openTabMocks.sendToTab.mockClear();
        openTabMocks.addListener.mockClear();
        openTabMocks.removeListener.mockClear();
        openTabMocks.removeTab.mockClear();
        openTabMocks.localGet.mockClear();
        openTabMocks.localSet.mockClear();
        openTabMocks.settingsFirst.mockClear();
    });

    it('executes new-tab child blocks without carrying over the stale loop scope', async () => {
        const { BlueprintExecutorStore } = await import('../entrypoints/stores/blueprint-executor-store');
        const store = new BlueprintExecutorStore() as any;

        store.status = 'running';
        store._targetTabId = 123;
        store._abortController = new AbortController();
        store.delay = vi.fn(async () => {});
        store.log = vi.fn();

        const childExecute = vi.fn(async () => {});
        store.executeBlock = childExecute;

        const oldScope = {
            selector: '.product_pod',
            selectorType: 'css',
            index: 0,
        };

        await store.executeClick({
            id: 'click-1',
            type: 'click',
            label: 'Open detail page',
            config: {
                selector: { type: 'css', value: 'h3 > a' },
                openInNewTab: true,
            },
            children: [
                {
                    id: 'extract-1',
                    type: 'extract_scope',
                    label: 'Extract detail data',
                    config: { fields: [] },
                },
            ],
        }, oldScope);

        expect(childExecute).toHaveBeenCalledTimes(1);
        expect(childExecute).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'extract_scope' }),
            undefined,
        );
    }, 15000);
});
